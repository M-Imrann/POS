#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# StockFlow - One-shot PostgreSQL setup script
# Run: bash setup-db.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

DB_NAME="stockflow"
DB_USER="postgres"

echo "Setting up PostgreSQL for StockFlow..."

# Ensure PostgreSQL is running
if ! pg_isready -q 2>/dev/null; then
  echo "Starting PostgreSQL..."
  sudo systemctl start postgresql
fi

# Create database (ignore error if it already exists)
sudo -u "$DB_USER" psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  sudo -u "$DB_USER" psql -c "CREATE DATABASE $DB_NAME;"

# Apply schema
sudo -u "$DB_USER" psql -d "$DB_NAME" -f "$(dirname "$0")/schema.sql"

echo "✓ Database '$DB_NAME' ready"
echo ""
echo "Next steps:"
echo "  1. npm install"
echo "  2. npx tsx src/seed.ts   # creates admin user + sample products"
echo "  3. npm run dev"
