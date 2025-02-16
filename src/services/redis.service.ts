import { redisClient } from '../config/database';
import { Cart, CartItem } from '../types/common';

export class RedisService {
  private static readonly CART_PREFIX = 'cart:';
  private static readonly SESSION_PREFIX = 'session:';
  private static readonly CART_HISTORY_PREFIX = 'cart_history:';

  // Cart Management
  static async getCart(userId: string): Promise<Cart | null> {
    const cartKey = this.CART_PREFIX + userId;
    const cartData = await redisClient.get(cartKey);
    return cartData ? JSON.parse(cartData) : null;
  }

  static async updateCart(userId: string, cart: Cart): Promise<void> {
    const cartKey = this.CART_PREFIX + userId;
    await redisClient.set(cartKey, JSON.stringify(cart));
    
    // Save cart state in history
    const historyKey = this.CART_HISTORY_PREFIX + userId;
    await redisClient.rPush(historyKey, JSON.stringify({
      ...cart,
      timestamp: new Date()
    }));
    
    // Keep only last 10 states
    await redisClient.lTrim(historyKey, -10, -1);
  }

  static async addToCart(userId: string, item: CartItem): Promise<Cart> {
    const cart = await this.getCart(userId) || {
      userId,
      items: [],
      total: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const existingItemIndex = cart.items.findIndex(i => i.productId === item.productId);

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += item.quantity;
    } else {
      cart.items.push(item);
    }

    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.updatedAt = new Date();

    await this.updateCart(userId, cart);
    return cart;
  }

  static async removeFromCart(userId: string, productId: string): Promise<Cart | null> {
    const cart = await this.getCart(userId);
    if (!cart) return null;

    cart.items = cart.items.filter(item => item.productId !== productId);
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.updatedAt = new Date();

    await this.updateCart(userId, cart);
    return cart;
  }

  static async clearCart(userId: string): Promise<void> {
    const cartKey = this.CART_PREFIX + userId;
    await redisClient.del(cartKey);
  }

  // Cart History Management
  static async getCartHistory(userId: string): Promise<Cart[]> {
    const historyKey = this.CART_HISTORY_PREFIX + userId;
    const history = await redisClient.lRange(historyKey, 0, -1);
    return history.map(state => JSON.parse(state));
  }

  static async revertCartToState(userId: string, stateIndex: number): Promise<Cart | null> {
    const history = await this.getCartHistory(userId);
    if (!history[stateIndex]) return null;

    const cart = history[stateIndex];
    await this.updateCart(userId, cart);
    return cart;
  }

  // Session Management
  static async setSession(userId: string, sessionData: any, expiresIn: number = 3600): Promise<void> {
    const sessionKey = this.SESSION_PREFIX + userId;
    await redisClient.set(sessionKey, JSON.stringify(sessionData), {
      EX: expiresIn
    });
  }

  static async getSession(userId: string): Promise<any> {
    const sessionKey = this.SESSION_PREFIX + userId;
    const sessionData = await redisClient.get(sessionKey);
    return sessionData ? JSON.parse(sessionData) : null;
  }

  static async removeSession(userId: string): Promise<void> {
    const sessionKey = this.SESSION_PREFIX + userId;
    await redisClient.del(sessionKey);
  }
} 