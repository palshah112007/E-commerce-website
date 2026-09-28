# Novamart — E-commerce Storefront

Novamart is a full-stack, Amazon-style e-commerce storefront built with **React** and **Vite**, backed by a lightweight **Node.js API** with a file-based JSON database. It lets users browse a product catalog, search and filter by category, view product details, manage a shopping cart, and place checkout orders.

## Features

- Amazon-inspired homepage with deals carousel and product grid
- Product search (title, brand, description) and category filters
- Product detail pages with ratings, reviews, stock status, and quantity selection
- Shopping cart with add / update quantity / remove / clear — persisted server-side
- Checkout flow that creates orders and empties the cart
- Order summary with subtotal, shipping, estimated tax, and savings
- REST API served through a Vite dev-server middleware (no extra process needed)
- File-backed JSON database (`database/db.json`) that auto-seeds from `src/data/products.js` on first run

## Tech Stack

| Layer     | Technology                                  |
|-----------|---------------------------------------------|
| Frontend  | React 18, React Router 6, Vite 5            |
| Backend   | Node.js (native `http` server + Vite plugin)|
| Database  | JSON file (`database/db.json`)              |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- npm

### Install & Run

1. Clone the repository and open the project folder:

   ```bash
   git clone https://github.com/palshah112007/E-commerce-website.git
   cd E-commerce-website
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open the app in your browser:

   **http://127.0.0.1:5174**

That's it — the REST API is served by the same dev server at `/api` (via a Vite middleware plugin), so no second terminal is required. The database file is created and seeded automatically on first request.

### Optional: standalone API server

If you want to run the API as its own process (e.g. for testing without the Vite dev server):

```bash
npm run server   # native Node http server
```

## Available Scripts

| Script             | Description                                          |
|--------------------|------------------------------------------------------|
| `npm run dev`      | Start Vite dev server (frontend + `/api` middleware) |
| `npm run server`   | Run the standalone Node API server                   |
| `npm run build`    | Production build (output in `dist/`)                 |
| `npm run preview`  | Preview the production build locally                 |

## API Reference

All endpoints are served under `/api`:

| Method   | Endpoint                  | Description                              |
|----------|---------------------------|------------------------------------------|
| `GET`    | `/api/products`           | List all products                        |
| `GET`    | `/api/cart`               | Get the current cart (hydrated products) |
| `POST`   | `/api/cart/items`         | Add a product to the cart                |
| `PATCH`  | `/api/cart/items/:id`     | Update a cart item's quantity            |
| `DELETE` | `/api/cart/items/:id`     | Remove a cart item                       |
| `DELETE` | `/api/cart`               | Empty the cart                           |
| `POST`   | `/api/orders`             | Place an order (clears the cart)         |

## Project Structure

```
├── index.html              # Vite entry HTML
├── vite.config.js          # Vite config + /api middleware plugin
├── server/
│   └── server.js           # Standalone Node API server
├── database/
│   └── db.json             # File-backed JSON database (products, cart, orders)
└── src/
    ├── main.jsx            # React entry point
    ├── App.jsx             # Routes, cart context, and all pages
    ├── styles.css          # Global styles
    └── data/
        └── products.js     # Seed product catalog
```

## Pages

| Route            | Description                                          |
|------------------|------------------------------------------------------|
| `/`              | Homepage — search, category filters, product grid    |
| `/product/:id`   | Product details — images, pricing, add to cart       |
| `/cart`          | Cart — quantity updates, order summary, checkout     |
| `*`              | 404 page                                             |
