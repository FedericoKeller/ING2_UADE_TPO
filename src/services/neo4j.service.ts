import { neo4jDriver } from '../config/database';
import { Session } from 'neo4j-driver';

export class Neo4jService {
  private static async getSession(): Promise<Session> {
    return neo4jDriver.session();
  }

  // User Node Management
  static async createUserNode(userId: string, data: any): Promise<void> {
    const session = await this.getSession();
    try {
      await session.run(
        `CREATE (u:User {
          userId: $userId,
          email: $email,
          firstName: $firstName,
          lastName: $lastName,
          category: $category,
          createdAt: datetime()
        })`,
        {
          userId,
          ...data,
          category: 'LOW'
        }
      );
    } finally {
      await session.close();
    }
  }

  // User Interaction Management
  static async recordUserInteraction(userId: string, productId: string, action: string, productName?: string): Promise<void> {
    const session = await this.getSession();
    try {
      console.log('Recording interaction:', {
        userId,
        productId,
        action,
        productName
      });

      await session.run(
        `MATCH (u:User {userId: $userId})
         MERGE (p:Product {productId: $productId})
         ON CREATE SET p.name = $productName
         CREATE (u)-[r:INTERACTED {
           action: $action,
           timestamp: datetime()
         }]->(p)`,
        { userId, productId, action, productName }
      );

      // Actualizar categoría después de la interacción
      await this.updateUserCategory(userId);
    } finally {
      await session.close();
    }
  }

  /**
   * Updates and returns the user's category based on their interactions and orders.
   * Categories are determined by the following criteria:
   * - TOP: ≥ 10 orders OR ≥ 50 interactions
   * - MEDIUM: ≥ 5 orders OR ≥ 25 interactions
   * - LOW: Default category for new or less active users
   * 
   * @param userId - The unique identifier of the user
   * @returns Promise<'TOP' | 'MEDIUM' | 'LOW'> - The updated user category
   * @throws Error if the database operation fails
   */
  static async updateUserCategory(userId: string): Promise<'TOP' | 'MEDIUM' | 'LOW'> {
    const session = await this.getSession();
    try {
      // Primero, verifiquemos el conteo actual para debug
      const debugResult = await session.run(`
        MATCH (u:User {userId: $userId})
        OPTIONAL MATCH (u)-[r:INTERACTED]->(p:Product)
        RETURN count(r) as interactionCount
      `, { userId });
      
      const interactionCount = debugResult.records[0]?.get('interactionCount')?.toNumber() || 0;
      console.log(`Debug - User ${userId} has ${interactionCount} interactions`);

      const result = await session.run(`
        MERGE (u:User {userId: $userId})
        ON CREATE SET 
          u.category = 'LOW',
          u.createdAt = datetime()
        WITH u
        OPTIONAL MATCH (u)-[r]->(p:Product)
        WHERE type(r) IN ['INTERACTED', 'ADD_TO_CART', 'REMOVE_FROM_CART', 'VIEW', 'LIKE']
        WITH u, count(r) as interactions
        OPTIONAL MATCH (u)-[o:PLACED_ORDER]->(:Order)
        WITH u, interactions, count(o) as orders
        WITH u, interactions, orders,
        CASE
          WHEN orders >= 10 OR interactions >= 50 THEN 'TOP'
          WHEN orders >= 5 OR interactions >= 25 THEN 'MEDIUM'
          ELSE 'LOW'
        END as newCategory
        SET u.category = newCategory,
            u.lastUpdated = datetime(),
            u.totalInteractions = interactions,
            u.totalOrders = orders
        RETURN newCategory as category, interactions, orders
      `, { userId });

      const record = result.records[0];
      const category = record?.get('category') as 'TOP' | 'MEDIUM' | 'LOW';
      const totalInteractions = record?.get('interactions')?.toNumber() || 0;
      const totalOrders = record?.get('orders')?.toNumber() || 0;

      // Log detallado para monitoreo
      console.log(`User ${userId} category update:`, {
        newCategory: category,
        totalInteractions,
        totalOrders,
        thresholds: {
          top: 'orders >= 10 OR interactions >= 50',
          medium: 'orders >= 5 OR interactions >= 25'
        }
      });

      return category;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      console.error(`Error updating category for user ${userId}:`, errorMessage);
      throw new Error(`Failed to update user category: ${errorMessage}`);
    } finally {
      await session.close();
    }
  }

  // Product Recommendations
  static async getProductRecommendations(userId: string, limit: number = 5): Promise<{ id: string, name: string }[]> {
    const session = await this.getSession();
    try {
      // Debug current user's interactions
      const debugResult = await session.run(
        `MATCH (u:User {userId: $userId})-[r]->(p:Product)
         RETURN count(r) as interactionCount, collect(p.productId) as products`,
        { userId }
      );
      
      const interactionCount = debugResult.records[0]?.get('interactionCount')?.toNumber() || 0;
      const userProducts = debugResult.records[0]?.get('products') || [];
      console.log(`Debug - User ${userId}:`, {
        interactionCount,
        currentProducts: userProducts
      });

      const result = await session.run(
        `// Encontrar usuarios que han interactuado con productos similares
         MATCH (currentUser:User {userId: $userId})-[r1]->(p:Product)
         WITH currentUser, collect(DISTINCT p.productId) as userProducts
         
         // Encontrar otros usuarios que han interactuado con productos similares
         MATCH (currentUser)-[:INTERACTED]->(p:Product)<-[:INTERACTED]-(otherUser:User)
         WHERE otherUser.userId <> currentUser.userId
         WITH currentUser, userProducts, otherUser, 
              count(DISTINCT p) as commonProducts
         WHERE commonProducts > 0
         
         // Encontrar productos recomendados de usuarios similares
         MATCH (otherUser)-[r:INTERACTED]->(recommendedProduct:Product)
         WHERE NOT recommendedProduct.productId IN userProducts
         
         // Calcular score basado en frecuencia y relevancia
         WITH recommendedProduct,
              count(DISTINCT otherUser) as commonUsers,
              collect(DISTINCT otherUser.userId) as userList,
              collect(DISTINCT r.action) as actions,
              count(r) as interactionFrequency,
              sum(CASE WHEN r.action = 'ADD_TO_CART' THEN 2
                      WHEN r.action = 'VIEW' THEN 1
                      ELSE 0.5 END) as actionScore
         
         // Calcular score final
         WITH recommendedProduct,
              commonUsers,
              userList,
              actions,
              (commonUsers * 10 + interactionFrequency + actionScore) as recommendationScore
         WHERE recommendationScore > 0
         ORDER BY recommendationScore DESC
         LIMIT toInteger($limit)
         
         RETURN recommendedProduct.productId as productId,
                recommendedProduct.name as productName,
                commonUsers,
                userList,
                actions,
                recommendationScore`,
        { 
          userId,
          limit: Math.floor(limit)
        }
      );

      // Log recommendations for debugging
      result.records.forEach(record => {
        try {
          const commonUsers = record.get('commonUsers');
          const score = record.get('recommendationScore');
          
          console.log('Recommendation:', {
            productId: record.get('productId'),
            productName: record.get('productName'),
            commonUsers: typeof commonUsers.toNumber === 'function' ? commonUsers.toNumber() : Number(commonUsers),
            recommendedBy: record.get('userList'),
            actions: record.get('actions'),
            score: typeof score.toNumber === 'function' ? score.toNumber() : Number(score)
          });
        } catch (error) {
          console.error('Error logging recommendation:', error);
        }
      });

      return result.records.map(record => ({
        id: record.get('productId'),
        name: record.get('productName')
      }));
    } finally {
      await session.close();
    }
  }

    // User Similarity Network
    static async findSimilarUsers(userId: string, limit: number = 5): Promise<{ id: string, email: string, firstName: string, lastName: string, commonInteractions: number }[]> {
      const session = await this.getSession();
      try {
        const result = await session.run(
          `MATCH (u1:User {userId: $userId})-[r1:INTERACTED]->(p:Product)
           MATCH (p)<-[r2:INTERACTED]-(u2:User)
           WHERE u1 <> u2
           WITH u2, count(DISTINCT p) as commonInteractions,
                collect(DISTINCT p.name) as commonProducts
           ORDER BY commonInteractions DESC
           LIMIT toInteger($limit)
           RETURN u2.userId as userId,
                  u2.email as email,
                  u2.firstName as firstName,
                  u2.lastName as lastName,
                  commonInteractions,
                  commonProducts`,
           { userId, limit: Math.floor(limit) }
        );
  
        // Log para debugging
        result.records.forEach(record => {
          try {
            const commonInteractions = record.get('commonInteractions');
            
            console.log('Similar User:', {
              userId: record.get('userId'),
              email: record.get('email'),
              name: `${record.get('firstName')} ${record.get('lastName')}`,
              commonInteractions: typeof commonInteractions.toNumber === 'function' ? 
                commonInteractions.toNumber() : Number(commonInteractions),
              commonProducts: record.get('commonProducts')
            });
          } catch (error) {
            console.error('Error logging similar user:', error);
          }
        });

        return result.records.map(record => {
          const commonInteractions = record.get('commonInteractions');
          return {
            id: record.get('userId'),
            email: record.get('email'),
            firstName: record.get('firstName'),
            lastName: record.get('lastName'),
            commonInteractions: typeof commonInteractions.toNumber === 'function' ? 
              commonInteractions.toNumber() : Number(commonInteractions)
          };
        });
      } finally {
        await session.close();
      }
    }

  // Order Tracking
  static async recordOrder(userId: string, orderId: string, total: number): Promise<void> {
    const session = await this.getSession();
    try {
      await session.run(
        `MATCH (u:User {userId: $userId})
         CREATE (o:Order {
           orderId: $orderId,
           total: $total,
           timestamp: datetime()
         })
         CREATE (u)-[r:PLACED_ORDER]->(o)`,
        { userId, orderId, total }
      );
    } finally {
      await session.close();
    }
  }

  // Invoice Management
  static async recordInvoiceCreation(userId: string, invoiceId: string, amount: number): Promise<void> {
    const session = await this.getSession();
    try {
      await session.run(
        `MATCH (u:User {userId: $userId})
         CREATE (i:Invoice {
           invoiceId: $invoiceId,
           amount: $amount,
           timestamp: datetime()
         })
         CREATE (u)-[r:GENERATED]->(i)`,
        { userId, invoiceId, amount }
      );
    } finally {
      await session.close();
    }
  }

  static async getInvoiceRelationships(userId: string): Promise<any[]> {
    const session = await this.getSession();
    try {
      const result = await session.run(
        `MATCH (u:User {userId: $userId})-[r:GENERATED]->(i:Invoice)
         RETURN i.invoiceId as invoiceId,
                i.amount as amount,
                i.timestamp as timestamp
         ORDER BY i.timestamp DESC`,
        { userId }
      );

      return result.records.map(record => ({
        invoiceId: record.get('invoiceId'),
        amount: record.get('amount').toNumber(),
        timestamp: record.get('timestamp').toString()
      }));
    } finally {
      await session.close();
    }
  }

  static async getInvoiceAnalytics(userId: string): Promise<any> {
    const session = await this.getSession();
    try {
      const result = await session.run(
        `MATCH (u:User {userId: $userId})-[r:GENERATED]->(i:Invoice)
         WITH u,
              count(i) as totalInvoices,
              sum(i.amount) as totalAmount,
              collect(i.amount) as amounts
         RETURN totalInvoices,
                totalAmount,
                reduce(s = 0, x IN amounts | s + x) / size(amounts) as averageAmount`,
        { userId }
      );

      const record = result.records[0];
      return {
        totalInvoices: record.get('totalInvoices').toNumber(),
        totalAmount: record.get('totalAmount').toNumber(),
        averageAmount: record.get('averageAmount').toNumber()
      };
    } finally {
      await session.close();
    }
  }
} 