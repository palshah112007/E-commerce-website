import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import products from './src/data/products.js';

const dbDir = path.resolve('database');
const dbFile = path.join(dbDir, 'db.json');
const seed = { products, cart: [], orders: [] };

async function readDb() {
  if (!existsSync(dbFile)) {
    await mkdir(dbDir, { recursive: true });
    await writeFile(dbFile, JSON.stringify(seed, null, 2));
  }
  return JSON.parse(await readFile(dbFile, 'utf8'));
}

async function writeDb(db) {
  await writeFile(dbFile, JSON.stringify(db, null, 2));
}

async function body(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
}

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function hydrateCart(db) {
  return db.cart
    .map((item) => {
      const product = db.products.find((productItem) => productItem.id === item.productId);
      return product ? { ...product, quantity: item.quantity } : null;
    })
    .filter(Boolean);
}

function apiPlugin() {
  return {
    name: 'novamart-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        try {
          const url = new URL(req.url, 'http://localhost');
          const db = await readDb();

          if (req.method === 'GET' && url.pathname === '/products') return send(res, 200, db.products);
          if (req.method === 'GET' && url.pathname === '/cart') return send(res, 200, hydrateCart(db));

          if (req.method === 'POST' && url.pathname === '/cart/items') {
            const data = await body(req);
            const product = db.products.find((item) => item.id === data.productId);
            if (!product) return send(res, 404, { message: 'Product not found' });
            const existing = db.cart.find((item) => item.productId === data.productId);
            if (existing) existing.quantity = Math.min(existing.quantity + (data.quantity || 1), product.stock);
            else db.cart.push({ productId: data.productId, quantity: Math.min(data.quantity || 1, product.stock) });
            await writeDb(db);
            return send(res, 200, hydrateCart(db));
          }

          if (req.method === 'PATCH' && url.pathname.startsWith('/cart/items/')) {
            const productId = decodeURIComponent(url.pathname.split('/').pop());
            const data = await body(req);
            db.cart = db.cart
              .map((item) => (item.productId === productId ? { ...item, quantity: Number(data.quantity) || 0 } : item))
              .filter((item) => item.quantity > 0);
            await writeDb(db);
            return send(res, 200, hydrateCart(db));
          }

          if (req.method === 'DELETE' && url.pathname.startsWith('/cart/items/')) {
            db.cart = db.cart.filter((item) => item.productId !== decodeURIComponent(url.pathname.split('/').pop()));
            await writeDb(db);
            return send(res, 200, hydrateCart(db));
          }

          if (req.method === 'DELETE' && url.pathname === '/cart') {
            db.cart = [];
            await writeDb(db);
            return send(res, 200, []);
          }

          if (req.method === 'POST' && url.pathname === '/orders') {
            const items = hydrateCart(db);
            const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const order = { id: `ord_${Date.now()}`, createdAt: new Date().toISOString(), items, total };
            db.orders.unshift(order);
            db.cart = [];
            await writeDb(db);
            return send(res, 201, order);
          }

          send(res, 404, { message: 'Not found' });
        } catch (error) {
          send(res, 500, { message: error.message });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [apiPlugin(), react()],
});
