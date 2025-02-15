import { Request, Response } from 'express';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { User, IUser } from '../models/user.model';
import { Neo4jService } from '../services/neo4j.service';
import { RedisService } from '../services/redis.service';
import config from '../config/config';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({ error: 'Email already registered' });
        return;
      }

      const user = new User({
        email,
        password,
        firstName,
        lastName,
        role: role || 'user',
      });
      await user.save();

      await Neo4jService.createUserNode(user._id.toString(), {
        email,
        firstName,
        lastName,
        role: user.role,
      });

      const token = jwt.sign(
        { userId: user._id },
        config.jwt.secret as Secret,
        { expiresIn: config.jwt.expiresIn } as SignOptions
      );

      await RedisService.setSession(user._id.toString(), {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        loginTime: new Date()
      });

      res.status(201).json({
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          category: user.category,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Error registering user' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }) as IUser | null;
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      try {
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
          res.status(401).json({ error: 'Invalid credentials' });
          return;
        }
      } catch (passwordError) {
        console.error('Password comparison error:', passwordError);
        res.status(500).json({ error: 'Error verifying credentials' });
        return;
      }

      const token = jwt.sign(
        { userId: user._id },
        config.jwt.secret as Secret,
        { expiresIn: config.jwt.expiresIn } as SignOptions
      );

      try {
        await RedisService.setSession(user._id.toString(), {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          loginTime: new Date()
        });
      } catch (sessionError) {
        console.error('Redis session error:', sessionError);
        // Continue with login even if session creation fails
      }

      // Update user category
      let newCategory: string;
      try {
        // Update category - this will create the user node if it doesn't exist
        newCategory = await Neo4jService.updateUserCategory(user._id.toString());
        user.category = newCategory as 'TOP' | 'MEDIUM' | 'LOW';
        await user.save();
      } catch (neo4jError) {
        console.error('Neo4j error:', neo4jError);
        // Don't fail the login if Neo4j operations fail
        newCategory = user.category || 'LOW';
      }

      res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          category: newCategory || 'LOW',
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Error logging in' });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };

      await RedisService.removeSession(decoded.userId);

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Error logging out' });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };

      const user = await User.findById(decoded.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const recommendedProducts = await Neo4jService.getProductRecommendations(decoded.userId);
      const similarUsers = await Neo4jService.findSimilarUsers(decoded.userId);

      res.json({
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          category: user.category,
        },
        recommendations: {
          products: recommendedProducts,
          similarUsers,
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Error getting profile' });
    }
  }
} 