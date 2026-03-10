import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { products as productsApi, sales as salesApi, stockEntries as stockEntriesApi, type ApiStockEntry } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  cost: number;
  stock: number;
  barcode: string;
  imageUrl?: string;
  size?: string;
  color?: string;
  material?: string;
  lowStockThreshold: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Sale {
  id: string;
  saleNumber: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMode: string;
  date: string;
}

export type DbStockEntry = ApiStockEntry;

function apiToProduct(row: import("@/lib/api").ApiProduct): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    subcategory: row.subcategory,
    price: Number(row.price),
    cost: Number(row.cost),
    stock: row.stock,
    barcode: row.barcode || "",
    imageUrl: undefined,
    size: row.size || undefined,
    color: row.color || undefined,
    material: row.material || undefined,
    lowStockThreshold: row.low_stock_threshold,
  };
}

interface ProductContextType {
  products: Product[];
  sales: Sale[];
  stockEntries: DbStockEntry[];
  loading: boolean;
  addProduct: (product: Omit<Product, "id">) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
  updateStock: (productId: string, newStock: number) => Promise<void>;
  addSale: (cart: CartItem[], subtotal: number, tax: number, discount: number, total: number) => Promise<Sale>;
  addStockEntry: (productId: string, productName: string, type: "in" | "out", quantity: number) => Promise<void>;
  refreshProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [productList, setProductList] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stockEntries, setStockEntries] = useState<DbStockEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshProducts = useCallback(async () => {
    if (!user) return;
    const { products } = await productsApi.list();
    setProductList(products.map(apiToProduct));
  }, [user]);

  const fetchSales = useCallback(async () => {
    if (!user) return;
    const { sales: rows } = await salesApi.list();
    const mapped: Sale[] = rows.map((s) => ({
      id: s.id,
      saleNumber: s.sale_number,
      items: s.items.map((si) => ({
        product: {
          id: si.product_id,
          name: si.product_name,
          price: Number(si.product_price),
          category: "Clothes",
          subcategory: "",
          cost: 0,
          stock: 0,
          barcode: "",
          lowStockThreshold: 0,
        },
        quantity: si.quantity,
      })),
      subtotal: Number(s.subtotal),
      tax: Number(s.tax),
      discount: Number(s.discount),
      total: Number(s.total),
      paymentMode: s.payment_mode,
      date: s.created_at,
    }));
    setSales(mapped);
  }, [user]);

  const fetchStockEntries = useCallback(async () => {
    if (!user) return;
    const { stockEntries: rows } = await stockEntriesApi.list();
    setStockEntries(rows);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProductList([]);
      setSales([]);
      setStockEntries([]);
      setLoading(false);
      return;
    }
    const init = async () => {
      setLoading(true);
      await Promise.all([refreshProducts(), fetchSales(), fetchStockEntries()]);
      setLoading(false);
    };
    init();
  }, [user, refreshProducts, fetchSales, fetchStockEntries]);

  const addProduct = async (product: Omit<Product, "id">) => {
    if (!user) return;
    const data: Record<string, string | number> = {
      name: product.name,
      category: product.category,
      subcategory: product.subcategory,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      barcode: product.barcode || "",
      low_stock_threshold: product.lowStockThreshold,
    };
    if (product.size) data.size = product.size;
    if (product.color) data.color = product.color;
    if (product.material) data.material = product.material;

    await productsApi.create(data);
    await refreshProducts();
  };

  const removeProduct = async (productId: string) => {
    await productsApi.delete(productId);
    await refreshProducts();
  };

  const updateStock = async (productId: string, newStock: number) => {
    await productsApi.updateStock(productId, newStock);
    setProductList((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: Math.max(0, newStock) } : p))
    );
  };

  const addSale = async (
    cart: CartItem[],
    subtotal: number,
    tax: number,
    discount: number,
    total: number
  ): Promise<Sale> => {
    if (!user) throw new Error("Not authenticated");

    const { sale } = await salesApi.create({
      cart: cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        productPrice: item.product.price,
        quantity: item.quantity,
      })),
      subtotal,
      tax,
      discount,
      total,
      paymentMode: "Cash",
    });

    // Update local stock state
    for (const item of cart) {
      const product = productList.find((p) => p.id === item.product.id);
      if (product) {
        const newStock = Math.max(0, product.stock - item.quantity);
        setProductList((prev) =>
          prev.map((p) => (p.id === item.product.id ? { ...p, stock: newStock } : p))
        );
      }
    }

    const newSale: Sale = {
      id: sale.id,
      saleNumber: sale.sale_number,
      items: cart,
      subtotal: Number(sale.subtotal),
      tax: Number(sale.tax),
      discount: Number(sale.discount),
      total: Number(sale.total),
      paymentMode: sale.payment_mode,
      date: sale.created_at,
    };

    setSales((prev) => [newSale, ...prev]);
    await fetchStockEntries();
    return newSale;
  };

  const addStockEntry = async (
    productId: string,
    productName: string,
    type: "in" | "out",
    quantity: number
  ) => {
    if (!user) return;
    await stockEntriesApi.create({ productId, productName, type, quantity });
    // Refresh stock levels from server
    await refreshProducts();
    await fetchStockEntries();
  };

  return (
    <ProductContext.Provider
      value={{
        products: productList,
        sales,
        stockEntries,
        loading,
        addProduct,
        removeProduct,
        updateStock,
        addSale,
        addStockEntry,
        refreshProducts,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error("useProducts must be used within ProductProvider");
  return ctx;
}
