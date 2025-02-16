import { Response } from 'express';
import { AuthenticatedRequest } from '../types/common';
import { Order, IOrder } from '../models/order.model';
import { Product } from '../models/product.model';
import { RedisService } from '../services/redis.service';
import { Neo4jService } from '../services/neo4j.service';

export class OrderController {
  static async createOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { shippingAddress, paymentInfo } = req.body;

      // Get cart
      const cart = await RedisService.getCart(userId);
      if (!cart || cart.items.length === 0) {
        res.status(400).json({ error: 'Cart is empty' });
        return;
      }

      // Verify stock and update products
      for (const item of cart.items) {
        const product = await Product.findById(item.productId);
        if (!product) {
          res.status(400).json({ error: `Product ${item.productId} not found` });
          return;
        }
        if (product.stock < item.quantity) {
          res.status(400).json({ error: `Insufficient stock for product ${product.name}` });
          return;
        }
        product.stock -= item.quantity;
        await product.save();
      }

      // Create order
      const order = new Order({
        user: userId,
        items: cart.items.map(item => ({
          product: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        total: cart.total,
        status: 'pending',
        shippingAddress,
        paymentInfo,
      }) as IOrder;
      await order.save();

      // Record order in Neo4j
      await Neo4jService.recordOrder(userId, order._id.toString(), order.total);

      // Clear cart
      await RedisService.clearCart(userId);

      // Update user category
      const newCategory = await Neo4jService.updateUserCategory(userId);
      await req.user!.updateOne({ category: newCategory });

      res.status(201).json(order);
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ error: 'Error creating order' });
    }
  }

  static async getOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();

      const order = await Order.findById(id)
        .populate('items.product')
        .populate('user', 'email firstName lastName');

      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      // Check if user is authorized to view this order
      if (order.user._id.toString() !== userId && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }

      res.json(order);
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({ error: 'Error retrieving order' });
    }
  }

  static async listOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const userId = req.user!._id.toString();
      const skip = (Number(page) - 1) * Number(limit);

      let query: any = {};

      // Regular users can only see their own orders
      if (req.user!.role !== 'admin') {
        query.user = userId;
      }

      if (status) {
        query.status = status;
      }

      const [orders, total] = await Promise.all([
        Order.find(query)
          .populate('items.product')
          .populate('user', 'email firstName lastName')
          .skip(skip)
          .limit(Number(limit))
          .sort({ createdAt: -1 }),
        Order.countDocuments(query),
      ]);

      res.json({
        data: orders,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        hasMore: skip + orders.length < total,
      });
    } catch (error) {
      console.error('List orders error:', error);
      res.status(500).json({ error: 'Error listing orders' });
    }
  }

  static async updateOrderStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }

      const order = await Order.findById(id);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      order.status = status;
      await order.save();

      res.json(order);
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({ error: 'Error updating order status' });
    }
  }

  static async updatePaymentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }

      const order = await Order.findById(id);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      order.paymentInfo.status = status;
      await order.save();

      res.json(order);
    } catch (error) {
      console.error('Update payment status error:', error);
      res.status(500).json({ error: 'Error updating payment status' });
    }
  }

  static async getOrderAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
      const end = endDate ? new Date(endDate as string) : new Date();

      // Build query
      const query: any = {
        createdAt: {
          $gte: start,
          $lte: end
        }
      };

      // Get orders within date range
      const orders = await Order.find(query);

      // Calculate analytics
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Count orders by status
      const ordersByStatus = orders.reduce((acc: { [key: string]: number }, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      res.json({
        totalOrders,
        totalRevenue,
        averageOrderValue,
        ordersByStatus,
        period: {
          start,
          end
        }
      });
    } catch (error) {
      console.error('Get order analytics error:', error);
      res.status(500).json({ error: 'Error retrieving order analytics' });
    }
  }
} 