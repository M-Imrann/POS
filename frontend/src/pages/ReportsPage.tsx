import { useState, useMemo } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";
import { useProducts } from "@/context/ProductContext";

const COLORS = [
  "hsl(168, 80%, 36%)",
  "hsl(220, 70%, 55%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(280, 60%, 55%)",
];

function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map((row) => headers.map((h) => row[h]).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("sales");
  const { sales, products, loading } = useProducts();

  const monthlySales = useMemo(() => {
    const map = new Map<string, { sales: number; orders: number }>();
    sales.forEach((s) => {
      const month = new Date(s.date).toLocaleString("en-US", { month: "short" });
      const existing = map.get(month) || { sales: 0, orders: 0 };
      existing.sales += s.total;
      existing.orders += 1;
      map.set(month, existing);
    });
    return Array.from(map.entries()).map(([month, data]) => ({ month, ...data }));
  }, [sales]);

  const monthlyPnL = useMemo(() => {
    const map = new Map<string, { revenue: number; cost: number; profit: number }>();
    sales.forEach((s) => {
      const month = new Date(s.date).toLocaleString("en-US", { month: "short" });
      const existing = map.get(month) || { revenue: 0, cost: 0, profit: 0 };
      const saleCost = s.items.reduce((sum, item) => {
        const prod = products.find((p) => p.id === item.product.id);
        return sum + (prod?.cost || 0) * item.quantity;
      }, 0);
      existing.revenue += s.total;
      existing.cost += saleCost;
      existing.profit += s.total - saleCost;
      map.set(month, existing);
    });
    return Array.from(map.entries()).map(([month, data]) => ({ month, ...data }));
  }, [sales, products]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((s) => {
      s.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.product.id);
        const sub = prod?.subcategory || "Other";
        map.set(sub, (map.get(sub) || 0) + item.product.price * item.quantity);
      });
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [sales, products]);

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalOrders = sales.length;
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalCost = monthlyPnL.reduce((sum, m) => sum + m.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">Sales analytics and insights</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="sales">Sales Report</TabsTrigger>
            <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              if (activeTab === "sales") {
                downloadCSV(monthlySales as Record<string, unknown>[], "sales-report");
              } else {
                downloadCSV(monthlyPnL as Record<string, unknown>[], "profit-loss-report");
              }
            }}
          >
            <Download className="w-4 h-4" />
            Download Report
          </Button>
        </div>

        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground">Total Sales</p>
              <p className="text-xl md:text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground">Total Orders</p>
              <p className="text-xl md:text-2xl font-bold">{totalOrders}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground">Avg. Order</p>
              <p className="text-xl md:text-2xl font-bold">${avgOrder.toFixed(2)}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground">Products Sold</p>
              <p className="text-xl md:text-2xl font-bold">{sales.reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.quantity, 0), 0)}</p>
            </div>
          </div>

          {monthlySales.length > 0 && (
            <div className="glass-card p-4 md:p-6">
              <h3 className="font-semibold mb-4">Monthly Sales</h3>
              <div className="h-[250px] md:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlySales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(222, 47%, 11%)", border: "none", borderRadius: "8px", color: "#fff" }} />
                    <Bar dataKey="sales" fill="hsl(168, 80%, 36%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {categoryBreakdown.length > 0 && (
            <div className="glass-card p-4 md:p-6">
              <h3 className="font-semibold mb-4">Sales by Subcategory</h3>
              <div className="h-[250px] md:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryBreakdown} cx="50%" cy="50%" outerRadius="70%" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>
                      {categoryBreakdown.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {sales.length === 0 && (
            <div className="glass-card p-8 text-center text-muted-foreground">
              <p>No sales data yet. Complete a sale in POS to see reports.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pnl" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-xl md:text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="text-xl md:text-2xl font-bold text-destructive">${totalCost.toFixed(2)}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground">Net Profit</p>
              <p className="text-xl md:text-2xl font-bold text-success">${totalProfit.toFixed(2)}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground">Margin</p>
              <p className="text-xl md:text-2xl font-bold">{margin.toFixed(1)}%</p>
            </div>
          </div>

          {monthlyPnL.length > 0 && (
            <>
              <div className="glass-card p-4 md:p-6">
                <h3 className="font-semibold mb-4">Revenue, Cost & Profit Trend</h3>
                <div className="h-[250px] md:h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyPnL}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(222, 47%, 11%)", border: "none", borderRadius: "8px", color: "#fff" }} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(168, 80%, 36%)" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="cost" stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="profit" stroke="hsl(220, 70%, 55%)" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border/50">
                  <h3 className="font-semibold">Monthly Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[400px]">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">Month</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Revenue</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Cost</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Profit</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyPnL.map((row) => (
                        <tr key={row.month} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-medium">{row.month}</td>
                          <td className="p-3 text-right">${row.revenue.toFixed(2)}</td>
                          <td className="p-3 text-right text-destructive">${row.cost.toFixed(2)}</td>
                          <td className="p-3 text-right text-success">${row.profit.toFixed(2)}</td>
                          <td className="p-3 text-right">{row.revenue > 0 ? ((row.profit / row.revenue) * 100).toFixed(1) : 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {sales.length === 0 && (
            <div className="glass-card p-8 text-center text-muted-foreground">
              <p>No sales data yet. Complete a sale in POS to see P&L reports.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
