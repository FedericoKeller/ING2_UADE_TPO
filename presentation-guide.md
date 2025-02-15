# Flujo de Presentación: Persistencia Políglota

## Introducción y Arquitectura (5 min)
- Explicar el problema y la solución propuesta
- Mostrar el diagrama de arquitectura y justificar la elección de cada base de datos:
  - **MongoDB**: Datos principales (usuarios, productos, pedidos)
  - **Redis**: Gestión de carritos y sesiones en tiempo real
  - **Neo4j**: Relaciones usuario-producto y recomendaciones
  - **Cassandra**: Historial de precios y auditoría

## Demostración del Sistema (15-20 min)

### a) Registro y Autenticación
- Mostrar cómo se crea un usuario en **MongoDB**
- Explicar cómo se gestiona la sesión en **Redis**
- Demostrar cómo se crea el nodo de usuario en **Neo4j**

### b) Gestión de Productos
- Mostrar la creación de productos
- Explicar cómo se registra el historial de precios en **Cassandra**
- Demostrar la búsqueda y filtrado de productos

### c) Carrito de Compras
- Demostrar la adición de productos al carrito
- Mostrar el funcionamiento del historial del carrito en **Redis**
- Explicar la función de rollback del carrito

### d) Proceso de Compra
- Crear un pedido desde el carrito
- Mostrar cómo se actualiza el stock en **MongoDB**
- Explicar cómo se registra la relación usuario-producto en **Neo4j**

### e) Análisis y Recomendaciones
- Mostrar el análisis de precios desde **Cassandra**
- Demostrar el sistema de recomendaciones basado en **Neo4j**
- Explicar la categorización de usuarios (**TOP, MEDIUM, LOW**)

## Características Destacadas (5-10 min)
- Demostrar la consistencia entre bases de datos
- Mostrar el manejo de errores y rollbacks
- Explicar las medidas de seguridad implementadas
- Mostrar el sistema de auditoría

## Conclusiones y Preguntas (5 min)
- Resaltar los beneficios de la persistencia poliglota
- Mencionar posibles mejoras o extensiones
- Responder preguntas

## Puntos a Destacar Durante la Presentación

### **Rendimiento**
- **Redis** para operaciones en tiempo real
- **Cassandra** para escritura intensiva de históricos
- **MongoDB** para consultas flexibles
- **Neo4j** para consultas relacionales complejas

### **Escalabilidad**
- Cada base de datos puede escalar independientemente
- Distribución de carga entre diferentes sistemas

### **Consistencia**
- Manejo de transacciones distribuidas
- Estrategias de sincronización entre bases de datos

### **Seguridad**
- Autenticación **JWT**
- Control de acceso basado en roles
- Protección contra ataques comunes

## Facilidades para la Presentación
Para facilitar la presentación, puedes usar el script `populate-demo-data.ts` que ya está implementado, el cual creará datos de ejemplo en todas las bases de datos y te permitirá mostrar las diferentes funcionalidades del sistema de manera ordenada.