import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { body, param, query } from 'express-validator';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     OrderItem:
 *       type: object
 *       required:
 *         - productId
 *         - quantity
 *         - price
 *       properties:
 *         productId:
 *           type: string
 *           description: ID del producto
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Cantidad del producto
 *         price:
 *           type: number
 *           description: Precio unitario del producto
 *         name:
 *           type: string
 *           description: Nombre del producto
 *     Order:
 *       type: object
 *       required:
 *         - userId
 *         - items
 *         - total
 *         - status
 *       properties:
 *         userId:
 *           type: string
 *           description: ID del usuario que realizó el pedido
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderItem'
 *         total:
 *           type: number
 *           description: Total del pedido
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, cancelled]
 *           description: Estado del pedido
 *         shippingAddress:
 *           type: object
 *           properties:
 *             street:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             zipCode:
 *               type: string
 *         paymentInfo:
 *           type: object
 *           properties:
 *             method:
 *               type: string
 *             transactionId:
 *               type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     OrderAnalytics:
 *       type: object
 *       properties:
 *         totalOrders:
 *           type: integer
 *         totalRevenue:
 *           type: number
 *         averageOrderValue:
 *           type: number
 *         ordersByStatus:
 *           type: object
 *           additionalProperties:
 *             type: integer
 */

// Validation middleware
const createOrderValidation = [
  body('shippingAddress').isObject(),
  body('shippingAddress.street').notEmpty(),
  body('shippingAddress.city').notEmpty(),
  body('shippingAddress.state').notEmpty(),
  body('shippingAddress.zipCode').notEmpty(),
  body('paymentInfo').isObject(),
  body('paymentInfo.method').isIn(['credit_card', 'debit_card', 'transfer']),
];

const updateOrderStatusValidation = [
  param('id').isMongoId(),
  body('status').isIn(['pending', 'processing', 'completed', 'cancelled']),
];

const listOrdersValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'processing', 'completed', 'cancelled']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
];

const updatePaymentStatusValidation = [
  param('id').isMongoId(),
  body('status').isIn(['pending', 'completed', 'failed']),
];

/**
 * @swagger
 * /orders/analytics:
 *   get:
 *     summary: Obtener análisis de pedidos
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Análisis de pedidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderAnalytics'
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No tiene permisos de administrador
 */
router.get('/analytics',
  authenticate,
  authorize('admin'),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  OrderController.getOrderAnalytics
);

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Crear un nuevo pedido
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shippingAddress
 *               - paymentInfo
 *             properties:
 *               shippingAddress:
 *                 type: object
 *                 required:
 *                   - street
 *                   - city
 *                   - state
 *                   - zipCode
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *               paymentInfo:
 *                 type: object
 *                 required:
 *                   - method
 *                 properties:
 *                   method:
 *                     type: string
 *                     enum: [credit_card, debit_card, transfer]
 *     responses:
 *       201:
 *         description: Pedido creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Datos inválidos o carrito vacío
 *       401:
 *         description: No autorizado
 */
router.post('/', authenticate, createOrderValidation, OrderController.createOrder);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Obtener detalles de un pedido
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del pedido
 *     responses:
 *       200:
 *         description: Detalles del pedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No tiene permisos para ver este pedido
 *       404:
 *         description: Pedido no encontrado
 */
router.get('/:id', authenticate, param('id').isMongoId(), OrderController.getOrder);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Listar pedidos
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, cancelled]
 *         description: Filtrar por estado
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha inicial para filtrar
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha final para filtrar
 *     responses:
 *       200:
 *         description: Lista paginada de pedidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 hasMore:
 *                   type: boolean
 *       401:
 *         description: No autorizado
 */
router.get('/', authenticate, listOrdersValidation, OrderController.listOrders);

/**
 * @swagger
 * /orders/{id}/status:
 *   patch:
 *     summary: Actualizar estado de un pedido
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del pedido
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, completed, cancelled]
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Estado inválido
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No tiene permisos para actualizar este pedido
 *       404:
 *         description: Pedido no encontrado
 */
router.patch('/:id/status',
  authenticate,
  authorize('admin'),
  updateOrderStatusValidation,
  OrderController.updateOrderStatus
);

router.patch('/:id/payment',
  authenticate,
  authorize('admin'),
  updatePaymentStatusValidation,
  OrderController.updatePaymentStatus
);

export default router; 