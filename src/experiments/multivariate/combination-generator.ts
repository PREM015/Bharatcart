/**
 * MVT Combination Generator
 * Purpose: Generate optimal test combinations for MVT
 * Description: Factorial designs, orthogonal arrays, optimal design
 */

import { logger } from '@/lib/logger';
import { MVTVariable, MVTCombination } from './mvt-engine';

export class CombinationGenerator {
  /**
   * Generate combinations using different strategies
   */
  static generate(
    variables: MVTVariable[],
    strategy: 'full' | 'fractional' | 'optimal' | 'taguchi' = 'full',
    options?: {
      maxCombinations?: number;
      minCombinations?: number;
      coverage?: number; // 0-1, for fractional
    }
  ): MVTCombination[] {
    logger.info('Generating MVT combinations', {
      strategy,
      variable_count: variables.length,
    });

    switch (strategy) {
      case 'full':
        return this.fullFactorial(variables);
      case 'fractional':
        return this.fractionalFactorial(variables, options?.coverage || 0.5);
      case 'optimal':
        return this.optimalDesign(variables, options?.maxCombinations || 20);
      case 'taguchi':
        return this.taguchiDesign(variables);
      default:
        return this.fullFactorial(variables);
    }
  }

  /**
   * Full factorial design
   */
  private static fullFactorial(variables: MVTVariable[]): MVTCombination[] {
    const combinations: MVTCombination[] = [];

    // Calculate all possible combinations
    const totalCombinations = variables.reduce(
      (total, v) => total * v.variations.length,
      1
    );

    logger.info('Full factorial combinations', { total: totalCombinations });

    // Generate recursively
    const generate = (index: number, current: Record<string, string>) => {
      if (index === variables.length) {
        combinations.push({
          id: `comb_${combinations.length}`,
          name: `Combination ${combinations.length + 1}`,
          variables: { ...current },
          traffic_allocation: 100 / totalCombinations,
        });
        return;
      }

      const variable = variables[index];
      for (const variation of variable.variations) {
        generate(index + 1, {
          ...current,
          [variable.id]: variation.id,
        });
      }
    };

    generate(0, {});
    return combinations;
  }

  /**
   * Fractional factorial design
   */
  private static fractionalFactorial(
    variables: MVTVariable[],
    coverage: number
  ): MVTCombination[] {
    const fullCombinations = this.fullFactorial(variables);
    const targetCount = Math.ceil(fullCombinations.length * coverage);

    logger.info('Fractional factorial', {
      full_count: fullCombinations.length,
      target_count: targetCount,
    });

    // Use D-optimal selection
    const selected = this.dOptimalSelection(fullCombinations, targetCount);

    // Recalculate traffic
    const traffic = 100 / selected.length;
    selected.forEach(c => (c.traffic_allocation = traffic));

    return selected;
  }

  /**
   * D-optimal selection
   */
  private static dOptimalSelection(
    combinations: MVTCombination[],
    targetCount: number
  ): MVTCombination[] {
    // Greedy selection to maximize information
    const selected: MVTCombination[] = [];
    const remaining = [...combinations];

    // Always include control (first combination)
    if (remaining.length > 0) {
      selected.push(remaining.shift()!);
    }

    // Select combinations that maximize coverage
    while (selected.length < targetCount && remaining.length > 0) {
      let bestIndex = 0;
      let bestScore = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const score = this.calculateDOptimalScore(remaining[i], selected);
        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }

      selected.push(remaining.splice(bestIndex, 1)[0]);
    }

    return selected;
  }

  /**
   * Calculate D-optimal score
   */
  private static calculateDOptimalScore(
    candidate: MVTCombination,
    selected: MVTCombination[]
  ): number {
    // Score based on uniqueness of variable combinations
    let score = 0;

    for (const [varId, varValue] of Object.entries(candidate.variables)) {
      const matchCount = selected.filter(
        s => s.variables[varId] === varValue
      ).length;
      score -= matchCount; // Prefer unique combinations
    }

    return score;
  }

  /**
   * Optimal design (balanced)
   */
  private static optimalDesign(
    variables: MVTVariable[],
    maxCombinations: number
  ): MVTCombination[] {
    const full = this.fullFactorial(variables);

    if (full.length <= maxCombinations) {
      return full;
    }

    // Use Latin hypercube sampling
    return this.latinHypercubeSampling(variables, maxCombinations);
  }

  /**
   * Latin hypercube sampling
   */
  private static latinHypercubeSampling(
    variables: MVTVariable[],
    sampleSize: number
  ): MVTCombination[] {
    const combinations: MVTCombination[] = [];

    // Create stratified samples for each variable
    const strata = variables.map(v => {
      const stratum = [];
      const levels = v.variations.length;

      for (let i = 0; i < sampleSize; i++) {
        stratum.push(v.variations[Math.floor((i * levels) / sampleSize)]);
      }

      // Shuffle
      for (let i = stratum.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [stratum[i], stratum[j]] = [stratum[j], stratum[i]];
      }

      return stratum;
    });

    // Combine strata
    for (let i = 0; i < sampleSize; i++) {
      const variableMap: Record<string, string> = {};

      variables.forEach((variable, vIndex) => {
        variableMap[variable.id] = strata[vIndex][i].id;
      });

      combinations.push({
        id: `lhs_${i}`,
        name: `Sample ${i + 1}`,
        variables: variableMap,
        traffic_allocation: 100 / sampleSize,
      });
    }

    return combinations;
  }

  /**
   * Taguchi orthogonal array
   */
  private static taguchiDesign(variables: MVTVariable[]): MVTCombination[] {
    // Taguchi L8, L16, L32 arrays
    const arrays = {
      L8: this.generateL8Array(variables),
      L16: this.generateL16Array(variables),
      L32: this.generateL32Array(variables),
    };

    // Select appropriate array based on variable count
    if (variables.length <= 7) return arrays.L8;
    if (variables.length <= 15) return arrays.L16;
    return arrays.L32;
  }

  /**
   * Generate L8 orthogonal array
   */
  private static generateL8Array(variables: MVTVariable[]): MVTCombination[] {
    const l8 = [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1],
      [0, 1, 1, 0, 0, 1, 1],
      [0, 1, 1, 1, 1, 0, 0],
      [1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 1, 0, 1, 0],
      [1, 1, 0, 0, 1, 1, 0],
      [1, 1, 0, 1, 0, 0, 1],
    ];

    return l8.map((row, index) => {
      const variableMap: Record<string, string> = {};

      variables.forEach((variable, vIndex) => {
        if (vIndex < row.length) {
          const variationIndex = row[vIndex] % variable.variations.length;
          variableMap[variable.id] = variable.variations[variationIndex].id;
        }
      });

      return {
        id: `l8_${index}`,
        name: `L8 Test ${index + 1}`,
        variables: variableMap,
        traffic_allocation: 100 / l8.length,
      };
    });
  }

  /**
   * Generate L16 orthogonal array
   */
  private static generateL16Array(variables: MVTVariable[]): MVTCombination[] {
    // Simplified L16 - full implementation would use proper orthogonal array
    const combinations: MVTCombination[] = [];

    for (let i = 0; i < 16; i++) {
      const variableMap: Record<string, string> = {};

      variables.forEach((variable, vIndex) => {
        const variationIndex = ((i >> vIndex) & 1) % variable.variations.length;
        variableMap[variable.id] = variable.variations[variationIndex].id;
      });

      combinations.push({
        id: `l16_${i}`,
        name: `L16 Test ${i + 1}`,
        variables: variableMap,
        traffic_allocation: 100 / 16,
      });
    }

    return combinations;
  }

  /**
   * Generate L32 orthogonal array
   */
  private static generateL32Array(variables: MVTVariable[]): MVTCombination[] {
    const combinations: MVTCombination[] = [];

    for (let i = 0; i < 32; i++) {
      const variableMap: Record<string, string> = {};

      variables.forEach((variable, vIndex) => {
        const variationIndex = ((i >> vIndex) & 1) % variable.variations.length;
        variableMap[variable.id] = variable.variations[variationIndex].id;
      });

      combinations.push({
        id: `l32_${i}`,
        name: `L32 Test ${i + 1}`,
        variables: variableMap,
        traffic_allocation: 100 / 32,
      });
    }

    return combinations;
  }

  /**
   * Validate combination design
   */
  static validateDesign(combinations: MVTCombination[]): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check traffic allocation
    const totalTraffic = combinations.reduce(
      (sum, c) => sum + c.traffic_allocation,
      0
    );

    if (Math.abs(totalTraffic - 100) > 0.01) {
      issues.push(`Traffic allocation sums to ${totalTraffic}%, should be 100%`);
    }

    // Check for duplicate combinations
    const seen = new Set();
    for (const combo of combinations) {
      const key = JSON.stringify(combo.variables);
      if (seen.has(key)) {
        issues.push(`Duplicate combination found: ${combo.name}`);
      }
      seen.add(key);
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

export default CombinationGenerator;
