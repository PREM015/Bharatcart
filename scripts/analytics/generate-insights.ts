/**
 * Generate Analytics Insights
 * Purpose: Creates business intelligence reports from analytics data
 * Description: Aggregates data and generates dashboards
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';

const prisma = new PrismaClient();

async function generateInsights() {
  console.log('🔄 Generating analytics insights...');

  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

  // Top products
  const topProducts = await prisma.orderItem.groupBy({
    by: ['productId'],
    _sum: { quantity: true, price: true },
    where: { order: { createdAt: { gte: startDate } } },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 10,
  });

  // User acquisition
  const userAcquisition = await prisma.user.groupBy({
    by: ['createdAt'],
    _count: true,
    where: { createdAt: { gte: startDate } },
  });

  // Revenue by day
  const revenueByDay = await prisma.order.groupBy({
    by: ['createdAt'],
    _sum: { total: true },
    where: { createdAt: { gte: startDate } },
  });

  // Conversion funnel
  const totalVisitors = await prisma.session.count({
    where: { createdAt: { gte: startDate } },
  });

  const cartAdded = await prisma.cartItem.count({
    where: { createdAt: { gte: startDate } },
  });

  const checkoutStarted = await prisma.order.count({
    where: { createdAt: { gte: startDate }, status: 'pending' },
  });

  const ordersCompleted = await prisma.order.count({
    where: { createdAt: { gte: startDate }, status: 'completed' },
  });

  const insights = {
    period: { start: startDate, end: new Date() },
    topProducts,
    userAcquisition,
    revenueByDay,
    conversionFunnel: {
      visitors: totalVisitors,
      cartAdded,
      checkoutStarted,
      ordersCompleted,
      conversionRate: (ordersCompleted / totalVisitors) * 100,
    },
  };

  // Save to file
  writeFileSync(
    `./insights-${new Date().toISOString().split('T')[0]}.json`,
    JSON.stringify(insights, null, 2)
  );

  console.log('✅ Insights generated successfully!');
  console.log(`📊 Conversion Rate: ${insights.conversionFunnel.conversionRate.toFixed(2)}%`);
}

generateInsights()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
