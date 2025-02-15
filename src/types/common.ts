import { Request } from 'express';
import { IUser } from '../models/user.model';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceHistory {
  productId: string;
  timestamp: Date;
  price: number;
  currency: string;
}

export interface ProductChange {
  productId: string;
  changeType: 'create' | 'update' | 'delete';
  oldValue: string;
  newValue: string;
  timestamp: Date;
} 