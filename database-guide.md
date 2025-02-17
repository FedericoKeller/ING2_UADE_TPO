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

## Modelado Físico

### MongoDB (Documentos)

#### Colección: users
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  password: String (hashed),
  firstName: String,
  lastName: String,
  role: String (enum: ['user', 'admin']),
  category: String (enum: ['TOP', 'MEDIUM', 'LOW']),
  createdAt: Date (indexed),
  updatedAt: Date
}
Índices:
- email_1: {email: 1} (unique)
- createdAt_-1: {createdAt: -1}
```

#### Colección: products
```javascript
{
  _id: ObjectId,
  name: String (indexed),
  description: String,
  sku: String (unique, indexed),
  category: String (indexed),
  price: Number,
  stock: Number,
  images: Array<String>,
  specifications: Object,
  createdAt: Date (indexed),
  updatedAt: Date
}
Índices:
- sku_1: {sku: 1} (unique)
- category_1: {category: 1}
- name_text_description_text: {name: 'text', description: 'text'}
- createdAt_-1: {createdAt: -1}
```

#### Colección: orders
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: 'User', indexed),
  items: [{
    product: ObjectId (ref: 'Product'),
    quantity: Number,
    price: Number
  }],
  total: Number,
  status: String (enum, indexed),
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  paymentInfo: {
    method: String (enum),
    transactionId: String (indexed),
    status: String (enum, indexed)
  },
  createdAt: Date (indexed),
  updatedAt: Date
}
Índices:
- user_1_createdAt_-1: {user: 1, createdAt: -1}
- status_1: {status: 1}
- paymentInfo.status_1: {'paymentInfo.status': 1}
```

#### Colección: invoices
```javascript
{
  _id: ObjectId,
  order: ObjectId (ref: 'Order', indexed),
  user: ObjectId (ref: 'User', indexed),
  invoiceNumber: String (unique, indexed),
  items: [{
    product: ObjectId (ref: 'Product'),
    quantity: Number,
    price: Number,
    subtotal: Number
  }],
  subtotal: Number,
  tax: Number,
  total: Number,
  status: String (enum, indexed),
  paymentDetails: {
    method: String (enum),
    transactionId: String (indexed),
    paymentDate: Date,
    lastFourDigits: String,
    receiptUrl: String
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  createdAt: Date (indexed),
  updatedAt: Date
}
Índices:
- invoiceNumber_1: {invoiceNumber: 1} (unique)
- user_1_createdAt_-1: {user: 1, createdAt: -1}
- status_1: {status: 1}
- order_1: {order: 1}
```

### Redis (Clave-Valor)

#### Estructura de Datos

1. **Carritos de Compra**
```
Clave: cart:{userId}
Tipo: String (JSON)
Valor: {
  userId: string,
  items: [{
    productId: string,
    quantity: number,
    price: number,
    name: string
  }],
  total: number,
  createdAt: Date,
  updatedAt: Date
}
TTL: 24 horas
```

2. **Historial de Carritos**
```
Clave: cart_history:{userId}
Tipo: List
Valores: [JSON string de estados previos del carrito]
Máximo elementos: 10 (LTRIM)
```

3. **Sesiones de Usuario**
```
Clave: session:{userId}
Tipo: String (JSON)
Valor: {
  email: string,
  firstName: string,
  lastName: string,
  role: string,
  loginTime: Date
}
TTL: 24 horas
```

### Neo4j (Grafo)

#### Nodos

1. **User**
```cypher
(:User {
  userId: string,
  email: string,
  firstName: string,
  lastName: string,
  category: string,
  createdAt: datetime
})
```

2. **Product**
```cypher
(:Product {
  productId: string,
  name: string,
  category: string,
  price: float
})
```

3. **Order**
```cypher
(:Order {
  orderId: string,
  total: float,
  status: string,
  createdAt: datetime
})
```

#### Relaciones

1. **INTERACTED**
```cypher
(User)-[:INTERACTED {
  action: string,
  timestamp: datetime,
  details: string
}]->(Product)
```

2. **PLACED_ORDER**
```cypher
(User)-[:PLACED_ORDER {
  timestamp: datetime
}]->(Order)
```

3. **CONTAINS**
```cypher
(Order)-[:CONTAINS {
  quantity: integer,
  price: float
}]->(Product)
```

#### Índices
```cypher
CREATE INDEX user_id FOR (u:User) ON (u.userId)
CREATE INDEX product_id FOR (p:Product) ON (p.productId)
CREATE INDEX order_id FOR (o:Order) ON (o.orderId)
CREATE INDEX product_category FOR (p:Product) ON (p.category)
```

### Cassandra (Columnar)

#### Tabla: price_history
```sql
CREATE TABLE price_history (
    product_id text,
    timestamp timestamp,
    price decimal,
    currency text,
    PRIMARY KEY (product_id, timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC);
```
Optimización:
- Particionado por product_id para distribución eficiente
- Clustering por timestamp para búsquedas temporales eficientes
- Orden DESC para obtener precios más recientes primero

#### Tabla: product_changes
```sql
CREATE TABLE product_changes (
    product_id text,
    timestamp timestamp,
    change_type text,
    old_value text,
    new_value text,
    PRIMARY KEY (product_id, timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC);
```
Optimización:
- Particionado por product_id para distribución eficiente
- Clustering por timestamp para auditoría temporal
- Orden DESC para ver cambios más recientes primero

#### Tabla: invoice_operations
```sql
CREATE TABLE invoice_operations (
    invoice_id text,
    order_id text,
    user_id text,
    operation text,
    amount decimal,
    timestamp timestamp,
    status text,
    details text,
    PRIMARY KEY ((invoice_id), timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC);
```
Optimización:
- Particionado por invoice_id para distribución eficiente
- Clustering por timestamp para auditoría temporal
- Índices secundarios:
  ```sql
  CREATE INDEX idx_invoice_ops_user ON invoice_operations (user_id);
  CREATE INDEX idx_invoice_ops_order ON invoice_operations (order_id);
  CREATE INDEX idx_invoice_ops_status ON invoice_operations (status);
  ```

### Justificación del Modelado

1. **MongoDB**
   - Usado para datos estructurados con relaciones simples
   - Índices estratégicos para búsquedas frecuentes
   - Esquema flexible para productos con especificaciones variables
   - Referencias entre documentos para mantener consistencia

2. **Redis**
   - Almacenamiento en memoria para acceso ultrarrápido
   - TTL para gestión automática de datos temporales
   - Estructuras optimizadas para carritos y sesiones
   - Listas para historial con límite de elementos

3. **Neo4j**
   - Modelado de relaciones complejas usuario-producto
   - Optimizado para consultas de recomendación
   - Índices para búsqueda rápida de nodos
   - Propiedades en relaciones para metadata temporal

4. **Cassandra**
   - Diseño orientado a consultas específicas
   - Particionado para distribución y escalabilidad
   - Modelo desnormalizado para rendimiento en escritura
   - Índices secundarios para consultas por usuario y estado

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