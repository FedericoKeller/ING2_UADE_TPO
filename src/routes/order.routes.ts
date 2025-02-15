import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { body, param, query } from 'express-validator';

const router = Router();

// Validation middleware
const createOrderValidation = [
  body('shippingAddress').isObject(),
  body('shippingAddress.street').trim().notEmpty(),
  body('shippingAddress.city').trim().notEmpty(),
  body('shippingAddress.state').trim().notEmpty(),
  body('shippingAddress.zipCode').trim().notEmpty(),
  body('shippingAddress.country').trim().notEmpty(),
  body('paymentInfo').isObject(),
  body('paymentInfo.method').isIn(['credit_card', 'debit_card', 'transfer']),
  body('paymentInfo.transactionId').trim().notEmpty(),
];

const listOrdersValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
];

const updateOrderStatusValidation = [
  param('id').isMongoId(),
  body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
];

const updatePaymentStatusValidation = [
  param('id').isMongoId(),
  body('status').isIn(['pending', 'completed', 'failed']),
];

// Routes
router.post('/',
  authenticate,
  createOrderValidation,
  OrderController.createOrder
);

router.get('/:id',
  authenticate,
  param('id').isMongoId(),
  OrderController.getOrder
);

router.get('/',
  authenticate,
  listOrdersValidation,
  OrderController.listOrders
);

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