# Desarrollo de Sistema de Gestión Poliglota para una Plataforma de Comercio Electrónico

Este repositorio contiene la propuesta de solución para el Trabajo Práctico Obligatorio de "Ingeniería de Datos II", cuyo objetivo es desarrollar una aplicación para una plataforma de comercio electrónico con persistencia poliglota utilizando distintas bases de datos NoSQL.

## Requisitos Previos

### Opción 1: Instalación Local
Antes de comenzar, asegurar de tener instalado:

- Node.js (v16 o superior)
- MongoDB (v4.4 o superior)
- Redis (v6 o superior)
- Neo4j (v4.4 o superior)
- Apache Cassandra (v4.0 o superior)

### Opción 2: Usando Docker
Solo se necesita tener instalado:
- Docker
- Docker Compose

## Instalación

### Usando Docker (Recomendado)

1. Clona el repositorio:
```bash
git clone <repository-url>
cd ING2_UADE_TPO
```

2. Inicia los servicios con Docker Compose:
```bash
docker-compose up -d
```

Esto iniciará:
- La aplicación Node.js en http://localhost:3000
- MongoDB en localhost:27017
- Redis en localhost:6379
- Neo4j en localhost:7687 (UI en http://localhost:7474)
- Cassandra en localhost:9042

Para detener los servicios:
```bash
docker-compose down
```

Para ver los logs:
```bash
docker-compose logs -f
```

### Instalación Local

1. Clona el repositorio:
```bash
git clone <repository-url>
cd ING2_UADE_TPO
```

2. Instala las dependencias:
```bash
npm install
```

3. Copia el archivo de ejemplo de variables de entorno y configúralo:
```bash
cp .env.example .env
```

4. Configura las variables de entorno en el archivo `.env` según tu entorno local.

## Configuración de las Bases de Datos

### MongoDB
- Asegúrate de que MongoDB esté corriendo en `localhost:27017`
- La base de datos se creará automáticamente al iniciar la aplicación

### Redis
- Asegúrate de que Redis esté corriendo en `localhost:6379`
- No se requiere configuración adicional

### Neo4j
- Asegúrate de que Neo4j esté corriendo en `localhost:7687`
- Crea un usuario y contraseña y actualiza el archivo `.env`

### Cassandra
- Asegúrate de que Cassandra esté corriendo en `localhost:9042`
- El keyspace se creará automáticamente al iniciar la aplicación

## Ejecución

Para desarrollo:
```bash
npm run dev
```

Para producción:
```bash
npm run build
npm start
```

## Estructura del Proyecto

```
src/
├── config/         # Configuración de la aplicación y bases de datos
├── controllers/    # Controladores de la aplicación
├── middleware/     # Middleware personalizado
├── models/         # Modelos de datos
├── routes/         # Rutas de la API
├── services/       # Servicios para interactuar con las bases de datos
├── types/          # Tipos y interfaces de TypeScript
└── app.ts         # Punto de entrada de la aplicación
```

## API Endpoints

### Autenticación
- POST `/api/auth/register` - Registro de usuario
- POST `/api/auth/login` - Inicio de sesión
- POST `/api/auth/logout` - Cierre de sesión
- GET `/api/auth/profile` - Obtener perfil del usuario

### Productos
- GET `/api/products` - Listar productos
- GET `/api/products/:id` - Obtener producto específico
- POST `/api/products` - Crear producto (admin)
- PUT `/api/products/:id` - Actualizar producto (admin)
- DELETE `/api/products/:id` - Eliminar producto (admin)
- GET `/api/products/:id/analytics` - Obtener análisis de precios (admin)

### Carrito
- GET `/api/cart` - Obtener carrito actual
- POST `/api/cart/add` - Agregar item al carrito
- DELETE `/api/cart/:productId` - Eliminar item del carrito
- DELETE `/api/cart` - Limpiar carrito
- GET `/api/cart/history` - Obtener historial del carrito
- POST `/api/cart/revert/:stateIndex` - Revertir carrito a estado anterior

### Pedidos
- POST `/api/orders` - Crear pedido
- GET `/api/orders` - Listar pedidos
- GET `/api/orders/:id` - Obtener pedido específico
- PATCH `/api/orders/:id/status` - Actualizar estado del pedido (admin)
- PATCH `/api/orders/:id/payment` - Actualizar estado del pago (admin)

## Persistencia Poliglota

- **MongoDB**: Almacenamiento principal de productos, usuarios y pedidos
- **Redis**: Gestión de carritos de compra y sesiones
- **Neo4j**: Relaciones entre usuarios y productos, recomendaciones
- **Cassandra**: Historial de precios y registro de cambios

## Seguridad

- Autenticación mediante JWT
- Contraseñas hasheadas con Argon2
- Middleware de autorización para rutas protegidas
- Validación de datos de entrada
- Headers de seguridad con Helmet

## Contribución

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add some amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia ISC.

---

## Tabla de Contenidos

- [Introducción](#introducción)
- [Parte 1: Definición de Modelos de Bases de Datos (BD)](#parte-1-definición-de-modelos-de-bases-de-datos-bd)
  - [1.1 Justificación de la Elección de Modelos de BD](#11-justificación-de-la-elección-de-modelos-de-bd)
  - [1.2 Modelado Físico de la Estructura de cada BD](#12-modelado-físico-de-la-estructura-de-cada-bd)
    - [Usuarios (Neo4j)](#usuarios-neo4j)
    - [Sesiones y Carritos (Redis)](#sesiones-y-carritos-redis)
    - [Pedidos, Facturas y Pagos (MongoDB)](#pedidos-facturas-y-pagos-mongodb)
    - [Registro de Cambios y Lista de Precios (Cassandra)](#registro-de-cambios-y-lista-de-precios-cassandra)
- [Parte 2: Desarrollo de la Aplicación](#parte-2-desarrollo-de-la-aplicación)
  - [Funcionalidades Principales](#funcionalidades-principales)
  - [Integración y Comunicación](#integración-y-comunicación)
- [Conclusión](#conclusión)

---

## Introducción

El sistema a desarrollar abarca la gestión completa de una plataforma de comercio electrónico. Se contempla el manejo de usuarios, carritos de compra, conversión de carritos a pedidos, facturación, registro de pagos, catálogo de productos, lista de precios y auditoría de cambios. Se utiliza **persistencia poliglota** para optimizar consultas, transacciones y el rendimiento en función de las necesidades específicas de cada módulo.

---

## Parte 1: Definición de Modelos de Bases de Datos (BD)

### 1.1 Justificación de la Elección de Modelos de BD

- **Usuarios**  
  - **Base de Datos:** Neo4j (Grafos)  
  - **Justificación:**  
    - Modela de forma natural las relaciones entre usuarios.
    - Facilita el análisis de comportamiento y la categorización (TOP, MEDIUM, LOW).
    - Permite representar conexiones e interacciones para análisis y recomendaciones.

- **Sesiones de Usuarios y Carritos de Compras**  
  - **Base de Datos:** Redis (Clave/Valor)  
  - **Justificación:**  
    - Operaciones en tiempo real con alta velocidad.
    - Manejo eficiente de sesiones, estados temporales y estructuras de datos (listas, hashes) para snapshots y rollback.

- **Pedidos, Facturas y Pagos**  
  - **Base de Datos:** MongoDB (Documental)  
  - **Justificación:**  
    - Manejo de información compleja y jerárquica.
    - Almacenamiento en formato JSON/BSON que ofrece flexibilidad y escalabilidad.

- **Catálogo de Productos, Registro de Cambios y Lista de Precios**  
  - **Base de Datos:**  
    - Catálogo: MongoDB (Documental)  
    - Registro de cambios y Lista de precios: Cassandra (Tabular)  
  - **Justificación:**  
    - MongoDB permite esquemas flexibles para datos heterogéneos (descripciones, imágenes, especificaciones).  
    - Cassandra es óptima para escritura intensiva y manejo de grandes volúmenes de datos históricos.

---

## Parte 2: Desarrollo de la Aplicación

### Funcionalidades Principales

1. **Autenticación y Sesión de Usuarios**
   - Validación de credenciales.
   - Generación y almacenamiento de token de sesión en Redis.
   - Registro de actividad en Neo4j para análisis y categorización.

2. **Categorización de Usuarios**
   - Registro de acciones en Neo4j.
   - Determinación y actualización de la categoría del usuario (TOP, MEDIUM, LOW) mediante consultas al grafo.

3. **Gestión de Carritos de Compras**
   - Agregar, eliminar y modificar productos en el carrito (operaciones en Redis).
   - Uso de snapshots para permitir la reversión a estados anteriores.

4. **Conversión de Carrito a Pedido**
   - Extracción de datos del carrito en Redis.
   - Transformación del contenido a un documento de pedido y almacenamiento en MongoDB.

5. **Facturación y Registro de Pagos**
   - Generación de la factura a partir del pedido y almacenamiento en MongoDB.
   - Registro del pago en la colección `pagos`, con detalles de la forma de pago y monto.

6. **Control de Operaciones**
   - Registro de cada acción relevante (facturación, pagos, modificaciones en el carrito) en Cassandra para auditoría.

7. **Catálogo de Productos**
   - Gestión de alta, modificación y baja del catálogo en MongoDB.
   - Sincronización de cambios con Cassandra para mantener el historial.

8. **Lista de Precios**
   - Mantenimiento de una tabla actualizada en Cassandra con los precios actuales e históricos.

9. **Registro de Cambios en el Catálogo**
   - Cada modificación (creación, actualización, eliminación) se registra en Cassandra (`registro_cambios`) para garantizar trazabilidad.

---

## Conclusión

La arquitectura poliglota propuesta permite aprovechar las fortalezas específicas de cada base de datos:

- **Neo4j:** Modelado y análisis de relaciones complejas entre usuarios.
- **Redis:** Gestión eficiente de sesiones y carritos de compras en tiempo real.
- **MongoDB:** Almacenamiento de datos semiestructurados y jerárquicos (pedidos, facturas, pagos, catálogo).
- **Cassandra:** Manejo de grandes volúmenes de datos históricos y registros de cambios, garantizando alta disponibilidad y escalabilidad.

Este diseño optimiza el rendimiento, mejora la experiencia del usuario y asegura la integridad y trazabilidad de las operaciones en la plataforma de comercio electrónico.

## Desarrollo con Docker

### Reconstruir la aplicación
Si realizas cambios en el código, necesitarás reconstruir la imagen de Docker:
```bash
docker-compose build app
docker-compose up -d app
```

### Acceder a los logs
```bash
# Todos los servicios
docker-compose logs -f

# Servicio específico
docker-compose logs -f app
docker-compose logs -f mongodb
docker-compose logs -f redis
docker-compose logs -f neo4j
docker-compose logs -f cassandra
```

### Ejecutar comandos
```bash
# Acceder al shell de la aplicación
docker-compose exec app sh

# Ejecutar scripts
docker-compose exec app npm run populate

# Acceder a las bases de datos
docker-compose exec mongodb mongosh
docker-compose exec redis redis-cli
docker-compose exec neo4j cypher-shell -u neo4j -p password
docker-compose exec cassandra cqlsh
```

### Gestión de datos
Los datos de las bases de datos se persisten en volúmenes de Docker:
- `mongodb_data`: Datos de MongoDB
- `redis_data`: Datos de Redis
- `neo4j_data`: Datos de Neo4j
- `cassandra_data`: Datos de Cassandra

Para eliminar todos los datos y empezar desde cero:
```bash
docker-compose down -v
```


## Documentación de la API (Swagger)

La API está documentada usando Swagger (OpenAPI 3.0). Podés acceder a la documentación interactiva de dos maneras:

### 1. Interfaz Swagger UI

Una vez que el servidor esté corriendo, visita:
```
http://localhost:3000/api-docs
```

Esta interfaz te permite:
- Ver todos los endpoints disponibles
- Leer la documentación detallada de cada endpoint
- Probar los endpoints directamente desde el navegador
- Ver los esquemas de datos y modelos
- Entender los códigos de respuesta y formatos

### 2. Especificación OpenAPI Raw

Para acceder a la especificación OpenAPI en formato JSON:
```
http://localhost:3000/api-docs.json
```

Este endpoint es útil si se necesita importar la documentación en otras herramientas. Más información en la sección de [Documentación de la API con OpenAPI](#documentación-de-la-api-con-openapi)	


### Autenticación en Swagger

Para probar endpoints protegidos:

1. Primero, obtén un token JWT usando `/api/auth/login` o `/api/auth/register`
2. Haz clic en el botón "Authorize" (🔓) en la parte superior
3. Ingresa tu token en el formato: `Bearer <tu_token>`
4. Ahora puedes probar los endpoints protegidos

### Endpoints Documentados

La documentación incluye información detallada sobre:

- **Auth** (`/api/auth/*`)
  - Registro de usuarios
  - Login
  - Logout
  - Perfil de usuario

- **Products** (`/api/products/*`)
  - CRUD de productos
  - Análisis de precios
  - Interacciones de usuarios

- **Cart** (`/api/cart/*`)
  - Gestión del carrito
  - Historial del carrito
  - Revertir estados

- **Orders** (`/api/orders/*`)
  - Creación de pedidos
  - Seguimiento de estados
  - Análisis de ventas

Cada endpoint incluye:
- Descripción del propósito
- Parámetros requeridos y opcionales
- Formato del cuerpo de la petición (si aplica)
- Posibles respuestas y códigos de estado
- Ejemplos de uso

## Documentación de la API con OpenAPI

### Importar en Postman

1. Descarga el archivo `openapi.yaml` del repositorio.

2. Abre Postman y sigue estos pasos:
   - Haz clic en "Import" en la esquina superior izquierda
   - Arrastra el archivo `openapi.yaml` o haz clic en "Upload Files"
   - Selecciona el archivo `openapi.yaml`
   - Haz clic en "Import"

3. Postman creará:
   - Una nueva colección con todos los endpoints documentados
   - Variables de entorno para el servidor
   - Ejemplos de requests y responses
   - Esquemas de validación para los datos

### Configuración del Ambiente

1. En Postman, configura un nuevo ambiente:
   - Nombre: "Local Development"
   - Variable: `baseUrl`
   - Valor Inicial: `http://localhost:3000/api`

2. Para autenticación:
   - La variable `token` se creará automáticamente
   - Se actualizará al usar los endpoints de login/register
   - Se usa automáticamente en los headers de las peticiones autenticadas

### Uso de la Colección

1. **Autenticación**:
   - Registra un usuario usando el endpoint `/auth/register`
   - Inicia sesión con `/auth/login`
   - El token JWT se guardará automáticamente en las variables de ambiente

2. **Prueba de Endpoints**:
   - Los endpoints están organizados por tags (Autenticación, Productos, Carrito, etc.)
   - Cada request incluye:
     - Descripción detallada
     - Parámetros requeridos
     - Ejemplos de request/response
     - Validación de esquemas

3. **Validación de Datos**:
   - Postman validará automáticamente:
     - Formato de los requests
     - Tipos de datos
     - Campos requeridos
     - Enumeraciones válidas

### Ejemplos de Uso

#### Registro de Usuario
```http
POST {{baseUrl}}/auth/register
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123",
  "firstName": "Juan",
  "lastName": "Pérez"
}
```

#### Crear Producto (Admin)
```http
POST {{baseUrl}}/products
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "name": "Producto Ejemplo",
  "description": "Descripción del producto",
  "sku": "PROD-001",
  "category": "categoria",
  "price": 99.99,
  "stock": 100,
  "images": ["https://ejemplo.com/imagen.jpg"],
  "specifications": {
    "color": "Negro",
    "tamaño": "Grande"
  }
}
```

#### Agregar al Carrito
```http
POST {{baseUrl}}/cart/add
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "productId": "{{productId}}",
  "quantity": 1
}
```

## Datos de Demostración

### Populate

El proyecto incluye un comando para poblar la base de datos con datos de demostración:

```bash
# En instalación local
npm run populate

# Con Docker
docker-compose exec app npm run populate
```

Este comando:
1. Limpia todas las bases de datos
2. Registra usuarios de prueba (admin y clientes)
3. Crea productos de ejemplo
4. Simula interacciones (carritos, pedidos)
5. Actualiza estados de pedidos

### Credenciales de Prueba

Después de ejecutar el comando populate, podrás acceder con:

**Admin:**
- Email: admin@demo.com
- Password: admin123456

**Clientes:**
- Email: cliente1@demo.com
- Password: cliente123456
- Email: cliente2@demo.com
- Password: cliente123456

### Documentación Detallada

El archivo `demo-data.md` contiene una documentación detallada de:
- Todos los datos que se crean
- Ejemplos de requests HTTP para cada operación
- Secuencia de demostración paso a paso
- Explicación de cómo se utilizan las diferentes bases de datos

Para una demostración manual o pruebas específicas, podés seguir los ejemplos en `demo-data.md` usando Postman o cualquier cliente HTTP.

### Verificación de Datos

Después de ejecutar el populate, podés verificar los datos en cada base de datos:

**MongoDB:**
```bash
docker-compose exec mongodb mongosh ecommerce
> db.users.find()
> db.products.find()
> db.orders.find()
```

**Redis:**
```bash
docker-compose exec redis redis-cli
> KEYS *
```

**Neo4j:**
```bash
docker-compose exec neo4j cypher-shell -u neo4j -p password
> MATCH (n) RETURN n;
```

**Cassandra:**
```bash
docker-compose exec cassandra cqlsh
> USE ecommerce;
> SELECT * FROM price_history;
> SELECT * FROM product_changes;
```
