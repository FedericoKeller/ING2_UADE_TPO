import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { body, param, query } from 'express-validator';

const router = Router();

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

// Routes
router.post('/',
  authenticate,
  authorize('admin'),
  createProductValidation,
  ProductController.createProduct
);

router.put('/:id',
  authenticate,
  authorize('admin'),
  updateProductValidation,
  ProductController.updateProduct
);

router.delete('/:id',
  authenticate,
  authorize('admin'),
  param('id').isMongoId(),
  ProductController.deleteProduct
);

router.get('/:id',
  param('id').isMongoId(),
  ProductController.getProduct
);

router.get('/',
  listProductsValidation,
  ProductController.listProducts
);

router.get('/:id/analytics',
  authenticate,
  authorize('admin'),
  priceAnalyticsValidation,
  ProductController.getPriceAnalytics
);

router.post('/:id/interaction',
  authenticate,
  recordInteractionValidation,
  ProductController.recordInteraction
);

export default router; 