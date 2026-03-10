import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { subcategories } from "@/data/mockData";
import { toast } from "sonner";
import type { Product } from "@/context/ProductContext";

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (product: Omit<Product, "id">) => Promise<void>;
}

export default function AddProductDialog({ open, onOpenChange, onAdd }: AddProductDialogProps) {
  const clothesSubs = subcategories["Clothes"] || [];
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    subcategory: clothesSubs[0] || "",
    price: "",
    cost: "",
    stock: "",
    barcode: "",
    lowStockThreshold: "10",
    size: "",
    color: "",
    material: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onAdd({
        name: form.name,
        category: "Clothes",
        subcategory: form.subcategory,
        price: parseFloat(form.price),
        cost: parseFloat(form.cost),
        stock: parseInt(form.stock),
        barcode: form.barcode,
        lowStockThreshold: parseInt(form.lowStockThreshold),
        size: form.size || undefined,
        color: form.color || undefined,
        material: form.material || undefined,
      });
      toast.success(`Product "${form.name}" added successfully!`);
      onOpenChange(false);
      setForm({
        name: "",
        subcategory: clothesSubs[0] || "",
        price: "",
        cost: "",
        stock: "",
        barcode: "",
        lowStockThreshold: "10",
        size: "",
        color: "",
        material: "",
      });
    } catch {
      toast.error("Failed to add product");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div className="space-y-2">
            <Label>Subcategory</Label>
            <select
              value={form.subcategory}
              onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              {clothesSubs.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="price">Price (Rs.)</Label>
              <Input id="price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost (Rs.)</Label>
              <Input id="cost" type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input id="stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input id="barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Clothing Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Input id="size" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="e.g. S, M, L, 42" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input id="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="e.g. Red, Blue" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="material">Material</Label>
              <Input id="material" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} placeholder="e.g. Cotton, Polyester" />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Adding..." : "Add Product"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
