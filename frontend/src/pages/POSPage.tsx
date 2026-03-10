import { useState, useMemo, useCallback } from "react";
import { Search, Plus, Minus, ShoppingCart, Trash2, Receipt, Package, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import BarcodeScanner from "@/components/BarcodeScanner";
import { useBarcodeScannerDevice } from "@/hooks/useBarcodeScannerDevice";
import { useProducts, type CartItem, type Product } from "@/context/ProductContext";
import ReceiptDialog from "@/components/ReceiptDialog";

const TAX_RATE = 0.08;

export default function POSPage() {
  const { products, addSale, loading } = useProducts();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [lastSale, setLastSale] = useState<{
    items: CartItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    saleId: string;
    date: string;
  } | null>(null);

  const handleBarcodeScan = useCallback((barcode: string) => {
    const product = products.find((p) => p.barcode === barcode);
    if (product) {
      addToCart(product);
      toast.success(`Added "${product.name}" from barcode scan`);
    } else {
      toast.error(`No product found for barcode: ${barcode}`);
    }
  }, [products]);

  useBarcodeScannerDevice(handleBarcodeScan);

  const filtered = useMemo(() => {
    if (!search) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.includes(search)
    );
  }, [search, products]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const subtotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax - discount;

  const handleCheckout = async () => {
    if (cart.length === 0 || checkingOut) return;
    setCheckingOut(true);

    try {
      const sale = await addSale(cart, subtotal, tax, discount, total);
      
      setLastSale({
        items: [...cart],
        subtotal,
        tax,
        discount,
        total,
        saleId: sale.saleNumber,
        date: new Date(sale.date).toLocaleString(),
      });
      setReceiptOpen(true);
      setCart([]);
      setDiscount(0);
      toast.success(`Sale completed! Total: Rs. ${total.toFixed(0)}`);
    } catch {
      toast.error("Failed to complete sale. Please try again.");
    } finally {
      setCheckingOut(false);
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
    <div className="animate-slide-up">
      <h1 className="text-2xl md:text-3xl font-bold mb-5">Point of Sale</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Scan barcode or search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => setScannerOpen(true)} title="Scan Barcode">
              <ScanLine className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {filtered.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="pos-grid-item text-left"
              >
                <div className="w-full h-16 rounded-md bg-muted flex items-center justify-center mb-2">
                  <Package className="w-6 h-6 text-muted-foreground/40" />
                </div>
                <p className="font-medium text-sm leading-tight truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.subcategory}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="font-bold text-sm text-primary">Rs. {product.price}</span>
                  <span className="text-xs text-muted-foreground">{product.stock} qty</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 glass-card-elevated p-5 flex flex-col h-fit lg:sticky lg:top-4">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Cart</h2>
            <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {cart.length} items
            </span>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs">Tap products to add them</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 py-2 border-b border-border/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">Rs. {item.product.price} each</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm font-semibold w-16 text-right">
                    Rs. {(item.product.price * item.quantity).toFixed(0)}
                  </p>
                  <button
                    onClick={() => updateQuantity(item.product.id, -item.quantity)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 pt-3 border-t border-border/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>Rs. {subtotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax (8%)</span>
              <span>Rs. {tax.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-muted-foreground">Discount</span>
              <Input
                type="number"
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-20 h-7 text-right text-sm"
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-border/50">
              <span>Total</span>
              <span className="text-primary">Rs. {total.toFixed(0)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button variant="outline" disabled={cart.length === 0} className="gap-1.5">
              <Receipt className="w-4 h-4" /> Receipt
            </Button>
            <Button onClick={handleCheckout} disabled={cart.length === 0 || checkingOut} className="gap-1.5">
              <ShoppingCart className="w-4 h-4" /> {checkingOut ? "Processing..." : "Checkout"}
            </Button>
          </div>
        </div>
      </div>
      <BarcodeScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleBarcodeScan} />
      {lastSale && (
        <ReceiptDialog
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          items={lastSale.items}
          subtotal={lastSale.subtotal}
          tax={lastSale.tax}
          discount={lastSale.discount}
          total={lastSale.total}
          saleId={lastSale.saleId}
          date={lastSale.date}
        />
      )}
    </div>
  );
}
