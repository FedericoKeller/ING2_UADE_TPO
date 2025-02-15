import { neo4jDriver } from '../config/database';
import { Session } from 'neo4j-driver';

export class Neo4jService {
  private static async getSession(): Promise<Session> {
    return neo4jDriver.session();
  }

  // User Node Management
  static async createUserNode(userId: string, data: any): Promise<void> {
    const session = await this.getSession();
    try {
      await session.run(
        `CREATE (u:User {
          userId: $userId,
          email: $email,
          firstName: $firstName,
          lastName: $lastName,
          category: $category,
          createdAt: datetime()
        })`,
        {
          userId,
          ...data,
          category: 'LOW'
        }
      );
    } finally {
      await session.close();
    }
  }

  // User Interaction Management
  static async recordUserInteraction(userId: string, productId: string, action: string): Promise<void> {
    const session = await this.getSession();
    try {
      await session.run(
        `MATCH (u:User {userId: $userId})
         MERGE (p:Product {productId: $productId})
         CREATE (u)-[r:INTERACTED {
           action: $action,
           timestamp: datetime()
         }]->(p)`,
        { userId, productId, action }
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Updates and returns the user's category based on their interactions and orders.
   * Categories are determined by the following criteria:
   * - TOP: ≥ 10 orders OR ≥ 50 interactions
   * - MEDIUM: ≥ 5 orders OR ≥ 25 interactions
   * - LOW: Default category for new or less active users
   * 
   * @param userId - The unique identifier of the user
   * @returns Promise<'TOP' | 'MEDIUM' | 'LOW'> - The updated user category
   * @throws Error if the database operation fails
   */
  static async updateUserCategory(userId: string): Promise<'TOP' | 'MEDIUM' | 'LOW'> {
    const session = await this.getSession();
    try {
      const result = await session.run(`
        MERGE (u:User {userId: $userId})
        ON CREATE SET 
          u.category = 'LOW',
          u.createdAt = datetime()
        WITH u
        OPTIONAL MATCH (u)-[r:INTERACTED]->(p:Product)
        WITH u, count(r) as interactions
        OPTIONAL MATCH (u)-[o:PLACED_ORDER]->(:Order)
        WITH u, interactions, count(o) as orders
        WITH u, interactions, orders,
        CASE
          WHEN orders >= 10 OR interactions >= 50 THEN 'TOP'
          WHEN orders >= 5 OR interactions >= 25 THEN 'MEDIUM'
          ELSE 'LOW'
        END as newCategory
        SET u.category = newCategory,
            u.lastUpdated = datetime()
        RETURN newCategory as category
      `, { userId });

      // Extract category from result, defaulting to 'LOW' if no result
      const category = result.records?.[0]?.get('category') as 'TOP' | 'MEDIUM' | 'LOW' || 'LOW';

      // Log category update for monitoring
      console.log(`User ${userId} category updated to: ${category}`);

      return category;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      console.error(`Error updating category for user ${userId}:`, errorMessage);
      throw new Error(`Failed to update user category: ${errorMessage}`);
    } finally {
      await session.close();
    }
  }

  // Product Recommendations
  static async getProductRecommendations(userId: string, limit: number = 5): Promise<string[]> {
    const session = await this.getSession();
    try {
      const result = await session.run(
        `MATCH (u:User {userId: $userId})-[r1:INTERACTED]->(p:Product)
         MATCH (p)<-[r2:INTERACTED]-(otherUser:User)
         MATCH (otherUser)-[r3:INTERACTED]->(recommendedProduct:Product)
         WHERE NOT (u)-[:INTERACTED]->(recommendedProduct)
         WITH recommendedProduct, count(DISTINCT otherUser) as commonUsers
         ORDER BY commonUsers DESC
         LIMIT $limit
         RETURN recommendedProduct.productId as productId`,
        { userId, limit }
      );

      return result.records.map(record => record.get('productId'));
    } finally {
      await session.close();
    }
  }

  // User Similarity Network
  static async findSimilarUsers(userId: string, limit: number = 5): Promise<string[]> {
    const session = await this.getSession();
    try {
      const result = await session.run(
        `MATCH (u1:User {userId: $userId})-[r1:INTERACTED]->(p:Product)
         MATCH (p)<-[r2:INTERACTED]-(u2:User)
         WHERE u1 <> u2
         WITH u2, count(DISTINCT p) as commonInteractions
         ORDER BY commonInteractions DESC
         LIMIT $limit
         RETURN u2.userId as similarUserId`,
        { userId, limit }
      );

      return result.records.map(record => record.get('similarUserId'));
    } finally {
      await session.close();
    }
  }

  // Order Tracking
  static async recordOrder(userId: string, orderId: string, total: number): Promise<void> {
    const session = await this.getSession();
    try {
      await session.run(
        `MATCH (u:User {userId: $userId})
         CREATE (o:Order {
           orderId: $orderId,
           total: $total,
           timestamp: datetime()
         })
         CREATE (u)-[r:PLACED_ORDER]->(o)`,
        { userId, orderId, total }
      );
    } finally {
      await session.close();
    }
  }
} 