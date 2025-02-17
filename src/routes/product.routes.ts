import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { body, param, query } from 'express-validator';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - sku
 *         - category
 *         - price
 *         - stock
 *         - images
 *       properties:
 *         name:
 *           type: string
 *           description: Nombre del producto
 *         description:
 *           type: string
 *           description: Descripción detallada del producto
 *         sku:
 *           type: string
 *           description: Código único del producto
 *         category:
 *           type: string
 *           description: Categoría del producto
 *         price:
 *           type: number
 *           format: float
 *           minimum: 0
 *           description: Precio del producto
 *         stock:
 *           type: integer
 *           minimum: 0
 *           description: Cantidad disponible
 *         images:
 *           type: array
 *           items:
 *             type: string
 *           description: URLs de las imágenes del producto
 *         specifications:
 *           type: object
 *           description: Especificaciones técnicas del producto
 *     PriceHistory:
 *       type: object
 *       properties:
 *         timestamp:
 *           type: string
 *           format: date-time
 *         price:
 *           type: number
 *         currency:
 *           type: string
 *     ProductAnalytics:
 *       type: object
 *       properties:
 *         averagePrice:
 *           type: number
 *         volatility:
 *           type: object
 *           properties:
 *             changes:
 *               type: integer
 *             volatility:
 *               type: number
 */

// Validation middleware
const createProductValidation = [
  body('name').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('sku').trim().notEmpty(),
  body('category').trim().notEmpty(),
  body('price').isFloat({ min: 0 }),
  body('stock').isInt({ min: 0 }),
  body('images').isArray().notEmpty(),
  body('specifications').isObject(),
];

const updateProductValidation = [
  param('id').isMongoId(),
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
  body('sku').optional().trim().notEmpty(),
  body('category').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
  body('stock').optional().isInt({ min: 0 }),
  body('images').optional().isArray(),
  body('specifications').optional().isObject(),
];

const listProductsValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().trim().notEmpty(),
  query('search').optional().trim().notEmpty(),
];

const priceAnalyticsValidation = [
  param('id').isMongoId(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
];

const recordInteractionValidation = [
  param('id').isMongoId(),
  body('action').isString().notEmpty(),
];

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Crear un nuevo producto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Producto creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No tiene permisos de administrador
 */
router.post('/',
  authenticate,
  authorize('admin'),
  createProductValidation,
  ProductController.createProduct
);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Actualizar un producto existente
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del producto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Producto actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No tiene permisos de administrador
 *       404:
 *         description: Producto no encontrado
 */
router.put('/:id',
  authenticate,
  authorize('admin'),
  updateProductValidation,
  ProductController.updateProduct
);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Eliminar un producto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del producto
 *     responses:
 *       200:
 *         description: Producto eliminado exitosamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No tiene permisos de administrador
 *       404:
 *         description: Producto no encontrado
 */
router.delete('/:id',
  authenticate,
  authorize('admin'),
  param('id').isMongoId(),
  ProductController.deleteProduct
);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Obtener detalles de un producto
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del producto
 *     responses:
 *       200:
 *         description: Detalles del producto
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *                 priceHistory:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PriceHistory'
 *                 changes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       changeType:
 *                         type: string
 *                       oldValue:
 *                         type: string
 *                       newValue:
 *                         type: string
 *       404:
 *         description: Producto no encontrado
 */
router.get('/:id',
  param('id').isMongoId(),
  ProductController.getProduct
);

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Listar productos
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Cantidad de items por página
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrar por categoría
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre o descripción
 *     responses:
 *       200:
 *         description: Lista paginada de productos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 hasMore:
 *                   type: boolean
 */
router.get('/',
  listProductsValidation,
  ProductController.listProducts
);

/**
 * @swagger
 * /products/{id}/analytics:
 *   get:
 *     summary: Obtener análisis de precios de un producto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del producto
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha inicial para el análisis
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha final para el análisis
 *     responses:
 *       200:
 *         description: Análisis de precios del producto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductAnalytics'
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No tiene permisos de administrador
 *       404:
 *         description: Producto no encontrado
 */
router.get('/:id/analytics',
  authenticate,
  authorize('admin'),
  priceAnalyticsValidation,
  ProductController.getPriceAnalytics
);

/**
 * @swagger
 * /products/{id}/interaction:
 *   post:
 *     summary: Registrar una interacción con un producto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del producto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 description: Tipo de interacción
 *     responses:
 *       200:
 *         description: Interacción registrada exitosamente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Producto no encontrado
 */
router.post('/:id/interaction',
  authenticate,
  recordInteractionValidation,
  ProductController.recordInteraction
);

/**
 * @swagger
 * /products/catalog/changes:
 *   get:
 *     summary: Obtener historial de cambios del catálogo
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha inicial para filtrar cambios
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha final para filtrar cambios
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *         description: ID del producto para filtrar cambios específicos
 *     responses:
 *       200:
 *         description: Historial de cambios del catálogo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalChanges:
 *                       type: integer
 *                     changesByType:
 *                       type: object
 *                     period:
 *                       type: object
 *                       properties:
 *                         start:
 *                           type: string
 *                           format: date-time
 *                         end:
 *                           type: string
 *                           format: date-time
 *                 changes:
 *                   type: object
 *                   additionalProperties:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         productId:
 *                           type: string
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                         oldValue:
 *                           type: object
 *                         newValue:
 *                           type: object
 */
router.get('/catalog/changes',
  authenticate,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('productId').optional().isMongoId(),
  ProductController.getCatalogChanges
);

export default router; 