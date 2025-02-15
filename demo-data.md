# Datos de Demostración para E-commerce Polyglot API

## 1. Crear Usuarios

### Crear Usuario Administrador
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "admin@demo.com",
  "password": "admin123456",
  "firstName": "Admin",
  "lastName": "User",
  "role": "admin"
}
```

### Crear Usuarios Regulares
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "cliente1@demo.com",
  "password": "cliente123456",
  "firstName": "Juan",
  "lastName": "Pérez"
}
```

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "cliente2@demo.com",
  "password": "cliente123456",
  "firstName": "María",
  "lastName": "González"
}
```

## 2. Crear Productos

### Producto 1: Smartphone
```http
POST /api/products
Authorization: Bearer {token_admin}
Content-Type: application/json

{
  "name": "iPhone 14 Pro",
  "description": "El último iPhone con la mejor cámara y rendimiento",
  "sku": "IPH-14PRO-128",
  "category": "smartphones",
  "price": 999.99,
  "stock": 50,
  "images": [
    "https://example.com/images/iphone14pro-1.jpg",
    "https://example.com/images/iphone14pro-2.jpg"
  ],
  "specifications": {
    "storage": "128GB",
    "color": "Space Black",
    "screen": "6.1 inch",
    "camera": "48MP"
  }
}
```

### Producto 2: Laptop
```http
POST /api/products
Authorization: Bearer {token_admin}
Content-Type: application/json

{
  "name": "MacBook Pro M2",
  "description": "Laptop profesional con el chip M2",
  "sku": "MBP-M2-256",
  "category": "laptops",
  "price": 1299.99,
  "stock": 30,
  "images": [
    "https://example.com/images/macbookm2-1.jpg",
    "https://example.com/images/macbookm2-2.jpg"
  ],
  "specifications": {
    "processor": "Apple M2",
    "storage": "256GB",
    "ram": "8GB",
    "screen": "13.3 inch"
  }
}
```

### Producto 3: Tablet
```http
POST /api/products
Authorization: Bearer {token_admin}
Content-Type: application/json

{
  "name": "iPad Air",
  "description": "iPad Air con chip M1",
  "sku": "IPAD-AIR-64",
  "category": "tablets",
  "price": 599.99,
  "stock": 40,
  "images": [
    "https://example.com/images/ipadair-1.jpg",
    "https://example.com/images/ipadair-2.jpg"
  ],
  "specifications": {
    "storage": "64GB",
    "color": "Space Gray",
    "screen": "10.9 inch",
    "chip": "M1"
  }
}
```

## 3. Simular Interacciones de Usuario

### Agregar Productos al Carrito (Cliente 1)
```http
POST /api/cart/add
Authorization: Bearer {token_cliente1}
Content-Type: application/json

{
  "productId": "{id_iphone}",
  "quantity": 1
}
```

```http
POST /api/cart/add
Authorization: Bearer {token_cliente1}
Content-Type: application/json

{
  "productId": "{id_macbook}",
  "quantity": 1
}
```

### Crear Pedido (Cliente 1)
```http
POST /api/orders
Authorization: Bearer {token_cliente1}
Content-Type: application/json

{
  "shippingAddress": {
    "street": "Av. Corrientes 1234",
    "city": "Buenos Aires",
    "state": "CABA",
    "zipCode": "C1043AAZ",
    "country": "Argentina"
  },
  "paymentInfo": {
    "method": "credit_card",
    "transactionId": "TRANS-001"
  }
}
```

### Agregar Productos al Carrito (Cliente 2)
```http
POST /api/cart/add
Authorization: Bearer {token_cliente2}
Content-Type: application/json

{
  "productId": "{id_ipad}",
  "quantity": 2
}
```

### Crear Pedido (Cliente 2)
```http
POST /api/orders
Authorization: Bearer {token_cliente2}
Content-Type: application/json

{
  "shippingAddress": {
    "street": "Av. Santa Fe 2345",
    "city": "Buenos Aires",
    "state": "CABA",
    "zipCode": "C1123AAZ",
    "country": "Argentina"
  },
  "paymentInfo": {
    "method": "debit_card",
    "transactionId": "TRANS-002"
  }
}
```

## 4. Actualizar Estados de Pedidos (Admin)

### Actualizar Estado de Pedido
```http
PATCH /api/orders/{order_id}/status
Authorization: Bearer {token_admin}
Content-Type: application/json

{
  "status": "processing"
}
```

### Actualizar Estado de Pago
```http
PATCH /api/orders/{order_id}/payment
Authorization: Bearer {token_admin}
Content-Type: application/json

{
  "status": "completed"
}
```

## 5. Actualizar Precios (Admin)

### Actualizar Precio de Producto
```http
PUT /api/products/{product_id}
Authorization: Bearer {token_admin}
Content-Type: application/json

{
  "price": 949.99
}
```

## Secuencia de Demostración

1. **Registro e Inicio de Sesión**
   - Registrar usuario admin
   - Registrar dos usuarios regulares
   - Iniciar sesión con cada usuario para obtener tokens

2. **Gestión de Productos**
   - Crear los tres productos con el usuario admin
   - Verificar la lista de productos
   - Obtener detalles de productos individuales

3. **Interacciones de Usuario**
   - Cliente 1: Agregar iPhone y MacBook al carrito
   - Cliente 1: Crear pedido
   - Cliente 2: Agregar iPad al carrito
   - Cliente 2: Crear pedido

4. **Gestión de Pedidos**
   - Admin: Actualizar estados de pedidos
   - Admin: Actualizar estados de pagos
   - Verificar historial de pedidos

5. **Demostración de Características Especiales**
   - Verificar recomendaciones de productos
   - Mostrar historial de precios
   - Mostrar análisis de precios
   - Demostrar categorización de usuarios

Esta secuencia demostrará:
- Persistencia en MongoDB (usuarios, productos, pedidos)
- Gestión de sesiones en Redis (carritos)
- Relaciones y recomendaciones en Neo4j
- Historial de precios en Cassandra
- Integración entre todas las bases de datos 