import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/context/ProductContext";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function StockPage() {
  const { products, stockEntries, addStockEntry, loading } = useProducts();
  const [dialogType, setDialogType] = useState<"in" | "out" | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedProductId || !quantity || Number(quantity) <= 0) {
      toast.error("Please select a product and enter a valid quantity");
      return;
    }

    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    const qty = Number(quantity);
    if (dialogType === "out" && qty > product.stock) {
      toast.error(`Only ${product.stock} units available`);
      return;
    }

    setSubmitting(true);
    try {
      await addStockEntry(selectedProductId, product.name, dialogType!, qty);
      toast.success(`Stock ${dialogType === "in" ? "added" : "removed"}: ${qty} × ${product.name}`);
      setDialogType(null);
      setSelectedProductId("");
      setQuantity("");
    } catch {
      toast.error("Failed to update stock");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Stock Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Track stock movements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 text-xs sm:text-sm" onClick={() => setDialogType("in")}>
            <ArrowDownCircle className="w-4 h-4 text-success" /> Stock In
          </Button>
          <Button variant="outline" className="gap-2 text-xs sm:text-sm" onClick={() => setDialogType("out")}>
            <ArrowUpCircle className="w-4 h-4 text-destructive" /> Stock Out
          </Button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h2 className="font-semibold">Current Stock Levels</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-border/50 bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Subcategory</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Stock</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Min Level</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const isLow = p.stock <= p.lowStockThreshold;
                return (
                  <tr key={p.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium whitespace-nowrap">{p.name}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{p.subcategory}</td>
                    <td className="p-3 text-right font-semibold">{p.stock}</td>
                    <td className="p-3 text-right text-muted-foreground">{p.lowStockThreshold}</td>
                    <td className="p-3 text-center">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${isLow ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                        {isLow ? "Low" : "OK"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card p-5">
        <h2 className="font-semibold mb-4">Recent Movements</h2>
        <div className="space-y-3">
          {stockEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No stock movements yet</p>
          ) : (
            stockEntries.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                <div className={`p-1.5 rounded-lg ${entry.type === "in" ? "bg-success/10" : "bg-destructive/10"}`}>
                  {entry.type === "in" ? (
                    <ArrowDownCircle className="w-4 h-4 text-success" />
                  ) : (
                    <ArrowUpCircle className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{entry.product_name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`font-semibold text-sm ${entry.type === "in" ? "text-success" : "text-destructive"}`}>
                  {entry.type === "in" ? "+" : "-"}{entry.quantity}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={dialogType !== null} onOpenChange={(open) => { if (!open) setDialogType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogType === "in" ? "Stock In" : "Stock Out"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.stock} in stock)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Enter quantity" />
            </div>
            <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
              {submitting ? "Processing..." : dialogType === "in" ? "Add Stock" : "Remove Stock"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
