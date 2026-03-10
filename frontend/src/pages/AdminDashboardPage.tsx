import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { admin as adminApi, users as usersApi, type AuthUser } from "@/lib/api";
import { Package, ShoppingCart, TrendingUp } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboardPage() {
  const { isAdmin } = useAuth();
  const [userList, setUserList] = useState<AuthUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [stockEntries, setStockEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    usersApi.list().then(({ users }) => setUserList(users)).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    const userId = selectedUserId !== "all" ? selectedUserId : undefined;
    adminApi.getData(userId).then(({ products: p, sales: s, stockEntries: se }) => {
      setProducts(p);
      setSales(s);
      setStockEntries(se);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isAdmin, selectedUserId]);

  const getUserLabel = (userId: string | null) => {
    const u = userList.find((u) => u.id === userId);
    return u ? (u.full_name || u.email) : "Unknown";
  };

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const lowStockCount = products.filter((p) => p.stock <= p.low_stock_threshold).length;

  if (!isAdmin) return <div className="p-6 text-muted-foreground">Admin access required.</div>;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">View and manage all users' data</p>
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {userList.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name || u.email}{u.company_name ? ` (${u.company_name})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Products", value: products.length, icon: Package, color: "primary" },
          { label: "Sales", value: sales.length, icon: ShoppingCart, color: "primary" },
          { label: "Revenue", value: `Rs. ${totalRevenue.toFixed(0)}`, icon: TrendingUp, color: "primary" },
          { label: "Low Stock", value: lowStockCount, icon: Package, color: "destructive" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${color}/10`}><Icon className={`w-5 h-5 text-${color}`} /></div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <div className="space-y-6">
          {/* Products Table */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border/50">
              <h2 className="font-semibold flex items-center gap-2"><Package className="w-4 h-4" /> Products ({products.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Owner</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Stock</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Price</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {products.slice(0, 20).map((p) => (
                    <tr key={p.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="p-3"><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.category} / {p.subcategory}</p></td>
                      <td className="p-3 text-muted-foreground text-xs">{getUserLabel(p.user_id)}</td>
                      <td className="p-3 text-center"><Badge variant={p.stock <= p.low_stock_threshold ? "destructive" : "secondary"}>{p.stock}</Badge></td>
                      <td className="p-3 text-right">Rs. {Number(p.price).toFixed(0)}</td>
                      <td className="p-3 text-right text-muted-foreground">Rs. {Number(p.cost).toFixed(0)}</td>
                    </tr>
                  ))}
                  {products.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No products found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sales Table */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border/50">
              <h2 className="font-semibold flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Sales ({sales.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Sale #</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Owner</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Payment</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 20).map((s) => (
                    <tr key={s.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{s.sale_number}</td>
                      <td className="p-3 text-muted-foreground text-xs">{getUserLabel(s.user_id)}</td>
                      <td className="p-3 text-center"><Badge variant="secondary">{s.payment_mode}</Badge></td>
                      <td className="p-3 text-right font-medium">Rs. {Number(s.total).toFixed(0)}</td>
                      <td className="p-3 text-right text-muted-foreground text-xs">{new Date(s.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {sales.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No sales found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stock Entries */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border/50">
              <h2 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Stock Movements ({stockEntries.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Owner</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Qty</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stockEntries.slice(0, 20).map((se) => (
                    <tr key={se.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{se.product_name}</td>
                      <td className="p-3 text-muted-foreground text-xs">{getUserLabel(se.user_id)}</td>
                      <td className="p-3 text-center"><Badge variant={se.type === "in" ? "default" : "destructive"}>{se.type}</Badge></td>
                      <td className="p-3 text-center">{se.quantity}</td>
                      <td className="p-3 text-right text-muted-foreground text-xs">{new Date(se.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {stockEntries.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No stock movements found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
