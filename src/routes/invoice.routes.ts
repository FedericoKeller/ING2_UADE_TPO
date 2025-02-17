import { Router } from 'express';
import { InvoiceController } from '../controllers/invoice.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { param, query } from 'express-validator';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Invoice:
 *       type: object
 *       required:
 *         - order
 *         - user
 *         - items
 *         - subtotal
 *         - tax
 *         - total
 *         - status
 *         - paymentDetails
 *         - billingAddress
 *       properties:
 *         _id:
 *           type: string
 *           format: mongodb-objectid
 *         invoiceNumber:
 *           type: string
 *           description: Número único de factura
 *         order:
 *           type: string
 *           format: mongodb-objectid
 *           description: ID del pedido asociado
 *         user:
 *           type: string
 *           format: mongodb-objectid
 *           description: ID del usuario
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               product:
 *                 type: string
 *                 format: mongodb-objectid
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *               price:
 *                 type: number
 *                 minimum: 0
 *               subtotal:
 *                 type: number
 *                 minimum: 0
 *         subtotal:
 *           type: number
 *           minimum: 0
 *         tax:
 *           type: number
 *           minimum: 0
 *         total:
 *           type: number
 *           minimum: 0
 *         status:
 *           type: string
 *           enum: [pending, paid, cancelled, refunded]
 *         paymentDetails:
 *           type: object
 *           properties:
 *             method:
 *               type: string
 *               enum: [credit_card, debit_card, transfer]
 *             transactionId:
 *               type: string
 *             paymentDate:
 *               type: string
 *               format: date-time
 *             lastFourDigits:
 *               type: string
 *             receiptUrl:
 *               type: string
 *         billingAddress:
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
 *             country:
 *               type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /invoices/order/{orderId}:
 *   post:
 *     summary: Crear una factura para un pedido
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del pedido
 *     responses:
 *       201:
 *         description: Factura creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       400:
 *         description: Ya existe una factura para este pedido
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No tiene permisos para crear esta factura
 *       404:
 *         description: Pedido no encontrado
 */
router.post('/order/:orderId',
  authenticate,
  param('orderId').isMongoId(),
  InvoiceController.createInvoice
);

/**
 * @swagger
 * /invoices/{id}:
 *   get:
 *     summary: Obtener una factura específica
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la factura
 *     responses:
 *       200:
 *         description: Factura encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No tiene permisos para ver esta factura
 *       404:
 *         description: Factura no encontrada
 */
router.get('/:id',
  authenticate,
  param('id').isMongoId(),
  InvoiceController.getInvoice
);

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: Listar facturas
 *     tags: [Invoices]
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
 *           enum: [pending, paid, cancelled, refunded]
 *         description: Filtrar por estado
 *     responses:
 *       200:
 *         description: Lista paginada de facturas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Invoice'
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
router.get('/',
  authenticate,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'paid', 'cancelled', 'refunded']),
  InvoiceController.listInvoices
);

/**
 * @swagger
 * /invoices/{id}/status:
 *   patch:
 *     summary: Actualizar estado de una factura
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la factura
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
 *                 enum: [pending, paid, cancelled, refunded]
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No tiene permisos para actualizar esta factura
 *       404:
 *         description: Factura no encontrada
 */
router.patch('/:id/status',
  authenticate,
  authorize('admin'),
  param('id').isMongoId(),
  InvoiceController.updateInvoiceStatus
);

/**
 * @swagger
 * /invoices/analytics:
 *   get:
 *     summary: Obtener análisis de facturación
 *     tags: [Invoices]
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
 *         description: Análisis de facturación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalInvoices:
 *                   type: integer
 *                 totalAmount:
 *                   type: number
 *                 averageAmount:
 *                   type: number
 *                 byStatus:
 *                   type: object
 *                   additionalProperties:
 *                     type: integer
 *                 byPaymentMethod:
 *                   type: object
 *                   additionalProperties:
 *                     type: integer
 *                 period:
 *                   type: object
 *                   properties:
 *                     start:
 *                       type: string
 *                       format: date-time
 *                     end:
 *                       type: string
 *                       format: date-time
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
  InvoiceController.getInvoiceAnalytics
);

export default router; 