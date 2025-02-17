import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoice extends Document {
  _id: mongoose.Types.ObjectId;
  order: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  invoiceNumber: string;
  items: Array<{
    product: mongoose.Types.ObjectId;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  paymentDetails: {
    method: 'credit_card' | 'debit_card' | 'transfer';
    transactionId: string;
    paymentDate?: Date;
    lastFourDigits?: string;
    receiptUrl?: string;
  };
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>({
  order: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  items: [{
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentDetails: {
    method: {
      type: String,
      enum: ['credit_card', 'debit_card', 'transfer'],
      required: true
    },
    transactionId: {
      type: String,
      required: true
    },
    paymentDate: Date,
    lastFourDigits: String,
    receiptUrl: String
  },
  billingAddress: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    }
  }
}, {
  timestamps: true
});

// Índices para búsquedas frecuentes
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ user: 1, createdAt: -1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ 'paymentDetails.transactionId': 1 });

// Método para generar número de factura
invoiceSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await mongoose.model('Invoice').countDocuments() + 1;
    this.invoiceNumber = `INV-${year}${month}-${String(count).padStart(6, '0')}`;
  }
  next();
});

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema); 