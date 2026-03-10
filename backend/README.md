# StockFlow Backend

**Node.js + Express + TypeScript + PostgreSQL**

REST API backend for the StockFlow POS system. Replaces the previous Supabase setup.

---

## Quick Start

### 1. Install PostgreSQL

```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create the database

```bash
sudo -u postgres psql -c "CREATE DATABASE stockflow;"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres psql -d stockflow -f schema.sql
```

### 3. Configure environment

Edit `.env` (already pre-configured for local development):

```
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/stockflow
JWT_SECRET=stockflow-super-secret-jwt-key-change-in-production-2024
JWT_EXPIRES_IN=7d
UPLOADS_DIR=./uploads
FRONTEND_URL=http://localhost:5173
```

### 4. Install dependencies

```bash
npm install
```

### 5. Seed the database (creates admin user + sample products)

```bash
npx tsx src/seed.ts
```

Default credentials: `admin@stockflow.com` / `admin123`

### 6. Start the backend

```bash
# Development (with hot-reload)
npm run dev

# Production
npm run build && npm start
```

Server starts at: **http://localhost:3001**

---

## API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login with email + password → `{ token, user }` |
| GET  | `/api/auth/me` | Get current user (requires token) |
| PUT  | `/api/auth/password` | Change password |
| POST | `/api/auth/forgot-password` | Request password reset link |
| POST | `/api/auth/reset-password` | Reset password with token |

### Products (authenticated)
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/products` | List own products |
| POST   | `/api/products` | Create product (multipart/form-data, supports image) |
| PUT    | `/api/products/:id` | Update product |
| PATCH  | `/api/products/:id/stock` | Update stock level |
| DELETE | `/api/products/:id` | Delete product |

### Sales (authenticated)
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/api/sales` | List own sales (with items) |
| POST | `/api/sales` | Create sale (updates stock atomically) |

### Stock Entries (authenticated)
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/api/stock-entries` | List own stock movements |
| POST | `/api/stock-entries` | Add stock entry (updates product stock) |

### Profile (authenticated)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/profile` | Get own profile |
| PUT | `/api/profile` | Update full_name, company_name |

### Users (admin only)
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/users` | List all users |
| POST   | `/api/users` | Create user |
| PUT    | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

### Admin (admin only)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/data?userId=<id>` | All products, sales, stock entries |

---

## Authentication

All protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are JWTs, valid for 7 days by default.

---

## Project Structure

```
backend/
├── src/
│   ├── db.ts           # PostgreSQL connection pool
│   ├── auth.ts         # JWT + bcrypt utilities
│   ├── middleware.ts   # Auth + admin middleware
│   ├── routes/
│   │   ├── auth.ts     # Auth endpoints
│   │   ├── products.ts # Products CRUD
│   │   ├── sales.ts    # Sales + checkout
│   │   ├── stock.ts    # Stock entries
│   │   ├── profile.ts  # User profile
│   │   ├── users.ts    # Admin user management
│   │   └── admin.ts    # Admin dashboard data
│   ├── app.ts          # Express app setup
│   ├── server.ts       # Entry point
│   └── seed.ts         # Database seeder
├── schema.sql          # Full database schema
├── uploads/            # Product images (served as static files)
├── .env                # Environment variables
└── package.json
```
