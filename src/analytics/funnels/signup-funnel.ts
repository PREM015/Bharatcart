/**
 * Signup Funnel
 * Purpose: Analyze user registration funnel
 */

import { FunnelAnalyzer } from './funnel-analyzer';

export class SignupFunnel {
  private analyzer = new FunnelAnalyzer();

  async analyze(startDate: Date, endDate: Date) {
    const steps = [
      'view_signup_page',
      'start_signup',
      'verify_email',
      'complete_profile',
    ];

    return this.analyzer.analyze(steps, startDate, endDate);
  }
}

export default SignupFunnel;
