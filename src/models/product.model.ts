import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  images: string[];
  specifications: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  images: [{
    type: String,
    required: true,
  }],
  specifications: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Index for faster searches
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });

export const Product = mongoose.model<IProduct>('Product', productSchema); 