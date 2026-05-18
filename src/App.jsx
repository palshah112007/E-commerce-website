import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import productsData from './data/products.js';

const CartContext = createContext(null);
const BRAND_NAME = 'Novamart';
const categories = ['All departments', ...new Set(productsData.map((product) => product.category))];

function useCart() {
  return useContext(CartContext);
}

function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem('market-cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('market-cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, quantity = 1) => {
    setCartItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) } : item
        );
      }
      return [...current, { ...product, quantity }];
    });
  };

  const updateQuantity = (productId, quantity) => {
    setCartItems((current) =>
      current
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: Math.min(Math.max(Number(quantity) || 0, 0), item.stock) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId) => {
    setCartItems((current) => current.filter((item) => item.id !== productId));
  };

  const clearCart = () => setCartItems([]);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const savings = cartItems.reduce((sum, item) => sum + Math.max(item.listPrice - item.price, 0) * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ cartItems, addToCart, updateQuantity, removeFromCart, clearCart, totalItems, subtotal, savings }}
    >
      {children}
    </CartContext.Provider>
  );
}

function formatPrice(value) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatNumber(value) {
  return value.toLocaleString('en-US');
}

function discount(product) {
  return Math.round(((product.listPrice - product.price) / product.listPrice) * 100);
}

function Stars({ rating, reviews }) {
  return (
    <div className="rating-row" aria-label={`${rating} out of 5 stars`}>
      <span className="stars">{'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}</span>
      <span className="rating-score">{rating}</span>
      <span className="review-count">{formatNumber(reviews)}</span>
    </div>
  );
}

function Header() {
  const { totalItems } = useCart();

  return (
    <header className="site-header">
      <div className="header-main">
        <Link to="/" className="logo" aria-label={`${BRAND_NAME} home`}>
          nova<span>mart</span>
        </Link>
        <div className="deliver-box">
          <small>Deliver to</small>
          <strong>Mumbai 400001</strong>
        </div>
        <SearchBox />
        <nav className="account-nav" aria-label="Account navigation">
          <Link to="/" className="nav-cell">
            <small>Hello, sign in</small>
            <strong>Account</strong>
          </Link>
          <Link to="/" className="nav-cell">
            <small>Returns</small>
            <strong>& Orders</strong>
          </Link>
          <Link to="/cart" className="cart-pill" aria-label={`Cart with ${totalItems} items`}>
            <span>{totalItems}</span>
            Cart
          </Link>
        </nav>
      </div>
      <div className="header-strip">
        <span>All</span>
        <span>Fresh</span>
        <span>Best Sellers</span>
        <span>Mobiles</span>
        <span>Fashion</span>
        <span>Customer Service</span>
        <span>Today&apos;s Deals</span>
        <span>Express Delivery</span>
      </div>
    </header>
  );
}

function SearchBox() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All departments');
  const navigate = useNavigate();

  const onSearch = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category !== 'All departments') params.set('category', category);
    navigate(`/?${params.toString()}`);
  };

  return (
    <form className="search-form" onSubmit={onSearch}>
      <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Search category">
        {categories.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search products, brands, and categories"
      />
      <button type="submit" aria-label="Search">
        Search
      </button>
    </form>
  );
}

function Home() {
  const [category, setCategory] = useState('All departments');
  const [sort, setSort] = useState('featured');
  const [expressOnly, setExpressOnly] = useState(false);
  const [priceLimit, setPriceLimit] = useState(700);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const selectedCategory = params.get('category') || 'All departments';
    setSearchQuery(params.get('q') || '');
    setCategory(categories.includes(selectedCategory) ? selectedCategory : 'All departments');
  }, [location.search]);

  const filteredProducts = useMemo(() => {
    const normalized = searchQuery.toLowerCase();
    const filtered = productsData.filter((product) => {
      const matchesCategory = category === 'All departments' || product.category === category;
      const searchable = `${product.title} ${product.brand} ${product.category} ${product.tags.join(' ')}`.toLowerCase();
      const matchesSearch = !normalized || searchable.includes(normalized);
      const matchesExpress = !expressOnly || product.express;
      const matchesPrice = product.price <= priceLimit;
      return matchesCategory && matchesSearch && matchesExpress && matchesPrice;
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'price-low') return a.price - b.price;
      if (sort === 'price-high') return b.price - a.price;
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'reviews') return b.reviews - a.reviews;
      return b.reviews * b.rating - a.reviews * a.rating;
    });
  }, [category, expressOnly, priceLimit, searchQuery, sort]);

  const heroProduct = productsData[0];
  const dealProducts = productsData.filter((product) => discount(product) >= 25).slice(0, 4);
  const essentials = productsData.filter((product) => ['Kitchen', 'Home', 'Beauty'].includes(product.category)).slice(0, 4);

  return (
    <main>
      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow">Spring sale is live</span>
          <h1>Real brands, sharp deals, and delivery windows that feel useful.</h1>
          <p>
            Save on electronics, home essentials, fashion, skincare, kitchen gear, and daily carry products from trusted sellers.
          </p>
          <div className="hero-actions">
            <button onClick={() => navigate(`/product/${heroProduct.id}`)}>Shop headline deal</button>
            <button className="ghost-button" onClick={() => setCategory('Electronics')}>Browse electronics</button>
          </div>
        </div>
        <div className="hero-product">
          <img src={heroProduct.image} alt={heroProduct.title} />
          <div>
            <span>{heroProduct.badge}</span>
            <h2>{heroProduct.title}</h2>
            <p>{formatPrice(heroProduct.price)}</p>
          </div>
        </div>
      </section>

      <section className="quick-panels" aria-label="Shopping highlights">
        <PromoPanel title="Deals under $50" products={productsData.filter((product) => product.price < 50).slice(0, 4)} />
        <PromoPanel title="Home refresh" products={essentials} />
        <PromoPanel title="Top-rated tech" products={productsData.filter((product) => product.category === 'Electronics').slice(0, 4)} />
      </section>

      <section className="deals-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Today&apos;s deals</span>
            <h2>High-traffic offers shoppers would actually scan</h2>
          </div>
          <button onClick={() => setSort('price-low')}>Sort by price</button>
        </div>
        <div className="deal-row">
          {dealProducts.map((product) => (
            <DealCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="store-layout">
        <aside className="filters-panel">
          <h2>Filters</h2>
          <label>
            Department
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            Sort
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="featured">Featured</option>
              <option value="reviews">Most reviewed</option>
              <option value="rating">Customer rating</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
            </select>
          </label>
          <label>
            Max price: {formatPrice(priceLimit)}
            <input
              type="range"
              min="20"
              max="700"
              step="10"
              value={priceLimit}
              onChange={(event) => setPriceLimit(Number(event.target.value))}
            />
          </label>
          <label className="check-row">
            <input type="checkbox" checked={expressOnly} onChange={(event) => setExpressOnly(event.target.checked)} />
            Express delivery
          </label>
        </aside>

        <section className="results-section">
          <div className="results-topline">
            <div>
              <h2>{filteredProducts.length} results</h2>
              <p>{searchQuery ? `Search results for "${searchQuery}"` : 'Recommended products based on current deals'}</p>
            </div>
            <span>Updated 9:42 AM</span>
          </div>
          <div className="product-grid">
            {filteredProducts.length === 0 ? (
              <div className="empty-state">No products match those filters.</div>
            ) : (
              filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function PromoPanel({ title, products }) {
  return (
    <article className="promo-panel">
      <h2>{title}</h2>
      <div className="promo-grid">
        {products.map((product) => (
          <Link key={product.id} to={`/product/${product.id}`}>
            <img src={product.image} alt={product.title} />
            <span>{product.brand}</span>
          </Link>
        ))}
      </div>
    </article>
  );
}

function DealCard({ product }) {
  const { addToCart } = useCart();

  return (
    <article className="deal-card">
      <Link to={`/product/${product.id}`}>
        <img src={product.image} alt={product.title} />
      </Link>
      <span>{discount(product)}% off</span>
      <h3>{product.title}</h3>
      <p>{formatPrice(product.price)}</p>
      <button onClick={() => addToCart(product)}>Add to cart</button>
    </article>
  );
}

function ProductCard({ product }) {
  const { addToCart } = useCart();

  return (
    <article className="product-card">
      <Link to={`/product/${product.id}`} className="product-image-link">
        <img src={product.image} alt={product.title} />
      </Link>
      <div className="product-content">
        <div className="product-meta">
          <span>{product.badge}</span>
          <span>{product.express ? 'Express' : 'Standard shipping'}</span>
        </div>
        <Link to={`/product/${product.id}`} className="product-title">
          {product.title}
        </Link>
        <Stars rating={product.rating} reviews={product.reviews} />
        <p className="description">{product.description}</p>
        <div className="price-row">
          <strong>{formatPrice(product.price)}</strong>
          <span>{formatPrice(product.listPrice)}</span>
        </div>
        <p className="delivery-line">FREE delivery {product.delivery}</p>
        <p className={product.stock < 10 ? 'stock-warning' : 'stock-line'}>
          {product.stock < 10 ? `Only ${product.stock} left in stock` : 'In stock'}
        </p>
        <button className="add-cart-button" onClick={() => addToCart(product)}>Add to cart</button>
      </div>
    </article>
  );
}

function ProductDetails() {
  const { id } = useParams();
  const product = productsData.find((item) => item.id === id);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(product?.gallery?.[0] || product?.image || '');
  const { addToCart } = useCart();

  useEffect(() => {
    setSelectedImage(product?.gallery?.[0] || product?.image || '');
    setQuantity(1);
  }, [product]);

  if (!product) {
    return (
      <main className="empty-state page-shell">
        <h1>Product not found</h1>
        <Link to="/" className="text-link">Back to store</Link>
      </main>
    );
  }

  const related = productsData
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, 4);
  const gallery = product.gallery || [product.image];

  return (
    <main className="details-page">
      <section className="details-grid">
        <div className="image-gallery">
          <img src={selectedImage} alt={product.title} />
          <div className="thumbnail-row">
            {gallery.map((image, index) => (
              <button
                key={image}
                className={image === selectedImage ? 'active' : ''}
                onClick={() => setSelectedImage(image)}
                aria-label={`Product image ${index + 1}`}
              >
                <img src={image} alt="" />
              </button>
            ))}
          </div>
        </div>
        <div className="details-copy">
          <span className="brand-line">Visit the {product.brand} Store</span>
          <h1>{product.title}</h1>
          <Stars rating={product.rating} reviews={product.reviews} />
          <div className="divider" />
          <div className="price-stack">
            <span className="deal-label">{product.badge}</span>
            <strong>{formatPrice(product.price)}</strong>
            <p>List Price: <s>{formatPrice(product.listPrice)}</s> You save {discount(product)}%</p>
          </div>
          <p className="details-description">{product.description}</p>
          <ul className="feature-list">
            <li>Ships from {product.seller}</li>
            <li>Sold by {product.seller}</li>
            <li>Eligible for 30-day returns</li>
            <li>Secure transaction and order tracking</li>
          </ul>
        </div>
        <aside className="buy-box">
          <strong>{formatPrice(product.price)}</strong>
          <p>FREE delivery <b>{product.delivery}</b></p>
          <p className={product.stock < 10 ? 'stock-warning' : 'stock-line'}>
            {product.stock < 10 ? `Only ${product.stock} left in stock` : 'In stock'}
          </p>
          <label>
            Quantity
            <select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>
              {Array.from({ length: Math.min(product.stock, 10) }, (_, index) => (
                <option key={index + 1} value={index + 1}>{index + 1}</option>
              ))}
            </select>
          </label>
          <button onClick={() => addToCart(product, quantity)}>Add to cart</button>
          <button className="buy-now-button" onClick={() => addToCart(product, quantity)}>Buy now</button>
          <small>Secure checkout with encrypted payment processing.</small>
        </aside>
      </section>

      {related.length > 0 && (
        <section className="related-section">
          <h2>Compare with similar items</h2>
          <div className="deal-row">
            {related.map((item) => <DealCard key={item.id} product={item} />)}
          </div>
        </section>
      )}
    </main>
  );
}

function CartPage() {
  const { cartItems, updateQuantity, removeFromCart, subtotal, savings, clearCart } = useCart();
  const tax = subtotal * 0.0825;
  const shipping = subtotal > 0 && subtotal < 35 ? 5.99 : 0;
  const orderTotal = subtotal + tax + shipping;

  return (
    <main className="cart-page page-shell">
      <h1>Shopping Cart</h1>
      {cartItems.length === 0 ? (
        <div className="empty-state">
          <p>Your cart is empty.</p>
          <Link to="/" className="text-link">Continue shopping</Link>
        </div>
      ) : (
        <div className="cart-grid">
          <section className="cart-items">
            <div className="cart-subhead">
              <span>Price</span>
            </div>
            {cartItems.map((item) => (
              <article key={item.id} className="cart-item">
                <img src={item.image} alt={item.title} />
                <div className="cart-item-copy">
                  <Link to={`/product/${item.id}`}>{item.title}</Link>
                  <p className={item.stock < 10 ? 'stock-warning' : 'stock-line'}>
                    {item.stock < 10 ? `Only ${item.stock} left in stock` : 'In stock'}
                  </p>
                  <span>{item.express ? 'Express delivery available' : 'Standard delivery'}</span>
                  <div className="cart-controls">
                    <label>
                      Qty
                      <select value={item.quantity} onChange={(event) => updateQuantity(item.id, event.target.value)}>
                        {Array.from({ length: Math.min(item.stock, 10) }, (_, index) => (
                          <option key={index + 1} value={index + 1}>{index + 1}</option>
                        ))}
                      </select>
                    </label>
                    <button onClick={() => removeFromCart(item.id)}>Delete</button>
                  </div>
                </div>
                <strong>{formatPrice(item.price * item.quantity)}</strong>
              </article>
            ))}
          </section>

          <aside className="summary-card">
            <p className="success-line">Your order qualifies for FREE Shipping.</p>
            <div className="summary-row"><span>Items</span><strong>{formatPrice(subtotal)}</strong></div>
            <div className="summary-row"><span>Shipping</span><strong>{shipping ? formatPrice(shipping) : 'FREE'}</strong></div>
            <div className="summary-row"><span>Estimated tax</span><strong>{formatPrice(tax)}</strong></div>
            <div className="summary-row savings"><span>Savings</span><strong>-{formatPrice(savings)}</strong></div>
            <div className="summary-total"><span>Order total</span><strong>{formatPrice(orderTotal)}</strong></div>
            <button>Proceed to checkout</button>
            <button className="secondary-button" onClick={clearCart}>Clear cart</button>
          </aside>
        </div>
      )}
    </main>
  );
}

function NotFound() {
  return (
    <main className="empty-state page-shell">
      <h1>404 - Page Not Found</h1>
      <Link to="/" className="text-link">Back to store</Link>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </CartProvider>
    </BrowserRouter>
  );
}
