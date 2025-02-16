import { PriceHistory, ProductChange } from '../types/common';
import { Client, types, policies, QueryOptions } from 'cassandra-driver';
import config from '../config/config';
import { createClient } from 'redis';

// Tipos personalizados para mejorar el tipado
type CassandraError = Error & { code?: number; info?: string };
type PriceAnalytics = { changes: number; volatility: number };

const cassandraClient = new Client({
  contactPoints: config.cassandra.contactPoints,
  localDataCenter: config.cassandra.localDataCenter,
  keyspace: config.cassandra.keyspace,
  credentials: {
    username: config.cassandra.username,
    password: config.cassandra.password
  },
  socketOptions: {
    connectTimeout: 60000,
    readTimeout: 60000
  },
  protocolOptions: {
    port: 9042
  },
  pooling: {
    maxRequestsPerConnection: 32768,
    coreConnectionsPerHost: {
      [types.distance.local]: 2,
      [types.distance.remote]: 1
    }
  },
  policies: {
    retry: new policies.retry.RetryPolicy()
  }
});

// Redis client para caching
const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port
  }
});

export class CassandraService {
  private static readonly client: Client = cassandraClient;
  private static isInitialized = false;
  private static readonly MAX_RETRIES = 30;
  private static readonly RETRY_DELAY = 5000;
  private static readonly CACHE_TTL = 3600; // 1 hora en segundos

  /**
   * Inicializa el esquema de Cassandra y establece la conexión
   * @throws Error si la inicialización falla después de los reintentos máximos
   */
  static async initializeSchema(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.connectWithRetry();
      await this.createTablesIfNotExist();
      await redisClient.connect();
      
      this.isInitialized = true;
      console.log('Cassandra y Redis inicializados correctamente');
    } catch (error) {
      console.error('Error fatal durante la inicialización:', error);
      throw new Error('Fallo en la inicialización del servicio');
    }
  }

  /**
   * Conecta a Cassandra con reintentos
   * @private
   */
  private static async connectWithRetry(): Promise<void> {
    let retries = 0;
    while (retries < this.MAX_RETRIES) {
      try {
        await this.client.connect();
        await this.waitForKeyspace();
        return;
      } catch (error) {
        retries++;
        console.warn(`Intento ${retries}/${this.MAX_RETRIES} fallido:`, error);
        if (retries === this.MAX_RETRIES) throw error;
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
      }
    }
  }

  /**
   * Ejecuta una consulta con reintentos y caching
   * @private
   */
  private static async executeWithRetry<T>(
    query: string,
    params: any[],
    options: QueryOptions & { cache?: boolean; cacheKey?: string } = {}
  ): Promise<T> {
    const { cache, cacheKey, ...queryOptions } = options;

    if (cache && cacheKey) {
      const cachedResult = await redisClient.get(cacheKey);
      if (cachedResult) return JSON.parse(cachedResult);
    }

    let retries = 0;
    while (retries < this.MAX_RETRIES) {
      try {
        const result = await this.client.execute(query, params, { prepare: true, ...queryOptions });
        
        if (cache && cacheKey) {
          await redisClient.set(cacheKey, JSON.stringify(result.rows), { EX: this.CACHE_TTL });
        }
        
        return result.rows as T;
      } catch (error) {
        retries++;
        if (retries === this.MAX_RETRIES) throw error;
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
      }
    }
    throw new Error('Max retries reached');
  }

  /**
   * Registra un cambio de precio con validación
   */
  static async recordPriceChange(priceHistory: PriceHistory): Promise<void> {
    await this.ensureInitialized();
    
    if (priceHistory.price < 0) {
      throw new Error('El precio no puede ser negativo');
    }

    const query = `
      INSERT INTO ${this.client.keyspace}.price_history
      (product_id, timestamp, price, currency)
      VALUES (?, ?, ?, ?)
    `;

    const params = [
      priceHistory.productId,
      priceHistory.timestamp,
      types.BigDecimal.fromNumber(priceHistory.price),
      priceHistory.currency || 'USD'
    ];

    try {
      await this.executeWithRetry(query, params);
      await this.invalidateCache(`price_history:${priceHistory.productId}`);
    } catch (error) {
      const cassandraError = error as CassandraError;
      console.error('Error al registrar cambio de precio:', {
        code: cassandraError.code,
        info: cassandraError.info,
        message: cassandraError.message
      });
      throw new Error(`Error al registrar cambio de precio: ${cassandraError.message}`);
    }
  }

  /**
   * Obtiene el historial de precios con caching
   */
  static async getPriceHistory(
    productId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PriceHistory[]> {
    await this.ensureInitialized();

    const cacheKey = `price_history:${productId}:${startDate?.getTime()}:${endDate?.getTime()}`;
    
    let query = `
      SELECT product_id, timestamp, price, currency
      FROM ${this.client.keyspace}.price_history
      WHERE product_id = ?
    `;
    const params: any[] = [productId];

    if (startDate && endDate) {
      query += ' AND timestamp >= ? AND timestamp <= ?';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY timestamp DESC';

    try {
      const rows = await this.executeWithRetry<any[]>(query, params, {
        cache: true,
        cacheKey
      });

      return rows.map(row => ({
        productId: row.product_id,
        timestamp: row.timestamp,
        price: row.price.toNumber(),
        currency: row.currency || 'USD'
      }));
    } catch (error: any) {
      const errorMessage = error?.message || 'Error desconocido';
      console.error('Error al obtener historial de precios:', errorMessage);
      throw new Error(`Error al obtener historial de precios: ${errorMessage}`);
    }
  }

  /**
   * Calcula la volatilidad de precios con optimizaciones
   */
  static async getPriceVolatility(
    productId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PriceAnalytics> {
    await this.ensureInitialized();

    const cacheKey = `volatility:${productId}:${startDate.getTime()}:${endDate.getTime()}`;
    
    try {
      const prices = await this.getPriceHistory(productId, startDate, endDate);
      
      if (prices.length < 2) {
        return { changes: 0, volatility: 0 };
      }

      // Optimización: Usar reduce para mejor rendimiento
      const { changes: totalChanges, volatility: totalVol } = prices.reduce(
        (acc, price, index) => {
          if (index === 0) return acc;
          
          const priceDiff = Math.abs(price.price - prices[index - 1].price);
          if (priceDiff > 0) {
            acc.changes++;
            acc.volatility += (priceDiff / prices[index - 1].price) * 100;
          }
          return acc;
        },
        { changes: 0, volatility: 0 }
      );

      const result = {
        changes: totalChanges,
        volatility: totalChanges > 0 ? totalVol / totalChanges : 0
      };

      // Cachear el resultado
      await redisClient.set(cacheKey, JSON.stringify(result), { EX: this.CACHE_TTL });
      
      return result;
    } catch (error: any) {
      const errorMessage = error?.message || 'Error desconocido';
      console.error('Error al calcular la volatilidad:', errorMessage);
      throw new Error(`Error al calcular la volatilidad: ${errorMessage}`);
    }
  }

  /**
   * Invalida el caché para una clave específica
   * @private
   */
  private static async invalidateCache(pattern: string): Promise<void> {
    const keys = await redisClient.keys(pattern + '*');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  }

  /**
   * Limpia los recursos al cerrar la aplicación
   */
  static async cleanup(): Promise<void> {
    try {
      await this.client.shutdown();
      await redisClient.quit();
      console.log('Recursos de Cassandra y Redis liberados correctamente');
    } catch (error) {
      console.error('Error al liberar recursos:', error);
    }
  }

  private static async createTablesIfNotExist(): Promise<void> {
    // Create price_history table if it doesn't exist
    const createPriceHistoryTable = `
      CREATE TABLE IF NOT EXISTS ${this.client.keyspace}.price_history (
        product_id text,
        timestamp timestamp,
        price decimal,
        currency text,
        PRIMARY KEY (product_id, timestamp)
      ) WITH CLUSTERING ORDER BY (timestamp DESC);
    `;

    // Create product_changes table if it doesn't exist
    const createProductChangesTable = `
      CREATE TABLE IF NOT EXISTS ${this.client.keyspace}.product_changes (
        product_id text,
        timestamp timestamp,
        change_type text,
        old_value text,
        new_value text,
        PRIMARY KEY (product_id, timestamp)
      ) WITH CLUSTERING ORDER BY (timestamp DESC);
    `;

    await this.client.execute(createPriceHistoryTable);
    await this.client.execute(createProductChangesTable);
    console.log('Tables created or already exist');
  }

  private static async waitForKeyspace(): Promise<void> {
    let retries = 0;
    while (retries < this.MAX_RETRIES) {
      try {
        // Try to select from system keyspaces to check if the keyspace exists
        const result = await this.client.execute(
          "SELECT keyspace_name FROM system_schema.keyspaces WHERE keyspace_name = ?",
          ['ecommerce'],
          { prepare: true }
        );
        
        if (result.rows.length > 0) {
          console.log('Cassandra keyspace is ready');
          return;
        }
        
        throw new Error('Keyspace not found');
      } catch (error) {
        retries++;
        console.log('Waiting for Cassandra keyspace to be ready...');
        if (retries === this.MAX_RETRIES) {
          throw new Error('Cassandra keyspace is not available');
        }
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
      }
    }
  }

  private static async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeSchema();
    }
  }

  static async getAveragePriceByPeriod(productId: string, startDate: Date, endDate: Date): Promise<number> {
    await this.ensureInitialized();
    const query = `
      SELECT AVG(price) as avg_price
      FROM ${this.client.keyspace}.price_history
      WHERE product_id = ?
      AND timestamp >= ?
      AND timestamp <= ?
    `;

    try {
      const result = await this.client.execute(query, [productId, startDate, endDate], { prepare: true });
      return result.rows[0].avg_price?.toNumber() || 0;
    } catch (error) {
      console.error('Error getting average price by period:', error);
      throw error;
    }
  }

  // Product Changes Management
  static async recordProductChange(productId: string, oldValue: string | null, newValue: string | null, changeType: string): Promise<void> {
    await this.ensureInitialized();
    const query = `
      INSERT INTO ${this.client.keyspace}.product_changes
      (product_id, timestamp, change_type, old_value, new_value)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      productId,
      new Date(),
      changeType,
      oldValue ?? '',  // Convert null to empty string
      newValue ?? ''   // Convert null to empty string
    ];

    try {
      await this.client.execute(query, params, { prepare: true });
    } catch (error) {
      console.error('Error recording product change:', error);
      throw error;
    }
  }

  static async getProductChanges(productId: string): Promise<ProductChange[]> {
    await this.ensureInitialized();
    const query = `
      SELECT product_id, timestamp, change_type, old_value, new_value
      FROM ${this.client.keyspace}.product_changes
      WHERE product_id = ?
    `;

    try {
      const result = await this.client.execute(query, [productId], { prepare: true });
      return result.rows.map(row => ({
        productId: row.product_id,
        timestamp: row.timestamp,
        changeType: row.change_type,
        oldValue: row.old_value,
        newValue: row.new_value
      }));
    } catch (error) {
      console.error('Error getting product changes:', error);
      throw error;
    }
  }

  // Price Analysis
  static async getAveragePrice(productId: string): Promise<number> {
    await this.ensureInitialized();
    const query = `
      SELECT AVG(price) as avg_price
      FROM ${this.client.keyspace}.price_history
      WHERE product_id = ?
    `;

    try {
      const result = await this.client.execute(query, [productId], { prepare: true });
      return result.rows[0].avg_price?.toNumber() || 0;
    } catch (error) {
      console.error('Error getting average price:', error);
      throw error;
    }
  }
} 