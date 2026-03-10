import {
  Package,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useProducts } from "@/context/ProductContext";

export default function DashboardPage() {
  const { products, sales, loading } = useProducts();

  const lowStockProducts = products.filter((p) => p.stock <= p.lowStockThreshold);
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const stats = [
    {
      label: "Total Products",
      value: totalProducts,
      icon: Package,
      change: `${totalProducts} registered`,
      trend: "up" as const,
      accent: "bg-primary/10 text-primary",
    },
    {
      label: "Total Revenue",
      value: `$${totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      change: `${sales.length} sales`,
      trend: "up" as const,
      accent: "bg-success/10 text-success",
    },
    {
      label: "Total Stock",
      value: totalStock,
      icon: ShoppingCart,
      change: "units in inventory",
      trend: totalStock > 100 ? "up" as const : "down" as const,
      accent: "bg-warning/10 text-warning",
    },
    {
      label: "Low Stock Alerts",
      value: lowStockProducts.length,
      icon: AlertTriangle,
      change: lowStockProducts.length > 0 ? "Needs attention" : "All good",
      trend: lowStockProducts.length > 0 ? "down" as const : "up" as const,
      accent: "bg-destructive/10 text-destructive",
    },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's your store overview.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${stat.accent}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              {stat.trend === "up" ? (
                <TrendingUp className="w-4 h-4 text-success" />
              ) : (
                <TrendingDown className="w-4 h-4 text-destructive" />
              )}
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h2 className="font-semibold text-lg mb-4">Recent Sales</h2>
          <div className="space-y-3">
            {sales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No sales yet</p>
            ) : (
              sales.slice(0, 5).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{sale.saleNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sale.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">${sale.total.toFixed(2)}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {sale.paymentMode}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Low Stock Alerts
          </h2>
          <div className="space-y-3">
            {lowStockProducts.length === 0 ? (
              <p className="text-muted-foreground text-sm">All products are well stocked!</p>
            ) : (
              lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.subcategory}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-destructive">{product.stock} left</p>
                    <p className="text-xs text-muted-foreground">Min: {product.lowStockThreshold}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
