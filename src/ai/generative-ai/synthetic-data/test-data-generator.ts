/**
 * Test Data Generator
 * Purpose: Generate realistic test data for development
 * Features:
 * - User profiles
 * - Product catalogs
 * - Order histories
 * - Reviews and ratings
 */

import { faker } from '@faker-js/faker';
import { logger } from '@/lib/logger';
import OpenAI from 'openai';

export class TestDataGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate user profiles
   */
  generateUsers(count: number): any[] {
    logger.info('Generating test users', { count });

    return Array.from({ length: count }, () => ({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zip: faker.location.zipCode(),
        country: faker.location.country(),
      },
      dateOfBirth: faker.date.birthdate(),
      createdAt: faker.date.past(),
    }));
  }

  /**
   * Generate products with AI descriptions
   */
  async generateProducts(count: number, category: string): Promise<any[]> {
    logger.info('Generating test products', { count, category });

    const products = [];

    for (let i = 0; i < count; i++) {
      const name = faker.commerce.productName();
      
      // Generate description with AI
      const description = await this.generateProductDescription(name, category);

      products.push({
        name,
        category,
        description,
        price: parseFloat(faker.commerce.price()),
        sku: faker.string.alphanumeric(10).toUpperCase(),
        inStock: faker.datatype.boolean(),
        quantity: faker.number.int({ min: 0, max: 100 }),
        images: Array.from({ length: 3 }, () => faker.image.url()),
        createdAt: faker.date.past(),
      });
    }

    return products;
  }

  /**
   * Generate product description
   */
  private async generateProductDescription(name: string, category: string): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: `Write a brief product description (2-3 sentences) for: ${name} in category ${category}`,
        },
      ],
      max_tokens: 100,
    });

    return completion.choices[0].message.content || '';
  }

  /**
   * Generate orders
   */
  generateOrders(userIds: number[], productIds: number[], count: number): any[] {
    logger.info('Generating test orders', { count });

    return Array.from({ length: count }, () => {
      const itemCount = faker.number.int({ min: 1, max: 5 });

      return {
        userId: faker.helpers.arrayElement(userIds),
        status: faker.helpers.arrayElement(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
        items: Array.from({ length: itemCount }, () => ({
          productId: faker.helpers.arrayElement(productIds),
          quantity: faker.number.int({ min: 1, max: 3 }),
          price: parseFloat(faker.commerce.price()),
        })),
        total: parseFloat(faker.commerce.price({ min: 50, max: 500 })),
        shippingAddress: {
          street: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state(),
          zip: faker.location.zipCode(),
        },
        createdAt: faker.date.past(),
      };
    });
  }

  /**
   * Generate reviews
   */
  async generateReviews(productIds: number[], count: number): Promise<any[]> {
    logger.info('Generating test reviews', { count });

    const reviews = [];

    for (let i = 0; i < count; i++) {
      const rating = faker.number.int({ min: 1, max: 5 });
      const productId = faker.helpers.arrayElement(productIds);

      // Generate realistic review text
      const reviewText = await this.generateReviewText(rating);

      reviews.push({
        productId,
        userId: faker.number.int({ min: 1, max: 100 }),
        rating,
        title: faker.lorem.sentence(),
        text: reviewText,
        verified: faker.datatype.boolean(),
        helpful: faker.number.int({ min: 0, max: 50 }),
        createdAt: faker.date.past(),
      });
    }

    return reviews;
  }

  /**
   * Generate review text
   */
  private async generateReviewText(rating: number): Promise<string> {
    const sentiment = rating >= 4 ? 'positive' : rating === 3 ? 'neutral' : 'negative';

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: `Write a ${sentiment} product review (2-3 sentences) with ${rating} stars.`,
        },
      ],
      max_tokens: 100,
    });

    return completion.choices[0].message.content || '';
  }

  /**
   * Generate complete dataset
   */
  async generateCompleteDataset(): Promise<any> {
    logger.info('Generating complete test dataset');

    const users = this.generateUsers(50);
    const products = await this.generateProducts(100, 'Electronics');
    const orders = this.generateOrders(
      users.map((_, i) => i + 1),
      products.map((_, i) => i + 1),
      200
    );
    const reviews = await this.generateReviews(
      products.map((_, i) => i + 1),
      300
    );

    return {
      users,
      products,
      orders,
      reviews,
    };
  }
}

export default TestDataGenerator;
