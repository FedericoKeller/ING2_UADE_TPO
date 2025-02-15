import { Response } from 'express';
import { AuthenticatedRequest } from '../types/common';
import { RedisService } from '../services/redis.service';
import { Product } from '../models/product.model';
import { Neo4jService } from '../services/neo4j.service';

export class CartController {
  static async getCart(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!._id.toString();
      const cart = await RedisService.getCart(userId);
      
      res.json(cart || { items: [], total: 0 });
    } catch (error) {
      console.error('Get cart error:', error);
      res.status(500).json({ error: 'Error retrieving cart' });
    }
  }

  static async addToCart(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!._id.toString();
      const { productId, quantity } = req.body;

      // Validate product exists and has stock
      const product = await Product.findById(productId);
      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      if (product.stock < quantity) {
        res.status(400).json({ error: 'Insufficient stock' });
        return;
      }

      // Add to cart
      const cartItem = {
        productId: product._id.toString(),
        quantity,
        price: product.price,
        name: product.name,
      };

      const cart = await RedisService.addToCart(userId, cartItem);

      // Record interaction in Neo4j
      await Neo4jService.recordUserInteraction(userId, productId, 'ADD_TO_CART');

      res.json(cart);
    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(500).json({ error: 'Error adding item to cart' });
    }
  }

  static async removeFromCart(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!._id.toString();
      const { productId } = req.params;

      const cart = await RedisService.removeFromCart(userId, productId);
      if (!cart) {
        res.status(404).json({ error: 'Cart not found' });
        return;
      }

      // Record interaction in Neo4j
      await Neo4jService.recordUserInteraction(userId, productId, 'REMOVE_FROM_CART');

      res.json(cart);
    } catch (error) {
      console.error('Remove from cart error:', error);
      res.status(500).json({ error: 'Error removing item from cart' });
    }
  }

  static async clearCart(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!._id.toString();
      await RedisService.clearCart(userId);
      
      res.json({ message: 'Cart cleared successfully' });
    } catch (error) {
      console.error('Clear cart error:', error);
      res.status(500).json({ error: 'Error clearing cart' });
    }
  }

  static async getCartHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!._id.toString();
      const history = await RedisService.getCartHistory(userId);
      
      res.json(history);
    } catch (error) {
      console.error('Get cart history error:', error);
      res.status(500).json({ error: 'Error retrieving cart history' });
    }
  }

  static async revertCart(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!._id.toString();
      const { stateIndex } = req.params;

      const cart = await RedisService.revertCartToState(userId, parseInt(stateIndex));
      if (!cart) {
        res.status(404).json({ error: 'Cart state not found' });
        return;
      }

      res.json(cart);
    } catch (error) {
      console.error('Revert cart error:', error);
      res.status(500).json({ error: 'Error reverting cart state' });
    }
  }
} 