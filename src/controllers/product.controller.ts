import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/common';
import { Product } from '../models/product.model';
import { CassandraService } from '../services/cassandra.service';
import { Neo4jService } from '../services/neo4j.service';

export class ProductController {
  static async createProduct(req: AuthenticatedRequest, res: Response) {
    try {
      const productData = req.body;
      
      // First create the product in MongoDB
      const product = new Product(productData);
      await product.save();

      // After product is created and we have the ID, record in Cassandra
      try {
        await Promise.all([
          // Record price in Cassandra
          CassandraService.recordPriceChange({
            productId: product._id.toString(),
            price: product.price,
            timestamp: new Date(),
            currency: 'USD'
          }),

          // Record change in Cassandra
          CassandraService.recordProductChange(
            product._id.toString(),
            '',
            JSON.stringify(product.toObject()),
            'CREATE'
          )
        ]);
      } catch (cassandraError) {
        console.error('Cassandra error during product creation:', cassandraError);
        // Continue with product creation even if Cassandra operations fail
      }

      res.status(201).json(product);
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Error creating product' });
    }
  }

  static async updateProduct(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const product = await Product.findById(id);
      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      // Check if price is being updated
      if (updateData.price && updateData.price !== product.price) {
        await CassandraService.recordPriceChange({
          productId: id,
          price: updateData.price,
          timestamp: new Date(),
          currency: 'USD'
        });
      }

      // Record change in Cassandra
      await CassandraService.recordProductChange(
        product._id.toString(),
        JSON.stringify(product.toObject()),
        JSON.stringify(updateData),
        'UPDATE'
      );

      // Update product
      Object.assign(product, updateData);
      await product.save();

      res.json(product);
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Error updating product' });
    }
  }

  static async deleteProduct(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const product = await Product.findByIdAndDelete(id);
      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      // Record change in Cassandra
      await CassandraService.recordProductChange(
        product._id.toString(),
        JSON.stringify(product.toObject()),
        '',
        'DELETE'
      );

      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: 'Error deleting product' });
    }
  }

  static async getProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const product = await Product.findById(id);
      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      // Get price history from Cassandra
      const priceHistory = await CassandraService.getPriceHistory(id);

      // Get product changes from Cassandra
      const changes = await CassandraService.getProductChanges(id);

      res.json({
        product,
        priceHistory,
        changes,
      });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ error: 'Error retrieving product' });
    }
  }

  static async listProducts(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, category, search } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      let query: any = {};

      if (category) {
        query.category = category;
      }

      if (search) {
        query.$text = { $search: search as string };
      }

      const [products, total] = await Promise.all([
        Product.find(query)
          .skip(skip)
          .limit(Number(limit))
          .sort({ createdAt: -1 }),
        Product.countDocuments(query),
      ]);

      res.json({
        data: products,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        hasMore: skip + products.length < total,
      });
    } catch (error) {
      console.error('List products error:', error);
      res.status(500).json({ error: 'Error listing products' });
    }
  }

  static async getPriceAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const [averagePrice, volatility] = await Promise.all([
        CassandraService.getAveragePriceByPeriod(id, start, end),
        CassandraService.getPriceVolatility(id, start, end),
      ]);

      res.json({
        averagePrice,
        volatility,
        period: {
          start,
          end,
        },
      });
    } catch (error) {
      console.error('Get price analytics error:', error);
      res.status(500).json({ error: 'Error retrieving price analytics' });
    }
  }

  static async recordInteraction(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { action } = req.body;

      await Neo4jService.recordUserInteraction(
        req.user!._id.toString(),
        id,
        action
      );

      res.json({ message: 'Interaction recorded successfully' });
    } catch (error) {
      console.error('Record interaction error:', error);
      res.status(500).json({ error: 'Error recording interaction' });
    }
  }
} 