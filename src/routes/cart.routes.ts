import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';
import { authenticate } from '../middleware/auth.middleware';
import { body, param } from 'express-validator';

const router = Router();

// Validation middleware
const addToCartValidation = [
  body('productId').isMongoId(),
  body('quantity').isInt({ min: 1 }),
];

const removeFromCartValidation = [
  param('productId').isMongoId(),
];

const revertCartValidation = [
  param('stateIndex').isInt({ min: 0 }),
];

// Routes
router.get('/', authenticate, CartController.getCart);
router.post('/add', authenticate, addToCartValidation, CartController.addToCart);
router.delete('/:productId', authenticate, removeFromCartValidation, CartController.removeFromCart);
router.delete('/', authenticate, CartController.clearCart);
router.get('/history', authenticate, CartController.getCartHistory);
router.post('/revert/:stateIndex', authenticate, revertCartValidation, CartController.revertCart);

export default router; 