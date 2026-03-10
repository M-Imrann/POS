/**
 * REST API client for StockFlow backend.
 * Replaces the Supabase client.
 */

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

function setToken(token: string): void {
  localStorage.setItem("auth_token", token);
}

function removeToken(): void {
  localStorage.removeItem("auth_token");
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false
): Promise<T> {
  const headers: Record<string, string> = {};

  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  if (body && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body
      ? isFormData
        ? (body as FormData)
        : JSON.stringify(body)
      : undefined,
  });

  if (res.status === 401) {
    removeToken();
    window.location.href = "/login";
    throw new ApiError(401, "Session expired");
  }

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, data.error || "Request failed");
  }

  return data as T;
}

const get = <T>(path: string) => request<T>("GET", path);
const post = <T>(path: string, body?: unknown) => request<T>("POST", path, body);
const put = <T>(path: string, body?: unknown) => request<T>("PUT", path, body);
const patch = <T>(path: string, body?: unknown) => request<T>("PATCH", path, body);
const del = <T>(path: string) => request<T>("DELETE", path);
const postForm = <T>(path: string, form: FormData) => request<T>("POST", path, form, true);
const putForm = <T>(path: string, form: FormData) => request<T>("PUT", path, form, true);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  role: "admin" | "user";
}

export const auth = {
  login: async (email: string, password: string): Promise<{ token: string; user: AuthUser }> => {
    const data = await post<{ token: string; user: AuthUser }>("/api/auth/login", { email, password });
    setToken(data.token);
    return data;
  },

  logout: () => {
    removeToken();
  },

  me: () => get<{ user: AuthUser }>("/api/auth/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    put<{ message: string }>("/api/auth/password", { currentPassword, newPassword }),

  forgotPassword: (email: string) =>
    post<{ message: string; resetUrl?: string }>("/api/auth/forgot-password", { email }),

  resetPassword: (token: string, password: string) =>
    post<{ message: string }>("/api/auth/reset-password", { token, password }),

  getToken,
  setToken,
  removeToken,
  isAuthenticated: () => !!getToken(),
};

// ─── Products ─────────────────────────────────────────────────────────────────
export interface ApiProduct {
  id: string;
  user_id: string;
  name: string;
  category: string;
  subcategory: string;
  price: string | number;
  cost: string | number;
  stock: number;
  barcode: string | null;
  size: string | null;
  color: string | null;
  material: string | null;
  image_url: string | null;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export const products = {
  list: (params?: { userId?: string; all?: boolean }) => {
    const qs = params?.all ? "?all=true" : params?.userId ? `?userId=${params.userId}` : "";
    return get<{ products: ApiProduct[] }>(`/api/products${qs}`);
  },

  create: (data: Record<string, string | number>) =>
    post<{ product: ApiProduct }>("/api/products", data),

  update: (id: string, data: Record<string, string | number>) =>
    put<{ product: ApiProduct }>(`/api/products/${id}`, data),

  updateStock: (id: string, stock: number) =>
    patch<{ product: ApiProduct }>(`/api/products/${id}/stock`, { stock }),

  delete: (id: string) =>
    del<{ message: string }>(`/api/products/${id}`),
};

// ─── Sales ────────────────────────────────────────────────────────────────────
export interface ApiSaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  product_price: string | number;
  quantity: number;
  created_at: string;
}

export interface ApiSale {
  id: string;
  user_id: string;
  sale_number: string;
  subtotal: string | number;
  tax: string | number;
  discount: string | number;
  total: string | number;
  payment_mode: string;
  created_at: string;
  items: ApiSaleItem[];
}

export const sales = {
  list: (params?: { userId?: string; all?: boolean }) => {
    const qs = params?.all ? "?all=true" : params?.userId ? `?userId=${params.userId}` : "";
    return get<{ sales: ApiSale[] }>(`/api/sales${qs}`);
  },

  create: (data: {
    cart: Array<{ productId: string; productName: string; productPrice: number; quantity: number }>;
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    paymentMode?: string;
  }) => post<{ sale: ApiSale }>("/api/sales", data),
};

// ─── Stock Entries ────────────────────────────────────────────────────────────
export interface ApiStockEntry {
  id: string;
  user_id: string;
  product_id: string;
  product_name: string;
  type: "in" | "out";
  quantity: number;
  created_at: string;
}

export const stockEntries = {
  list: (params?: { userId?: string; all?: boolean }) => {
    const qs = params?.all ? "?all=true" : params?.userId ? `?userId=${params.userId}` : "";
    return get<{ stockEntries: ApiStockEntry[] }>(`/api/stock-entries${qs}`);
  },

  create: (data: {
    productId: string;
    productName: string;
    type: "in" | "out";
    quantity: number;
  }) => post<{ entry: ApiStockEntry }>("/api/stock-entries", data),
};

// ─── Profile ──────────────────────────────────────────────────────────────────
export const profile = {
  get: () => get<{ profile: AuthUser }>("/api/profile"),
  update: (data: { fullName?: string; companyName?: string }) =>
    put<{ profile: AuthUser }>("/api/profile", data),
};

// ─── Users (Admin) ────────────────────────────────────────────────────────────
export const users = {
  list: () => get<{ users: AuthUser[] }>("/api/users"),

  create: (data: { email: string; password: string; fullName?: string; companyName?: string; role?: "admin" | "user" }) =>
    post<{ user: AuthUser }>("/api/users", data),

  update: (id: string, data: { fullName?: string; companyName?: string; role?: "admin" | "user"; password?: string }) =>
    put<{ user: AuthUser }>(`/api/users/${id}`, data),

  delete: (id: string) =>
    del<{ message: string }>(`/api/users/${id}`),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const admin = {
  getData: (userId?: string) => {
    const qs = userId ? `?userId=${userId}` : "";
    return get<{ products: ApiProduct[]; sales: ApiSale[]; stockEntries: ApiStockEntry[] }>(
      `/api/admin/data${qs}`
    );
  },
};

// ─── Image URL helper ─────────────────────────────────────────────────────────
export function imageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path}`;
}
