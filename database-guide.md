# Guía de Consulta de Bases de Datos

Esta guía explica cómo acceder y consultar los datos en cada una de las bases de datos del sistema.

## MongoDB

### Acceso
```bash
# Usando Docker
docker-compose exec mongodb mongosh ecommerce

# Instalación local
mongosh ecommerce
```

### Consultas Útiles

1. **Ver usuarios**:
```javascript
db.users.find()
db.users.find({ role: "admin" })
db.users.find({ category: "TOP" })
```

2. **Ver productos**:
```javascript
db.products.find()
db.products.find({ category: "smartphones" })
db.products.find({ price: { $lt: 1000 } })
```

3. **Ver pedidos**:
```javascript
db.orders.find()
db.orders.find({ status: "pending" })
db.orders.aggregate([
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 },
      totalRevenue: { $sum: "$total" }
    }
  }
])
```

## Redis

### Acceso
```bash
# Usando Docker
docker-compose exec redis redis-cli

# Instalación local
redis-cli
```

### Comandos Útiles

1. **Ver todas las claves**:
```bash
KEYS *
```

2. **Ver carritos**:
```bash
# Listar carritos
KEYS cart:*

# Ver contenido de un carrito específico
GET cart:userId

# Ver historial de un carrito
LRANGE cart_history:userId 0 -1
```

3. **Ver sesiones**:
```bash
# Listar sesiones
KEYS session:*

# Ver una sesión específica
GET session:userId
```

4. **Monitorear operaciones en tiempo real**:
```bash
MONITOR
```

## Neo4j

### Acceso Web
- URL: http://localhost:7474
- Usuario por defecto: neo4j
- Contraseña por defecto: password

### Acceso CLI
```bash
# Usando Docker
docker-compose exec neo4j cypher-shell -u neo4j -p password

# Instalación local
cypher-shell -u neo4j -p password
```

### Consultas Cypher Útiles

1. **Ver todos los nodos**:
```cypher
MATCH (n) RETURN n;
```

2. **Ver usuarios y sus categorías**:
```cypher
MATCH (u:User) 
RETURN u.email, u.category;
```

3. **Ver productos más interactuados**:
```cypher
MATCH (p:Product)<-[r:INTERACTED]-() 
RETURN p.productId, COUNT(r) as interactions 
ORDER BY interactions DESC;
```

4. **Ver pedidos y relaciones**:
```cypher
MATCH (u:User)-[r:PLACED_ORDER]->(o:Order)
RETURN u.email, o.orderId, o.total, o.timestamp;
```

5. **Encontrar usuarios similares**:
```cypher
MATCH (u1:User {userId: "userId"})-[r1:INTERACTED]->(p:Product)
MATCH (p)<-[r2:INTERACTED]-(u2:User)
WHERE u1 <> u2
WITH u2, COUNT(DISTINCT p) as commonInteractions
ORDER BY commonInteractions DESC
LIMIT 5
RETURN u2.email, commonInteractions;
```

## Cassandra

### Acceso
```bash
# Usando Docker
docker-compose exec cassandra cqlsh -u cassandra -p cassandra

# Instalación local
cqlsh -u cassandra -p cassandra
```

### Consultas CQL Útiles

1. **Ver keyspaces**:
```sql
DESCRIBE KEYSPACES;
```

2. **Usar keyspace**:
```sql
USE ecommerce;
```

3. **Ver historial de precios**:
```sql
SELECT * FROM price_history 
WHERE product_id = 'id_producto' 
ORDER BY timestamp DESC;
```

4. **Ver cambios en productos**:
```sql
SELECT * FROM product_changes 
WHERE product_id = 'id_producto' 
ORDER BY timestamp DESC;
```

5. **Análisis de precios**:
```sql
# Precio promedio
SELECT AVG(price) FROM price_history 
WHERE product_id = 'id_producto';

# Volatilidad de precios
SELECT COUNT(*) as changes,
       MAX(price) - MIN(price) as price_range
FROM price_history 
WHERE product_id = 'id_producto'
AND timestamp >= 'start_date'
AND timestamp <= 'end_date';
```

## Ejemplos de Uso Común

### 1. Seguimiento de un Pedido
1. Ver el pedido en MongoDB:
```javascript
db.orders.findOne({ _id: ObjectId("id_pedido") })
```

2. Ver el carrito asociado en Redis:
```bash
GET cart:userId
```

3. Ver la relación en Neo4j:
```cypher
MATCH (u:User)-[r:PLACED_ORDER]->(o:Order {orderId: 'id_pedido'})
RETURN u, r, o;
```

### 2. Análisis de Producto
1. Ver detalles del producto en MongoDB:
```javascript
db.products.findOne({ _id: ObjectId("id_producto") })
```

2. Ver historial de precios en Cassandra:
```sql
SELECT * FROM price_history 
WHERE product_id = 'id_producto' 
ORDER BY timestamp DESC;
```

3. Ver interacciones en Neo4j:
```cypher
MATCH (p:Product {productId: 'id_producto'})<-[r:INTERACTED]-(u:User)
RETURN u.email, r.action, r.timestamp;
```

### 3. Análisis de Ventas
1. Ver estadísticas de pedidos en MongoDB:
```javascript
db.orders.aggregate([
  {
    $match: {
      createdAt: {
        $gte: ISODate("start_date"),
        $lte: ISODate("end_date")
      }
    }
  },
  {
    $group: {
      _id: null,
      totalOrders: { $sum: 1 },
      totalRevenue: { $sum: "$total" },
      averageOrderValue: { $avg: "$total" }
    }
  }
])
```

2. Ver usuarios top en Neo4j:
```cypher
MATCH (u:User)
WHERE u.category = 'TOP'
RETURN u.email, u.category;
```

3. Ver tendencias de precios en Cassandra:
```sql
SELECT product_id, 
       COUNT(*) as price_changes,
       MAX(price) as max_price,
       MIN(price) as min_price
FROM price_history
WHERE timestamp >= 'start_date'
AND timestamp <= 'end_date'
GROUP BY product_id;
```