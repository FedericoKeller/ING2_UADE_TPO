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
db.users.find({ email: "admin@demo.com" })
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
RETURN u.userId, u.email, u.category, u.createdAt;
```

3. **Ver interacciones usuario-producto**:
```cypher
MATCH (u:User)-[r:INTERACTED]->(p:Product)
RETURN u.email, r.action, r.timestamp, p.productId;
```

4. **Ver pedidos**:
```cypher
MATCH (u:User)-[r:PLACED_ORDER]->(o:Order)
RETURN u.email, o.orderId, o.total, o.timestamp;
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
SELECT * FROM price_history WHERE product_id = 'id_producto';
```

4. **Ver cambios en productos**:
```sql
SELECT * FROM product_changes WHERE product_id = 'id_producto';
```

5. **Ver precio promedio**:
```sql
SELECT AVG(price) FROM price_history WHERE product_id = 'id_producto';
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