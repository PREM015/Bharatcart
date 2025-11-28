/**
 * Executive Dashboard
 * Purpose: High-level business metrics for executives
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, ShoppingCart, Users } from 'lucide-react';

export default function ExecutiveDashboard() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Executive Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value="$1,234,567"
          change="+12.5%"
          icon={DollarSign}
        />
        <MetricCard
          title="Total Orders"
          value="15,234"
          change="+8.2%"
          icon={ShoppingCart}
        />
        <MetricCard
          title="Active Customers"
          value="8,432"
          change="+15.3%"
          icon={Users}
        />
        <MetricCard
          title="Conversion Rate"
          value="3.24%"
          change="+0.4%"
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Chart component */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Product list */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, change, icon: Icon }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          <span className="text-green-600">{change}</span> from last month
        </p>
      </CardContent>
    </Card>
  );
}
