import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import products from '../src/data/products.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(__dirname, '..', 'database');
const dbFile = path.join(dbDir, 'db.json');
const port = process.env.PORT || 4000;

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

function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

async function body(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
}

function hydrateCart(db) {
  return db.cart
    .map((item) => {
      const product = db.products.find((productItem) => productItem.id === item.productId);
      return product ? { ...product, quantity: item.quantity } : null;
    })
    .filter(Boolean);
}

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const db = await readDb();

    if (req.method === 'GET' && url.pathname === '/api/products') return send(res, 200, db.products);

    if (req.method === 'GET' && url.pathname === '/api/cart') return send(res, 200, hydrateCart(db));

    if (req.method === 'POST' && url.pathname === '/api/cart/items') {
      const data = await body(req);
      const product = db.products.find((item) => item.id === data.productId);
      if (!product) return send(res, 404, { message: 'Product not found' });
      const existing = db.cart.find((item) => item.productId === data.productId);
      if (existing) existing.quantity = Math.min(existing.quantity + (data.quantity || 1), product.stock);
      else db.cart.push({ productId: data.productId, quantity: Math.min(data.quantity || 1, product.stock) });
      await writeDb(db);
      return send(res, 200, hydrateCart(db));
    }

    if (req.method === 'PATCH' && url.pathname.startsWith('/api/cart/items/')) {
      const productId = decodeURIComponent(url.pathname.split('/').pop());
      const data = await body(req);
      db.cart = db.cart
        .map((item) => (item.productId === productId ? { ...item, quantity: Number(data.quantity) || 0 } : item))
        .filter((item) => item.quantity > 0);
      await writeDb(db);
      return send(res, 200, hydrateCart(db));
    }

    if (req.method === 'DELETE' && url.pathname.startsWith('/api/cart/items/')) {
      const productId = decodeURIComponent(url.pathname.split('/').pop());
      db.cart = db.cart.filter((item) => item.productId !== productId);
      await writeDb(db);
      return send(res, 200, hydrateCart(db));
    }

    if (req.method === 'DELETE' && url.pathname === '/api/cart') {
      db.cart = [];
      await writeDb(db);
      return send(res, 200, []);
    }

    if (req.method === 'POST' && url.pathname === '/api/orders') {
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
}).listen(port, () => {
  console.log(`Novamart API running at http://127.0.0.1:${port}`);
});
