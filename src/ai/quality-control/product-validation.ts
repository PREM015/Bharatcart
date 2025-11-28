/**
 * Product Validation
 * Purpose: Validate product data completeness and quality
 */

export class ProductValidator {
  async validate(product: any): Promise<{
    valid: boolean;
    score: number;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];

    if (!product.name || product.name.length < 10) {
      issues.push('Product name too short');
    }

    if (!product.description || product.description.length < 50) {
      issues.push('Description too short');
    }

    if (!product.images || product.images.length === 0) {
      issues.push('No product images');
    }

    return {
      valid: issues.length === 0,
      score: Math.max(0, 100 - issues.length * 20),
      issues,
      suggestions: ['Add more product images', 'Improve description'],
    };
  }
}

export default ProductValidator;
