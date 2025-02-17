import { Response } from 'express';
import { AuthenticatedRequest } from '../types/common';
import { Invoice } from '../models/invoice.model';
import { Order } from '../models/order.model';
import { Neo4jService } from '../services/neo4j.service';
import { CassandraService } from '../services/cassandra.service';

export class InvoiceController {
  static async createInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId } = req.params;
      const userId = req.user!._id.toString();

      // Verificar si ya existe una factura para este pedido
      const existingInvoice = await Invoice.findOne({ order: orderId });
      if (existingInvoice) {
        res.status(400).json({ error: 'Invoice already exists for this order' });
        return;
      }

      // Obtener el pedido
      const order = await Order.findById(orderId)
        .populate('items.product')
        .populate('user');

      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      // Verificar que el usuario sea el dueño del pedido o un admin
      if (order.user.toString() !== userId && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }

      // Calcular subtotal, impuestos y total
      const subtotal = order.total;
      const tax = subtotal * 0.21; // 21% IVA
      const total = subtotal + tax;

      // Generar número de factura
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const count = await Invoice.countDocuments() + 1;
      const invoiceNumber = `INV-${year}${month}-${String(count).padStart(6, '0')}`;

      // Crear la factura
      const invoice = new Invoice({
        order: orderId,
        user: order.user,
        invoiceNumber,
        items: order.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity
        })),
        subtotal,
        tax,
        total,
        status: 'pending',
        paymentDetails: {
          method: order.paymentInfo.method,
          transactionId: order.paymentInfo.transactionId
        },
        billingAddress: order.shippingAddress
      });

      await invoice.save();

      // Registrar en Neo4j
      await Neo4jService.recordInvoiceCreation(
        userId,
        invoice._id.toString(),
        total
      );

      // Registrar en Cassandra para auditoría
      await CassandraService.recordInvoiceOperation({
        invoiceId: invoice._id.toString(),
        orderId: orderId,
        userId: userId,
        operation: 'CREATE',
        amount: total,
        timestamp: new Date(),
        status: 'pending'
      });

      res.status(201).json(invoice);
    } catch (error) {
      console.error('Create invoice error:', error);
      res.status(500).json({ error: 'Error creating invoice' });
    }
  }

  static async getInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();

      const invoice = await Invoice.findById(id)
        .populate('order')
        .populate('user')
        .populate('items.product');

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      // Verificar autorización
      if (invoice.user._id.toString() !== userId && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }

      res.json(invoice);
    } catch (error) {
      console.error('Get invoice error:', error);
      res.status(500).json({ error: 'Error retrieving invoice' });
    }
  }

  static async listInvoices(req: AuthenticatedRequest, res: Response) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const userId = req.user!._id.toString();
      const skip = (Number(page) - 1) * Number(limit);

      let query: any = {};

      // Regular users can only see their own invoices
      if (req.user!.role !== 'admin') {
        query.user = userId;
      }

      if (status) {
        query.status = status;
      }

      const [invoices, total] = await Promise.all([
        Invoice.find(query)
          .populate('order')
          .populate('user')
          .skip(skip)
          .limit(Number(limit))
          .sort({ createdAt: -1 }),
        Invoice.countDocuments(query)
      ]);

      res.json({
        data: invoices,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        hasMore: skip + invoices.length < total
      });
    } catch (error) {
      console.error('List invoices error:', error);
      res.status(500).json({ error: 'Error listing invoices' });
    }
  }

  static async updateInvoiceStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user!._id.toString();

      if (req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }

      const invoice = await Invoice.findById(id);
      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      // Actualizar estado
      invoice.status = status;
      if (status === 'paid') {
        invoice.paymentDetails.paymentDate = new Date();
      }
      await invoice.save();

      // Registrar en Cassandra para auditoría
      await CassandraService.recordInvoiceOperation({
        invoiceId: invoice._id.toString(),
        orderId: invoice.order.toString(),
        userId: userId,
        operation: 'UPDATE_STATUS',
        amount: invoice.total,
        timestamp: new Date(),
        status: status
      });

      res.json(invoice);
    } catch (error) {
      console.error('Update invoice status error:', error);
      res.status(500).json({ error: 'Error updating invoice status' });
    }
  }

  static async getInvoiceAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const query = {
        createdAt: {
          $gte: start,
          $lte: end
        }
      };

      const invoices = await Invoice.find(query);

      const analytics = {
        totalInvoices: invoices.length,
        totalAmount: invoices.reduce((sum, inv) => sum + inv.total, 0),
        averageAmount: invoices.length > 0 ? 
          invoices.reduce((sum, inv) => sum + inv.total, 0) / invoices.length : 0,
        byStatus: invoices.reduce((acc: any, inv) => {
          acc[inv.status] = (acc[inv.status] || 0) + 1;
          return acc;
        }, {}),
        byPaymentMethod: invoices.reduce((acc: any, inv) => {
          acc[inv.paymentDetails.method] = (acc[inv.paymentDetails.method] || 0) + 1;
          return acc;
        }, {}),
        period: { start, end }
      };

      res.json(analytics);
    } catch (error) {
      console.error('Get invoice analytics error:', error);
      res.status(500).json({ error: 'Error retrieving invoice analytics' });
    }
  }
} 