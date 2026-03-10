import { useState, useMemo } from "react";
import { Search, Plus, Package, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subcategories } from "@/data/mockData";
import AddProductDialog from "@/components/AddProductDialog";
import { useProducts, type Product } from "@/context/ProductContext";
import { toast } from "sonner";

export default function ProductsPage() {
  const { products, addProduct, removeProduct, loading } = useProducts();
  const [search, setSearch] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const clothesSubcategories = subcategories["Clothes"] || [];

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.includes(search);
      const matchSub = !selectedSubcategory || p.subcategory === selectedSubcategory;
      return matchSearch && matchSub;
    });
  }, [search, selectedSubcategory, products]);

  const handleRemove = async (product: Product) => {
    await removeProduct(product.id);
    toast.success(`"${product.name}" removed`);
  };

  const handleAdd = async (product: Omit<Product, "id">) => {
    await addProduct(product);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground text-sm mt-1">{products.length} products in inventory</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or barcode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        <button
          onClick={() => setSelectedSubcategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            !selectedSubcategory ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          All
        </button>
        {clothesSubcategories.map((sub) => (
          <button
            key={sub}
            onClick={() => setSelectedSubcategory(selectedSubcategory === sub ? null : sub)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedSubcategory === sub ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {sub}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} onRemove={handleRemove} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No products found</p>
          </div>
        )}
      </div>

      <AddProductDialog open={showAddDialog} onOpenChange={setShowAddDialog} onAdd={handleAdd} />
    </div>
  );
}

function ProductCard({ product, onRemove }: { product: Product; onRemove: (p: Product) => void }) {
  const isLowStock = product.stock <= product.lowStockThreshold;

  return (
    <div className="glass-card p-3 md:p-4 animate-fade-scale group relative">
      <button
        onClick={() => onRemove(product)}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20"
        title="Remove product"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      <div className="w-full h-20 md:h-32 rounded-lg bg-muted flex items-center justify-center mb-2 md:mb-3 overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground/40" />
        )}
      </div>
      <div className="space-y-1 md:space-y-1.5">
        <div className="flex items-start justify-between gap-1">
          <h3 className="font-semibold text-xs md:text-sm leading-tight line-clamp-2">{product.name}</h3>
          <span className="text-xs md:text-sm font-bold text-primary shrink-0">Rs. {product.price}</span>
        </div>
        <p className="text-[10px] md:text-xs text-muted-foreground">{product.subcategory}</p>
        <div className="flex items-center justify-between pt-1">
          <span
            className={`text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 rounded-full ${
              isLowStock ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
            }`}
          >
            {product.stock} in stock
          </span>
          <span className="text-[10px] md:text-xs text-muted-foreground font-mono hidden sm:inline">{product.barcode.slice(-6)}</span>
        </div>
      </div>
    </div>
  );
}
