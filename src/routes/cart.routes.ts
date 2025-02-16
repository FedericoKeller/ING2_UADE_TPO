import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';
import { authenticate } from '../middleware/auth.middleware';
import { body, param } from 'express-validator';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CartItem:
 *       type: object
 *       required:
 *         - productId
 *         - quantity
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
 *     Cart:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           description: ID del usuario dueño del carrito
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         total:
 *           type: number
 *           description: Total del carrito
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

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

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Obtener el carrito actual del usuario
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Carrito actual
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       401:
 *         description: No autorizado
 */
router.get('/', authenticate, CartController.getCart);

/**
 * @swagger
 * /cart/add:
 *   post:
 *     summary: Agregar un producto al carrito
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 description: ID del producto a agregar
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Cantidad a agregar
 *     responses:
 *       200:
 *         description: Producto agregado al carrito
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Datos inválidos o stock insuficiente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Producto no encontrado
 */
router.post('/add', authenticate, addToCartValidation, CartController.addToCart);

/**
 * @swagger
 * /cart/{productId}:
 *   delete:
 *     summary: Eliminar un producto del carrito
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del producto a eliminar
 *     responses:
 *       200:
 *         description: Producto eliminado del carrito
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Carrito o producto no encontrado
 */
router.delete('/:productId', authenticate, removeFromCartValidation, CartController.removeFromCart);

/**
 * @swagger
 * /cart:
 *   delete:
 *     summary: Vaciar el carrito
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Carrito vaciado exitosamente
 *       401:
 *         description: No autorizado
 */
router.delete('/', authenticate, CartController.clearCart);

/**
 * @swagger
 * /cart/history:
 *   get:
 *     summary: Obtener historial del carrito
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historial del carrito
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Cart'
 *       401:
 *         description: No autorizado
 */
router.get('/history', authenticate, CartController.getCartHistory);

/**
 * @swagger
 * /cart/revert/{stateIndex}:
 *   post:
 *     summary: Revertir el carrito a un estado anterior
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stateIndex
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Índice del estado al cual revertir
 *     responses:
 *       200:
 *         description: Carrito revertido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Estado no encontrado
 */
router.post('/revert/:stateIndex', authenticate, revertCartValidation, CartController.revertCart);

export default router; 