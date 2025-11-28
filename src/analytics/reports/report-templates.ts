/**
 * Report Templates
 * Purpose: Pre-built report templates
 */

export const ReportTemplates = {
  dailySalesSummary: {
    name: 'Daily Sales Summary',
    metrics: ['revenue', 'orders', 'aov', 'conversion_rate'],
    groupBy: 'day',
  },

  weeklySalesByCategory: {
    name: 'Weekly Sales by Category',
    metrics: ['revenue', 'units_sold'],
    groupBy: 'category',
    period: 'week',
  },

  monthlyCustomerReport: {
    name: 'Monthly Customer Report',
    metrics: ['new_customers', 'retention_rate', 'churn_rate', 'ltv'],
    period: 'month',
  },

  productPerformance: {
    name: 'Product Performance',
    metrics: ['views', 'cart_adds', 'purchases', 'revenue'],
    groupBy: 'product',
  },
};

export default ReportTemplates;
