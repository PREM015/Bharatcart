/**
 * Multivariate Testing Engine
 * Purpose: Run multivariate tests with multiple variables
 * Description: MVT configuration, variant combinations, analysis
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface MVTVariable {
  id: string;
  name: string;
  type: 'text' | 'image' | 'layout' | 'color' | 'custom';
  variations: MVTVariation[];
}

export interface MVTVariation {
  id: string;
  name: string;
  value: any;
  is_control: boolean;
}

export interface MVTCombination {
  id: string;
  name: string;
  variables: Record<string, string>; // variable_id -> variation_id
  traffic_allocation: number;
}

export interface MVTExperiment {
  id: string;
  name: string;
  description: string;
  variables: MVTVariable[];
  combinations: MVTCombination[];
  test_type: 'full_factorial' | 'fractional_factorial' | 'taguchi';
  status: 'draft' | 'running' | 'completed';
  created_at: Date;
}

export class MultivariateTesting Engine {
  /**
   * Create MVT experiment
   */
  async createExperiment(
    name: string,
    description: string,
    variables: MVTVariable[],
    testType: 'full_factorial' | 'fractional_factorial' | 'taguchi' = 'full_factorial'
  ): Promise<MVTExperiment> {
    logger.info('Creating MVT experiment', { name, test_type: testType });

    // Generate combinations based on test type
    const combinations = this.generateCombinations(variables, testType);

    const experiment = await prisma.mvtExperiment.create({
      data: {
        name,
        description,
        variables: JSON.stringify(variables),
        combinations: JSON.stringify(combinations),
        test_type: testType,
        status: 'draft',
        created_at: new Date(),
      },
    });

    return {
      id: experiment.id,
      name: experiment.name,
      description: experiment.description,
      variables: JSON.parse(experiment.variables),
      combinations: JSON.parse(experiment.combinations),
      test_type: experiment.test_type as any,
      status: experiment.status as any,
      created_at: experiment.created_at,
    };
  }

  /**
   * Generate variant combinations
   */
  private generateCombinations(
    variables: MVTVariable[],
    testType: string
  ): MVTCombination[] {
    switch (testType) {
      case 'full_factorial':
        return this.generateFullFactorial(variables);
      case 'fractional_factorial':
        return this.generateFractionalFactorial(variables);
      case 'taguchi':
        return this.generateTaguchiArray(variables);
      default:
        return this.generateFullFactorial(variables);
    }
  }

  /**
   * Generate full factorial design (all combinations)
   */
  private generateFullFactorial(variables: MVTVariable[]): MVTCombination[] {
    const combinations: MVTCombination[] = [];

    // Calculate total combinations
    const totalCombinations = variables.reduce(
      (total, variable) => total * variable.variations.length,
      1
    );

    // Generate all combinations using cartesian product
    const variationArrays = variables.map(v => v.variations);
    const cartesianProduct = this.cartesianProduct(variationArrays);

    const trafficPerCombination = 100 / totalCombinations;

    cartesianProduct.forEach((combination, index) => {
      const variableMap: Record<string, string> = {};

      combination.forEach((variation, varIndex) => {
        variableMap[variables[varIndex].id] = variation.id;
      });

      combinations.push({
        id: `comb_${index}`,
        name: `Combination ${index + 1}`,
        variables: variableMap,
        traffic_allocation: trafficPerCombination,
      });
    });

    return combinations;
  }

  /**
   * Generate fractional factorial design (subset of combinations)
   */
  private generateFractionalFactorial(variables: MVTVariable[]): MVTCombination[] {
    // Use half fraction or quarter fraction based on variable count
    const fullCombinations = this.generateFullFactorial(variables);
    const fraction = variables.length > 4 ? 4 : 2;

    // Select every nth combination
    const fractionalCombinations = fullCombinations.filter(
      (_, index) => index % fraction === 0
    );

    // Recalculate traffic allocation
    const trafficPerCombination = 100 / fractionalCombinations.length;
    fractionalCombinations.forEach(combo => {
      combo.traffic_allocation = trafficPerCombination;
    });

    return fractionalCombinations;
  }

  /**
   * Generate Taguchi orthogonal array
   */
  private generateTaguchiArray(variables: MVTVariable[]): MVTCombination[] {
    // Simplified Taguchi L8 array for up to 7 2-level factors
    // This is a placeholder - real implementation would use proper orthogonal arrays

    const combinations: MVTCombination[] = [];
    const numTests = Math.min(8, Math.pow(2, variables.length));

    for (let i = 0; i < numTests; i++) {
      const variableMap: Record<string, string> = {};

      variables.forEach((variable, vIndex) => {
        // Use binary representation to select variation
        const variationIndex = (i >> vIndex) & 1;
        const variation =
          variable.variations[variationIndex % variable.variations.length];
        variableMap[variable.id] = variation.id;
      });

      combinations.push({
        id: `taguchi_${i}`,
        name: `Test ${i + 1}`,
        variables: variableMap,
        traffic_allocation: 100 / numTests,
      });
    }

    return combinations;
  }

  /**
   * Cartesian product helper
   */
  private cartesianProduct<T>(arrays: T[][]): T[][] {
    if (arrays.length === 0) return [[]];
    if (arrays.length === 1) return arrays[0].map(item => [item]);

    const [first, ...rest] = arrays;
    const restProduct = this.cartesianProduct(rest);

    return first.flatMap(item => restProduct.map(arr => [item, ...arr]));
  }

  /**
   * Assign user to combination
   */
  async assignCombination(
    experimentId: string,
    userId: string
  ): Promise<MVTCombination> {
    const experiment = await prisma.mvtExperiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    const combinations: MVTCombination[] = JSON.parse(experiment.combinations);

    // Use consistent hashing to assign combination
    const hash = this.hashUserId(userId);
    const bucket = (hash % 10000) / 100;

    let cumulativeAllocation = 0;
    for (const combination of combinations) {
      cumulativeAllocation += combination.traffic_allocation;
      if (bucket < cumulativeAllocation) {
        // Save assignment
        await prisma.mvtAssignment.create({
          data: {
            experiment_id: experimentId,
            user_id: userId,
            combination_id: combination.id,
            assigned_at: new Date(),
          },
        });

        return combination;
      }
    }

    return combinations[0];
  }

  /**
   * Hash user ID
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Analyze MVT results
   */
  async analyzeResults(experimentId: string): Promise<any> {
    logger.info('Analyzing MVT results', { experiment_id: experimentId });

    const experiment = await prisma.mvtExperiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    const variables: MVTVariable[] = JSON.parse(experiment.variables);
    const combinations: MVTCombination[] = JSON.parse(experiment.combinations);

    // Get performance data for each combination
    const results = await Promise.all(
      combinations.map(async combo => {
        const assignments = await prisma.mvtAssignment.count({
          where: {
            experiment_id: experimentId,
            combination_id: combo.id,
          },
        });

        // Get conversion data
        const conversions = 0; // Fetch from analytics

        return {
          combination_id: combo.id,
          combination_name: combo.name,
          users: assignments,
          conversions,
          conversion_rate: assignments > 0 ? conversions / assignments : 0,
        };
      })
    );

    // Calculate main effects for each variable
    const mainEffects = this.calculateMainEffects(variables, combinations, results);

    // Calculate interaction effects
    const interactionEffects = this.calculateInteractionEffects(
      variables,
      combinations,
      results
    );

    return {
      experiment_id: experimentId,
      combinations: results,
      main_effects: mainEffects,
      interaction_effects: interactionEffects,
    };
  }

  /**
   * Calculate main effects
   */
  private calculateMainEffects(
    variables: MVTVariable[],
    combinations: MVTCombination[],
    results: any[]
  ): any[] {
    return variables.map(variable => {
      const effects = variable.variations.map(variation => {
        // Find all combinations with this variation
        const relevantResults = results.filter(result => {
          const combo = combinations.find(c => c.id === result.combination_id);
          return combo?.variables[variable.id] === variation.id;
        });

        const avgConversionRate =
          relevantResults.reduce((sum, r) => sum + r.conversion_rate, 0) /
          (relevantResults.length || 1);

        return {
          variation_id: variation.id,
          variation_name: variation.name,
          average_conversion_rate: avgConversionRate,
        };
      });

      return {
        variable_id: variable.id,
        variable_name: variable.name,
        effects,
      };
    });
  }

  /**
   * Calculate interaction effects
   */
  private calculateInteractionEffects(
    variables: MVTVariable[],
    combinations: MVTCombination[],
    results: any[]
  ): any[] {
    const interactions: any[] = [];

    // Calculate pairwise interactions
    for (let i = 0; i < variables.length; i++) {
      for (let j = i + 1; j < variables.length; j++) {
        const var1 = variables[i];
        const var2 = variables[j];

        interactions.push({
          variable_1: var1.name,
          variable_2: var2.name,
          interaction_strength: 0, // Calculate based on ANOVA
        });
      }
    }

    return interactions;
  }
}

export default MultivariateTestingEngine;
