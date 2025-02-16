import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-commerce API con Persistencia Políglota',
      version: '1.0.0',
      description: 'API REST para una plataforma de comercio electrónico utilizando múltiples bases de datos',
      contact: {
        name: 'Equipo de Desarrollo',
        url: 'https://github.com/yourusername/ING2_UADE_TPO',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Servidor de Desarrollo',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{
      bearerAuth: [],
    }],
    tags: [
      {
        name: 'Auth',
        description: 'Endpoints de autenticación',
      },
      {
        name: 'Products',
        description: 'Gestión de productos',
      },
      {
        name: 'Cart',
        description: 'Operaciones del carrito de compras',
      },
      {
        name: 'Orders',
        description: 'Gestión de pedidos',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Rutas donde buscar los comentarios de documentación
};

export const swaggerSpec = swaggerJsdoc(options); 