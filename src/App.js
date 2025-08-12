/* Firebase E-commerce App */
import React, { useState, useEffect, useRef } from "react";
import {
  Routes,
  Route,
  Link,
  useParams,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, getDoc, collection, getDocs, writeBatch, arrayUnion, query, orderBy, serverTimestamp } from 'firebase/firestore';
import AccountAuth from './AccountAuth';
import AdminAuth from './AdminAuth';
import AdminDashboard from './AdminDashboard'; 
import AdminOverview from './AdminOverview'; 
import UserManagement from './UserManagement'; 
import ProductManagement from './ProductManagement'; 
import OrderManagement from './OrderManagement'; 
import PaymentManagement from './PaymentManagement'; 
import CustomerSupport from './CustomerSupport'; 
import Reports from './Reports'; 
import Settings from './Settings'; 

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Function to get all products (both hardcoded and admin-created)
function getAllProducts() {
  try {
    // Get admin-created products from localStorage
    const adminProducts = JSON.parse(localStorage.getItem('adminProducts') || '[]');
    
    // Filter only live products (not drafts) and ensure they have required properties
    const liveAdminProducts = (adminProducts || []).filter(product => 
      product && 
      product.status === 'live' && 
      product.id && 
      product.title && 
      product.description && 
      typeof product.price === 'number'
    );
    
    // Combine with hardcoded products
    const allProducts = [...PRODUCTS, ...liveAdminProducts];
    
    return allProducts;
  } catch (error) {
    console.error('Error getting products:', error);
    return PRODUCTS; // Return only hardcoded products if there's an error
  }
}

// Function to notify components when products are updated
function notifyProductsUpdated() {
  window.dispatchEvent(new CustomEvent('productsUpdated'));
}

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Use environment variable for appId, fallback to default if not set
const appId = process.env.REACT_APP_DEFAULT_APP_ID || 'default-app-id';

// Demo product data
const PRODUCTS = [
  {
    id: "p1",
    name: "Pure Green Tea",
    description:
      "A soothing blend of green tea leaves, carefully handpicked for a refreshing experience.",
    price: 499,
    faqs: [
      { q: "Is this product durable?", a: "Yes, it lasts for years." },
      { q: "What colors are available?", a: "Currently only black." },
    ],
    related: ["p2", "p3"],
    image: "https://via.placeholder.com/400x300/a3b18a/283618?text=Product+One",
  },
  {
    id: "p2",
    name: "Turmeric Ginger Mix",
    description:
      "A classic blend of turmeric and ginger, perfect for an afternoon cup of revitalizing tea.",
    price: 799,
    faqs: [{ q: "Is it waterproof? ", a: "No, but splash resistant." }],
    related: ["p1"],
    image: "https://via.placeholder.com/400x300/e6c229/283618?text=Product+Two",
  },
  {
    id: "p3",
    name: "Herbal Infusion",
    description: "An affordable product for everyday use. Highly recommended. Great for taking notes.",
    price: 299,
    faqs: [],
    related: ["p1"],
    image: "https://via.placeholder.com/400x300/606c38/283618?text=Product+Three",
  },
  // add more as needed
];

// Utility to get product by id
const getProductById = (id) => getAllProducts().find((p) => p.id === id);

// New component to handle scrolling to top
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Placeholder pages for static info
function PlaceholderPage({ title, children }) {
  return (
    <main className="main-content placeholder">
      <h1 className="main-title">{title}</h1>
      <div>{children || <p>This is a demo page. It looks cool though, right?</p>}</div>
    </main>
  );
}

// Navigation Component
function Navigation({
  cartItemsCount,
  onToggleCart,
  searchTerm,
  onSearchChange,
  filteredProducts,
  onSelectProduct,
  user,
  onLogout,
  isAuthLoading,
  notifications,
  wishlist
}) {
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Close hamburger menu when clicking outside
  const hamburgerRef = useRef();
  const searchRef = useRef();
  const mobileSearchInputRef = useRef();
  const mobileSearchOverlayRef = useRef();
  const profileMenuRef = useRef();
  
  useEffect(() => {
    function handleClickOutside(event) {
      if (hamburgerRef.current && !hamburgerRef.current.contains(event.target)) {
        setHamburgerOpen(false);
      }

      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
      
      // Determine if click is inside the floating mobile search overlay content
      const clickedInsideMobileOverlay =
        mobileSearchOverlayRef.current &&
        mobileSearchOverlayRef.current.contains(event.target);

      // Clear search when clicking outside search area or mobile overlay
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target) &&
        !clickedInsideMobileOverlay
      ) {
        onSearchChange("");
        setMobileSearchOpen(false); // Close mobile search
      }
    }
    
    function handleKeyDown(event) {
      // Clear search when pressing Escape key
      if (event.key === 'Escape') {
        onSearchChange("");
        setMobileSearchOpen(false); // Close mobile search
        setProfileMenuOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onSearchChange]);
  
  const handleCartClick = () => {
    onSearchChange(""); // Clear search when going to cart
    navigate('/cart');
  };

  const handleMobileSearchToggle = () => {
    setMobileSearchOpen(!mobileSearchOpen);
    if (!mobileSearchOpen) {
      onSearchChange(""); // Clear search when opening
    }
  };

  // Auto-focus mobile search input when it becomes visible
  useEffect(() => {
    if (mobileSearchOpen && mobileSearchInputRef.current) {
      // Small delay to ensure the input is fully rendered and visible
      setTimeout(() => {
        mobileSearchInputRef.current.focus();
      }, 150);
    }
  }, [mobileSearchOpen]);

  return (
    <header className="header">
      <div className="nav-left">
        <button
          className="hamburger-btn"
          aria-label="Menu"
          onClick={() => setHamburgerOpen(!hamburgerOpen)}
          aria-expanded={hamburgerOpen}
        >
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {hamburgerOpen ? (
              // X icon when menu is open
              <>
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </>
            ) : (
              // Hamburger icon when menu is closed
              <>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </>
            )}
          </svg>
        </button>
        <Link to="/" className="logo" onClick={() => onSearchChange("")}>
          MyShop
        </Link>
      </div>
      <div className="nav-center">
        {/* Desktop Search - Always visible on larger screens */}
        <div className="desktop-search-container">
          <div className="search-container" ref={searchRef}>
            <svg className="search-icon desktop-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="search-input desktop-search-input"
            />
            {searchTerm && filteredProducts && Array.isArray(filteredProducts) && filteredProducts.length > 0 && (
              <ul className="search-dropdown">
                {filteredProducts.filter(p => p && p.id).map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/product/${p.id}`}
                      onClick={() => {
                        onSelectProduct(p.id);
                        onSearchChange(""); // Clear search when selecting a product
                      }}
                      className="search-result-item"
                    >
                      <img src={p && p.image ? p.image : 'https://via.placeholder.com/40x40?text=Image'} alt={p && (p.name || p.title) ? (p.name || p.title) : 'Product'} className="search-result-image" />
                      <div className="search-result-info">
                        <span className="search-result-name">{p && (p.name || p.title) ? (p.name || p.title) : 'Product'}</span>
                        <span className="search-result-price">₹{p && p.price ? p.price : 0}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Mobile Search - Icon only, opens floating overlay */}
        <div className="mobile-search-container">
          <button 
            className="mobile-search-toggle"
            onClick={handleMobileSearchToggle}
            aria-label="Toggle search"
          >
            <svg className="mobile-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Floating Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div className="mobile-search-overlay" onClick={() => setMobileSearchOpen(false)}>
          <div
            className="mobile-search-overlay-content"
            ref={mobileSearchOverlayRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-search-header">
              <button 
                className="mobile-search-close"
                onClick={handleMobileSearchToggle}
                aria-label="Close search"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <h3>Search Products</h3>
            </div>
            
            <div className="mobile-search-input-container">
              <svg className="mobile-search-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                ref={mobileSearchInputRef}
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const first = (filteredProducts || []).find(p => p && p.id);
                    if (first) {
                      onSelectProduct(first.id);
                      onSearchChange("");
                      setMobileSearchOpen(false);
                    }
                  }
                }}
                className="mobile-search-overlay-input"
              />
            </div>

            {searchTerm && filteredProducts && Array.isArray(filteredProducts) && filteredProducts.length > 0 && (
              <div className="mobile-search-overlay-results">
                {filteredProducts.filter(p => p && p.id).map((p) => (
                  <Link
                    key={p.id}
                    to={`/product/${p.id}`}
                    onClick={() => {
                      onSelectProduct(p.id);
                      onSearchChange(""); // Clear search when selecting a product
                      setMobileSearchOpen(false); // Close mobile search
                    }}
                    className="mobile-search-result-item"
                  >
                    <img src={p && p.image ? p.image : 'https://via.placeholder.com/40x40?text=Image'} alt={p && (p.name || p.title) ? (p.name || p.title) : 'Product'} className="search-result-image" />
                    <div className="mobile-search-result-info">
                      <span className="mobile-search-result-name">{p && (p.name || p.title) ? (p.name || p.title) : 'Product'}</span>
                      <span className="mobile-search-result-price">₹{p && p.price ? p.price : 0}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="nav-right">
        {/* Wishlist Icon - hidden for admins */}
        {(!user || user.role !== 'admin') && (
          <button
            className="nav-icon wishlist-icon"
            aria-label="Wishlist"
            onClick={() => {
              onSearchChange("");
              try { setMobileSearchOpen(false); } catch (e) {}
              try { setHamburgerOpen(false); } catch (e) {}
              if (!user) {
                alert('Please log in to view your wishlist.');
                navigate('/account/login');
                return;
              }
              navigate('/profile/wishlist');
              try { window.scrollTo(0, 0); } catch (e) {}
            }}
          >
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            {wishlist && wishlist.length > 0 && (
              <span className="wishlist-count">{wishlist.length}</span>
            )}
          </button>
        )}

        {/* Profile menu controlled */}
        <div className={`profile-menu-container ${profileMenuOpen ? 'open' : ''}`} ref={profileMenuRef}>
          <button className="nav-icon" aria-label="Profile" onClick={() => setProfileMenuOpen(o => !o)} aria-expanded={profileMenuOpen}>
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </button>
          <div className={`profile-menu-dropdown ${profileMenuOpen ? 'open' : ''}`}>
            {user ? (
              <>
                <Link 
                  to={user.role === 'admin' ? '/admin' : '/profile'}
                  className="profile-link"
                  onClick={() => { onSearchChange(""); setProfileMenuOpen(false); }}
                >
                  My Profile
                  {notifications && notifications.some(n => !n.isRead) && user.role !== 'admin' && (
                    <span className="nav-notification-badge">{notifications.filter(n => !n.isRead).length}</span>
                  )}
                </Link>
                <button
                  className="dropdown-logout-btn"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    onLogout();
                  }}
                  disabled={isAuthLoading}
                >
                  {isAuthLoading ? (
                    <>
                      <span className="btn-loading-spinner"></span>
                      Logging Out...
                    </>
                  ) : (
                    'Logout'
                  )}
                </button>
              </>
            ) : (
              <>
                <Link to="/account/login" onClick={() => { onSearchChange(""); setProfileMenuOpen(false); }}>Login as User</Link>
                <Link to="/admin/login" onClick={() => { onSearchChange(""); setProfileMenuOpen(false); }}>Login as Admin</Link>
              </>
            )}
          </div>
        </div>
        {/* Cart Icon - Only show for non-admin users */}
        {user && user.role !== 'admin' && (
          <button
            className="nav-icon cart-icon"
            aria-label="Cart"
            onClick={handleCartClick}
          >
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            {cartItemsCount > 0 && (
              <span className="cart-count">{cartItemsCount}</span>
            )}
          </button>
        )}
      </div>

      {/* Hamburger menu overlay */}
      {hamburgerOpen && (
        <div 
          className="hamburger-overlay"
          onClick={() => setHamburgerOpen(false)}
        />
      )}
      
      {/* Hamburger menu */}
      <nav
        className={`hamburger-menu ${hamburgerOpen ? "open" : ""}`}
        ref={hamburgerRef}
      >
        <ul>
          <li>
            <Link to="/" onClick={() => { setHamburgerOpen(false); onSearchChange(""); }}>
              Home
            </Link>
          </li>
          <li>
            <Link to="/products" onClick={() => { setHamburgerOpen(false); onSearchChange(""); }}>
              Products
            </Link>
          </li>
          {/* Hide Orders, Track, and Return Policy for admin users */}
          {(!user || user.role !== 'admin') && (
            <>
                        <li>
            <Link to="/orders" onClick={() => { setHamburgerOpen(false); onSearchChange(""); }}>
              Orders
            </Link>
          </li>
          <li>
            <Link to="/track" onClick={() => { setHamburgerOpen(false); onSearchChange(""); }}>
              Track your order
            </Link>
          </li>
          <li>
            <Link to="/return-policy" onClick={() => { setHamburgerOpen(false); onSearchChange(""); }}>
              Return Policy
            </Link>
          </li>
            </>
          )}
          <li>
            <Link to="/about" onClick={() => { setHamburgerOpen(false); onSearchChange(""); }}>
              About Us
            </Link>
          </li>
          <li>
            <Link to="/contact" onClick={() => { setHamburgerOpen(false); onSearchChange(""); }}>
              Contact Us
            </Link>
          </li>
          {/* Hide Shipping Policy for admin users */}
          {(!user || user.role !== 'admin') && (
            <li>
              <Link to="/shipping-policy" onClick={() => { setHamburgerOpen(false); onSearchChange(""); }}>
                Shipping Policy
              </Link>
            </li>
          )}
          <li>
            <Link to="/terms" onClick={() => setHamburgerOpen(false)}>
              Terms of Service
            </Link>
          </li>
          {user && (
            <li>
              <Link to={user.role === 'admin' ? '/admin' : '/profile'} onClick={() => setHamburgerOpen(false)}>
                Profile
              </Link>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}

// Product Card Component
function ProductCard({ product, onAddToCart, isAddedToCart, user, onAddToWishlist, isInWishlist }) {
  const navigate = useNavigate();
  // State for the temporary animation
  const [isAnimating, setIsAnimating] = useState(false);
  // NEW: State to control the button text
  const [isAddedText, setIsAddedText] = useState(false);

  // Handle button click logic
  const handleButtonClick = () => {
    if (isAddedToCart) {
      navigate('/cart');
    } else {
      setIsAnimating(true);
      // NEW: Set the state for the 'Added' text
      setIsAddedText(true);
      // Call the add to cart functionf
      onAddToCart(product, 1);
      // Stop animation and reset text after 2 seconds
      setTimeout(() => {
        setIsAnimating(false);
        setIsAddedText(false); // NEW: Reset the text state
      }, 2000);
    }
  };

  const handleWishlistClick = () => {
    onAddToWishlist(product);
  };

  return (
    <div className="product-card">
      <div className="product-card-header">
        <img src={product.image} alt={product.name || product.title} className="product-card-image" />
        {user && user.role !== 'admin' && (
          <button
            className={`wishlist-btn ${isInWishlist ? 'in-wishlist' : ''}`}
            onClick={handleWishlistClick}
            aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <svg viewBox="0 0 24 24" fill={isInWishlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        )}
      </div>
      <div className="product-card-content">
        <h3>{product.name || product.title}</h3>
        <p className="price">₹{product.price}</p>
      </div>
      <div className="product-card-actions">
        <Link to={`/product/${product.id}`} className="btn btn-product-detail">
          View Details
        </Link>
        {/* Conditional button rendering and logic - Hide for admin users */}
        {user && user.role !== 'admin' && (
          <button
            className={`btn ${isAddedToCart ? 'btn-added' : 'btn-add'} ${isAnimating ? 'btn-animating' : ''}`}
            onClick={handleButtonClick}
            aria-label={isAddedToCart ? 'Go to cart' : `Add ${product.name || product.title} to cart`}
            disabled={isAnimating} // Disable button during animation
          >
            {isAddedText ? 'Added' : (isAddedToCart ? 'Go to Cart' : 'Add to Cart')}
          </button>
        )}
      </div>
    </div>
  );
}

// Product List Page
function ProductList({ onAddToCart, cart, user, onAddToWishlist, wishlist }) {
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Get all products including admin-created ones
  const allProducts = getAllProducts();
  
  // Listen for product updates from admin
  useEffect(() => {
    const handleProductsUpdated = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('productsUpdated', handleProductsUpdated);
    return () => window.removeEventListener('productsUpdated', handleProductsUpdated);
  }, []);
  
  return (
    <main className="main-content">
      <h1 className="main-title">Our Products</h1>
      <div className="product-grid">
        {allProducts.map((product) => (
          <ProductCard
            key={product && product.id ? product.id : 'unknown'}
            product={product}
            onAddToCart={onAddToCart}
            isAddedToCart={cart && product && product.id && cart.some(item => item.product && item.product.id === product.id)}
            onAddToWishlist={onAddToWishlist}
            isInWishlist={wishlist && product && product.id && wishlist.some(item => item.id === product.id)}
            user={user}
          />
        ))}
      </div>
    </main>
  );
}

// Product Detail Page
function ProductDetail({ onAddToCart, cart, user, onAddToWishlist, wishlist }) {
  const { productId } = useParams();
  
  // Try to find product in hardcoded PRODUCTS first, then in admin products
  let product = getProductById(productId);
  
  if (!product) {
    // If not found in hardcoded products, check admin products
    const adminProducts = JSON.parse(localStorage.getItem('adminProducts') || '[]');
    product = adminProducts.find(p => p.id === productId);
  }
  const [quantity, setQuantity] = useState(1);
  const navigate = useNavigate();
  // NEW: State for the temporary animation
  const [isAnimating, setIsAnimating] = useState(false);
  // NEW: State to control the button text
  const [isAddedText, setIsAddedText] = useState(false);

  if (!product) {
    return (
      <main className="main-content">
        <h2 className="main-title">Product Not Found</h2>
        <Link to="/products" className="btn btn-back">Back to Products</Link>
      </main>
    );
  }

  const isAddedToCart = cart && product && product.id && cart.some(item => item.product.id === product.id);
  const isInWishlist = wishlist && product && product.id && wishlist.some(item => item.id === product.id);

  // Related products - include admin products
  let relatedProducts = [];
  if (product.related && Array.isArray(product.related)) {
    relatedProducts = product.related
      .map((id) => getProductById(id))
      .filter(Boolean);
  }
  
  // If no related products from hardcoded data, show some admin products
  if (relatedProducts.length === 0 && product && product.id) {
    const adminProducts = JSON.parse(localStorage.getItem('adminProducts') || '[]');
    const liveAdminProducts = adminProducts.filter(p => p.status === 'live' && p.id !== product.id);
    relatedProducts.push(...liveAdminProducts.slice(0, 3));
  }

  const discount = Math.floor((product.price || 0) * 0.1);
  const finalPrice = (product.price || 0) - discount;


  function handleBuyNow() {
    alert(
      `Thank you for buying ${quantity} unit(s) of ${product.name || product.title}. (Demo alert)`
    );
    // Clear cart or go to payment in real app
    navigate("/");
  }

  // Handle button click logic
  const handleAddToCartClick = () => {
    if (isAddedToCart) {
      navigate('/cart');
    } else {
      setIsAnimating(true);
      // NEW: Set the state for the 'Added' text
      setIsAddedText(true);
      // Call the add to cart function
      onAddToCart(product, quantity);
      // Stop animation and reset text after 2 seconds
      setTimeout(() => {
        setIsAnimating(false);
        setIsAddedText(false); // NEW: Reset the text state
      }, 2000);
    }
  };

  return (
    <main className="main-content product-detail-full">
      <div className="product-layout">
        <div className="product-main-info">
            <div className="product-media">
               <img src={product.image || 'https://via.placeholder.com/400x300?text=Product+Image'} alt={product.name || product.title} className="product-detail-image" />
            </div>
            <div className="product-details-content">
               <h1 className="product-title">{product.name || product.title}</h1>
               <p className="product-description">{product.description || 'No description available'}</p>
            </div>
        </div>

        <div className="product-sidebar">
          <div className="price-details-card">
            <h2 className="price-details-title">PRICE DETAILS</h2>
            <div className="price-line">
              <span>Price ({quantity} item)</span>
              <span>₹{(product.price || 0).toFixed(2)}</span>
            </div>
            <div className="price-line">
              <span>Discount</span>
              <span className="text-green">- ₹{discount.toFixed(2)}</span>
            </div>

            <div className="price-divider"></div>
            <div className="price-line total-amount">
              <span>Total Amount</span>
              <span>₹{finalPrice.toFixed(2)}</span>
            </div>
          </div>

          <div className="actions mt-6">
            <div className="quantity-input">
              <label htmlFor="qty">Quantity:</label>
              <input
                id="qty"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
              />
            </div>
            {/* Conditional button rendering and logic - Hide for admin users */}
            {user && user.role !== 'admin' && (
              <>
                <button
                  className={`btn ${isAddedToCart ? 'btn-added' : 'btn-add'} ${isAnimating ? 'btn-animating' : ''}`}
                  onClick={handleAddToCartClick}
                  aria-label={isAddedToCart ? 'Go to cart' : 'Add to cart'}
                  disabled={isAnimating} // Disable button during animation
                >
                  {isAddedText ? 'Added' : (isAddedToCart ? 'Go to Cart' : 'Add to Cart')}
                </button>
                <button className="btn btn-buy" onClick={handleBuyNow}>
                  Buy Now
                </button>
                <button
                  className={`btn btn-wishlist ${isInWishlist ? 'btn-wishlist-added' : ''}`}
                  onClick={() => onAddToWishlist(product)}
                  aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  {isInWishlist ? '❤️ In Wishlist' : '🤍 Add to Wishlist'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="product-detail-bottom">
        {/* FAQs */}
        {product.faqs && product.faqs.length > 0 && (
          <section className="faqs">
            <h2 className="section-title">FAQs</h2>
            <ul>
              {product.faqs.map((faq, idx) => (
                <li key={idx}>
                  <strong>{faq.q}</strong>
                  <p>{faq.a}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
  
        {/* You may also like */}
        {relatedProducts && relatedProducts.length > 0 && (
          <section className="related-products">
            <h2 className="section-title">You May Also Like</h2>
            <div className="product-grid small">
              {relatedProducts.map((rp) => (
                              <div key={rp.id} className="product-card small">
                <img src={rp.image} alt={rp.name || rp.title} className="product-card-image small" />
                <h4>{rp.name || rp.title}</h4>
                <p>${rp.price}</p>
                  <Link to={`/product/${rp.id}`} className="btn btn-detail-small">
                    View
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

// Cart Page Component (New)
function CartPage({ cart, onUpdateQuantity, onRemoveItem }) {
  const navigate = useNavigate();
  const total = (cart || []).reduce((sum, item) => sum + (item.product && item.product.price ? item.product.price : 0) * item.quantity, 0);
  const discount = Math.floor(total * 0.1);
  const finalAmount = total - discount;

  return (
    <main className="main-content cart-full-page">
      <h1 className="main-title">Your Cart</h1>
      <div className="cart-layout">
        <div className="cart-items-list">
          {cart.length === 0 ? (
            <p className="empty-cart-message-full">Your cart is empty. <Link to="/products">Start Shopping</Link></p>
          ) : (
            cart.map(({ product, quantity }) => (
              <div key={product && product.id ? product.id : 'unknown'} className="cart-item-card">
                <img src={product && product.image ? product.image : 'https://via.placeholder.com/100x100?text=Image'} alt={product && (product.name || product.title) ? (product.name || product.title) : 'Product'} className="cart-item-image-full" />
                <div className="cart-item-details-full">
                  <h3>{product && (product.name || product.title) ? (product.name || product.title) : 'Unknown Product'}</h3>
                  <p>Price: ₹{product && product.price ? product.price : 0}</p>
                  <div className="cart-item-controls-full">
                    <label htmlFor={`qty-${product && product.id ? product.id : 'unknown'}`}>Quantity:</label>
                    <input
                      id={`qty-${product && product.id ? product.id : 'unknown'}`}
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => onUpdateQuantity(product && product.id ? product.id : 'unknown', Math.max(1, +e.target.value))}
                    />
                    <button onClick={() => onRemoveItem(product && product.id ? product.id : 'unknown')} className="remove-btn">Remove</button>
                  </div>
                </div>
              </div>
            ))
          )}
          {cart.length > 0 && (
            <div className="flex-end-btn-container">
              <button className="btn btn-checkout-full" onClick={() => alert('Placing order...')}>
                Place Order
              </button>
            </div>
          )}
        </div>

        <div className="price-details-sidebar">
          <div className="price-details-card">
            <h2 className="price-details-title">PRICE DETAILS</h2>
            <div className="price-line">
              <span>Price ({cart.length} item{cart.length > 1 ? 's' : ''})</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
            <div className="price-line">
              <span>Discount</span>
              <span className="text-green">- ₹{discount.toFixed(2)}</span>
            </div>

            <div className="price-divider"></div>
            <div className="price-line total-amount">
              <span>Total Amount</span>
              <span>₹{finalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// Cart Sidebar Component
function CartSidebar({ cart, onClose, onUpdateQuantity, onRemoveItem }) {
  const total = (cart || []).reduce(
    (sum, item) => sum + (item.product && item.product.price ? item.product.price : 0) * item.quantity,
    0
  );

  return (
    <aside className="cart-sidebar">
      <button className="close-btn" onClick={onClose} aria-label="Close Cart">
        &times;
      </button>
      <h2>Your Cart</h2>
      {cart.length === 0 ? (
        <p className="empty-cart-message">Your cart is empty.</p>
      ) : (
        <>
          <ul className="cart-items">
            {cart.map(({ product, quantity }) => (
              <li key={product && product.id ? product.id : 'unknown'} className="cart-item">
                <div className="cart-item-details">
                  <img src={product && product.image ? product.image : 'https://via.placeholder.com/80x60?text=Image'} alt={product && (product.name || product.title) ? (product.name || product.title) : 'Product'} className="cart-item-image" />
                  <div>
                    <strong>{product && (product.name || product.title) ? (product.name || product.title) : 'Unknown Product'}</strong>
                    <p>Price: ${product && product.price ? product.price : 0}</p>
                  </div>
                </div>
                <div className="cart-item-controls">
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) =>
                      onUpdateQuantity(product && product.id ? product.id : 'unknown', Math.max(1, +e.target.value))
                    }
                    aria-label={`Quantity for ${product && (product.name || product.title) ? (product.name || product.title) : 'Product'}`}
                  />
                  <button
                    className="remove-btn"
                    onClick={() => onRemoveItem(product && product.id ? product.id : 'unknown')}
                                          aria-label={`Remove ${product && (product.name || product.title) ? (product.name || product.title) : 'Product'} from cart`}
                  >
                    &times;
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="cart-total">
            <strong>Total: ${total.toFixed(2)}</strong>
          </div>
          <button
            className="btn btn-checkout"
            onClick={() => alert("Checkout flow not implemented.")}
          >
            Checkout
          </button>
        </>
      )}
    </aside>
  );
}

// NEW: New component for the user profile layout
function UserProfile({ user, onUpdateProfile, onLogout, onDeleteAccount, wishlist, notifications, onRemoveFromWishlist, onAddToCart, onMarkNotificationsAsRead }) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) {
    navigate('/account/login');
    return null;
  }
  
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const profileImage = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'User')}&background=random`;

  return (
    <main className="main-content user-profile-layout">
      <div className="profile-sidebar">
        <div className="profile-header">
          <img src={profileImage} alt="Profile" className="profile-avatar" />
          <div className="profile-name-container">
            <p className="profile-greeting">Hello,</p>
            <h3 className="profile-full-name">{fullName || 'User'}</h3>
          </div>
        </div>
        <nav className="profile-nav">
          <h4 className="nav-title">MY ORDERS</h4>
          <ul>
            <li>
              <Link to="/profile/orders" className={location.pathname.startsWith('/profile/orders') ? 'active' : ''}>
                My Orders
              </Link>
            </li>
          </ul>
          <h4 className="nav-title">ACCOUNT SETTINGS</h4>
          <ul>
            <li>
              <Link to="/profile" className={location.pathname === '/profile' ? 'active' : ''}>
                Profile Information
              </Link>
            </li>
            <li>
              <Link to="/profile/addresses" className={location.pathname.startsWith('/profile/addresses') ? 'active' : ''}>
                Manage Addresses
              </Link>
            </li>
          </ul>
          <h4 className="nav-title">MY STUFF</h4>
          <ul>
            <li>
              <Link to="/profile/reviews" className={location.pathname.startsWith('/profile/reviews') ? 'active' : ''}>
                My Reviews & Ratings
              </Link>
            </li>
            <li>
              <Link to="/profile/notifications" className={location.pathname.startsWith('/profile/notifications') ? 'active' : ''}>
                All Notifications
                {notifications && notifications.some(n => !n.isRead) && (
                  <span className="notification-badge">{notifications.filter(n => !n.isRead).length}</span>
                )}
              </Link>
            </li>
            <li>
              <Link to="/profile/wishlist" className={location.pathname.startsWith('/profile/wishlist') ? 'active' : ''}>
                My Wishlist
              </Link>
            </li>
          </ul>
          <button onClick={onLogout} className="btn btn-logout">
            Logout
          </button>
        </nav>
      </div>
      <div className="profile-content">
        <div className="profile-content-wrapper">
          <Routes>
            <Route index element={<ProfileInfo user={user} onUpdateProfile={onUpdateProfile} onDeleteAccount={onDeleteAccount} />} />
            <Route path="addresses" element={<ManageAddresses user={user} onUpdateProfile={onUpdateProfile} />} />
            <Route path="addresses/edit" element={<EditAddress user={user} onUpdateProfile={onUpdateProfile} />} />
            <Route path="orders" element={<MyOrdersPage />} />
            <Route path="reviews" element={<MyReviewsPage />} />
            <Route path="notifications" element={<NotificationsPage notifications={notifications} onMarkNotificationsAsRead={onMarkNotificationsAsRead} />} />
            <Route path="wishlist" element={<WishlistPage wishlist={wishlist} onRemoveFromWishlist={onRemoveFromWishlist} onAddToCart={onAddToCart} />} />
          </Routes>
        </div>
      </div>
    </main>
  );
}

// Mobile Profile Pages
function MyOrdersPage() {
  return (
    <div className="profile-section-card">
      <div className="profile-section-header">
        <h2 className="section-title">My Orders</h2>
      </div>
      <div className="orders-content">
        <p>No orders found. Start shopping to see your orders here!</p>
        <Link to="/products" className="btn">Shop Now</Link>
      </div>
    </div>
  );
}

function MyReviewsPage() {
  return (
    <div className="profile-section-card">
      <div className="profile-section-header">
        <h2 className="section-title">My Reviews & Ratings</h2>
      </div>
      <div className="reviews-content">
        <p>No reviews yet. Review products you've purchased!</p>
      </div>
    </div>
  );
}



function NotificationsPage({ notifications, onMarkNotificationsAsRead }) {
  // Mark all notifications as read when component mounts
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      onMarkNotificationsAsRead();
    }
  }, [notifications, onMarkNotificationsAsRead]);

  return (
    <div className="profile-section-card">
      <div className="profile-section-header">
        <h2 className="section-title">All Notifications</h2>
      </div>
      <div className="notifications-content">
        {notifications && notifications.length > 0 ? (
          <div className="notifications-list">
            {notifications.map((notification) => (
              <div key={notification.id} className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}>
                <h4>{notification.title}</h4>
                <p>{notification.message}</p>
                <small>{new Date(notification.timestamp).toLocaleDateString()}</small>
              </div>
            ))}
          </div>
        ) : (
          <p>No notifications yet.</p>
        )}
      </div>
    </div>
  );
}

function WishlistPage({ wishlist, onRemoveFromWishlist, onAddToCart }) {
  return (
    <div className="profile-section-card">
      <div className="profile-section-header">
        <h2 className="section-title">My Wishlist</h2>
      </div>
      <div className="wishlist-content">
        {wishlist && wishlist.length > 0 ? (
          <div className="wishlist-grid">
            {wishlist.map((product) => (
              <div key={product.id} className="wishlist-item">
                <img src={product.image} alt={product.name || product.title} className="wishlist-item-image" />
                <div className="wishlist-item-details">
                  <h4>{product.name || product.title}</h4>
                  <p className="price">₹{product.price}</p>
                  <div className="wishlist-item-actions">
                    <button 
                      className="btn btn-add" 
                      onClick={() => onAddToCart(product, 1)}
                    >
                      Add to Cart
                    </button>
                    <button 
                      className="btn btn-remove" 
                      onClick={() => onRemoveFromWishlist(product.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>Your wishlist is empty. Add some products to your wishlist!</p>
        )}
      </div>
    </div>
  );
}

// NEW: Profile Info Component (replaces old ProfilePage)
function ProfileInfo({ user, onUpdateProfile, onDeleteAccount }) {
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');

  const handleEditClick = () => setIsEditing(true);

  const handleSaveClick = async () => {
    await onUpdateProfile({ firstName, lastName });
    setIsEditing(false);
  };

  return (
    <div className="profile-section-card">
      <div className="profile-section-header">
        <h2 className="section-title">Personal Information</h2>
        {isEditing ? (
          <button className="btn-edit" onClick={handleSaveClick}>SAVE</button>
        ) : (
          <button className="btn-edit" onClick={handleEditClick}>EDIT</button>
        )}
      </div>
      <div className="profile-info-grid">
        <div className="form-group">
          <label>First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={!isEditing}
          />
        </div>
        <div className="form-group">
          <label>Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={!isEditing}
          />
        </div>
      </div>
      
      <div className="profile-section-header" style={{ marginTop: '2rem' }}>
        <h2 className="section-title">Email Address</h2>
        <button className="btn-edit">EDIT</button>
      </div>
      <div className="form-group">
        <input type="text" value={user.email} disabled />
      </div>
      
      <button onClick={onDeleteAccount} className="btn btn-delete" style={{ marginTop: '2rem' }}>
        Delete Account
      </button>
    </div>
  );
}

// NEW: Manage Addresses Component
function ManageAddresses({ user, onUpdateProfile }) {
  const navigate = useNavigate();

  const formatAddress = (address) => {
    if (!address || typeof address !== 'object') {
      return 'No address saved.';
    }
    const { flat, street, city, state, pincode } = address;
    return (
      <p>
        {flat}<br />
        {street}<br />
        {city}, {state} - {pincode}
      </p>
    );
  };

  const handleEditAddress = () => {
    navigate('/profile/addresses/edit');
  };

  return (
    <div className="profile-section-card">
      <div className="profile-section-header">
        <h2 className="section-title">Manage Addresses</h2>
        <button className="btn-edit" onClick={handleEditAddress}>EDIT</button>
      </div>
      <div className="address-display">
        {formatAddress(user.address)}
      </div>
    </div>
  );
}

// New component for editing the user's address
function EditAddress({ user, onUpdateProfile }) {
  const navigate = useNavigate();
  
  // Use existing address data to pre-fill the form
  const [flat, setFlat] = useState(user?.address?.flat || '');
  const [street, setStreet] = useState(user?.address?.street || '');
  const [city, setCity] = useState(user?.address?.city || '');
  const [state, setState] = useState(user?.address?.state || '');
  const [pincode, setPincode] = useState(user?.address?.pincode || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!flat || !street || !city || !state || !pincode) {
      alert("Please fill in all address fields.");
      return;
    }
    const fullAddress = { flat, street, city, state, pincode };
    await onUpdateProfile({ address: fullAddress });
    alert("Address updated successfully!");
    navigate("/profile/addresses");
  };

  return (
    <main className="profile-section-card">
      <h1 className="section-title">Edit Your Address</h1>
      <p className="profile-subtitle">
        Update your delivery address below.
      </p>
      <form onSubmit={handleSubmit} className="auth-form max-w-sm mx-auto">
        <div className="form-group">
          <label htmlFor="flat">Flat / House / Apartment Number</label>
          <input
            id="flat"
            type="text"
            placeholder="e.g., Flat No. 302, House No. 15A"
            value={flat}
            onChange={(e) => setFlat(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="street">Street / Locality / Area / Colony / Sector</label>
          <input
            id="street"
            type="text"
            placeholder="e.g., MG Road, Sector 22, Green Park"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="city">City / Town / Village</label>
          <input
            id="city"
            type="text"
            placeholder="e.g., Mumbai, Pune, Delhi"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="state">State / Union Territory</label>
          <input
            id="state"
            type="text"
            placeholder="e.g., Maharashtra, Karnataka"
            value={state}
            onChange={(e) => setState(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="pincode">Pincode / ZIP code</label>
          <input
            id="pincode"
            type="text"
            placeholder="e.g., 400001"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn auth-btn">
          Save Address
        </button>
      </form>
    </main>
  );
}


// New component for completing user profile
function CompleteProfile({ user, onUpdateProfile }) {
  const navigate = useNavigate();
  // Update state to handle individual address fields
  const [flat, setFlat] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!flat || !street || !city || !state || !pincode) {
      alert("Please fill in all address fields.");
      return;
    }
    const fullAddress = { flat, street, city, state, pincode };
    await onUpdateProfile({ address: fullAddress });
    alert("Profile updated successfully!");
    navigate("/");
  };

  return (
    <main className="main-content profile-complete">
      <h1 className="main-title">Complete Your Profile</h1>
      <p className="text-center mb-6">
        Hello {user?.firstName || user?.email}! Please provide your delivery address to continue.
      </p>
      <form onSubmit={handleSubmit} className="auth-form max-w-sm mx-auto">
        <div className="form-group">
          <label htmlFor="flat">Flat / House / Apartment Number</label>
          <input
            id="flat"
            type="text"
            placeholder="e.g., Flat No. 302, House No. 15A"
            value={flat}
            onChange={(e) => setFlat(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="street">Street / Locality / Area / Colony / Sector</label>
          <input
            id="street"
            type="text"
            placeholder="e.g., MG Road, Sector 22, Green Park"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="city">City / Town / Village</label>
          <input
            id="city"
            type="text"
            placeholder="e.g., Mumbai, Pune, Delhi"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="state">State / Union Territory</label>
          <input
            id="state"
            type="text"
            placeholder="e.g., Maharashtra, Karnataka"
            value={state}
            onChange={(e) => setState(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="pincode">Pincode / ZIP code</label>
          <input
            id="pincode"
            type="text"
            placeholder="e.g., 400001"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn auth-btn">
          Save Address
        </button>
      </form>
    </main>
  );
}


// Footer Component
function Footer() {
  return (
    <>
      {/* Mobile Footer - Only Social Media Icons */}
      <footer className="footer-mobile">
        <div className="social-icons-mobile">
          <a href="https://instagram.com" target="_blank" rel="noreferrer" className="social-icon-mobile">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>
          <a href="https://facebook.com" target="_blank" rel="noreferrer" className="social-icon-mobile">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
          <a href="https://youtube.com" target="_blank" rel="noreferrer" className="social-icon-mobile">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </a>
        </div>
      </footer>

      {/* Desktop Footer - Full Content */}
      <footer className="footer-desktop">
        <div className="footer-section about">
          <h3>About Us</h3>
          <p>
            We are a demo e-commerce site providing quality products. Contact us
            anytime.
          </p>
          <p>
            <strong>Contact:</strong> demo@myshop.com | +91 1234567890
          </p>
        </div>
        <div className="footer-section social-media">
          <h3>Follow Us</h3>
          <ul>
            <li>
              <a href="https://instagram.com" target="_blank" rel="noreferrer">
                Instagram
              </a>
            </li>
            <li>
              <a href="https://facebook.com" target="_blank" rel="noreferrer">
                Facebook
              </a>
            </li>
            <li>
              <a href="https://youtube.com" target="_blank" rel="noreferrer">
                YouTube
              </a>
            </li>
          </ul>
        </div>
        <div className="footer-section quick-links">
          <h3>Quick Links</h3>
          <ul>
            <li>
              <Link to="/track">Track Order</Link>
            </li>
            <li>
              <Link to="/return-policy">Return & Refund Policy</Link>
            </li>
            <li>
              <Link to="/faq">FAQ</Link>
            </li>
            <li>
              <Link to="/privacy">Privacy Policy</Link>
            </li>
          </ul>
        </div>
        <div className="footer-section get-in-touch">
          <h3>Get In Touch</h3>
          <p>Demo Address, City, Country</p>
          <p>Phone: +91 1234567890</p>
          <p>Call Timing: 9am - 6pm IST</p>
          <p>Email: demo@myshop.com</p>
          <p>WhatsApp: +91 9876543210</p>
        </div>
      </footer>
    </>
  );
}

const CAROUSEL_IMAGES = [
  "https://via.placeholder.com/1200x500/007bff/ffffff?text=Carousel+Image+1",
  "https://via.placeholder.com/1200x500/007bff/ffffff?text=Carousel+Image+2",
  "https://via.placeholder.com/1200x500/007bff/ffffff?text=Carousel+Image+3",
  "https://via.placeholder.com/1200x500/007bff/ffffff?text=Carousel+Image+4",
  "https://via.placeholder.com/1200x500/007bff/ffffff?text=Carousel+Image+5",
];

// New Home Page Component
function Home({ products, onAddToCart, user, onAddToWishlist, wishlist }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Get all products including admin-created ones
  const allProducts = getAllProducts();
  const latestProducts = allProducts.slice(0, 3);
  
  // Listen for product updates from admin
  useEffect(() => {
    const handleProductsUpdated = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('productsUpdated', handleProductsUpdated);
    return () => window.removeEventListener('productsUpdated', handleProductsUpdated);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % CAROUSEL_IMAGES.length);
    }, 5000); // Change image every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="main-content home-page">
      {/* Carousel Section */}
      <section className="carousel-section">
        <div className="carousel-container">
          <img src={CAROUSEL_IMAGES[currentImageIndex]} alt={`Carousel Image ${currentImageIndex + 1}`} className="carousel-image" />
          <div className="carousel-text">
            <h2 className="carousel-title">Welcome to MyShop</h2>
            <p>Discover our range of high-quality products.</p>
            <Link to="/products" className="btn">Shop Now</Link>
          </div>
          <div className="carousel-dots">
            {CAROUSEL_IMAGES.map((_, index) => (
              <span
                key={index}
                className={`carousel-dot ${index === currentImageIndex ? 'active' : ''}`}
                onClick={() => setCurrentImageIndex(index)}
              ></span>
            ))}
          </div>
        </div>
      </section>

      {/* Our Products Section */}
      <section className="home-products-section">
        <div className="flex-header">
          <h2 className="section-title">Our Products</h2>
          <Link to="/products" className="btn btn-view-all">View All</Link>
        </div>
        <div className="product-grid">
          {latestProducts.map((product) => (
            <ProductCard 
              key={product && product.id ? product.id : 'unknown'} 
              product={product} 
              onAddToCart={onAddToCart} 
              onAddToWishlist={onAddToWishlist}
              isInWishlist={wishlist && product && product.id && wishlist.some(item => item.id === product.id)}
              user={user} 
            />
          ))}
        </div>
      </section>

      {/* Reviews Section */}
      <section className="reviews-section">
        <h2 className="section-title">Customer Reviews</h2>
        <div className="reviews-container">
          <div className="review-card">
            <h3>"A truly fantastic product!"</h3>
            <p>I absolutely love the Pure Green Tea. It's so refreshing and the quality is unmatched. I've been a customer for a year now and I am never disappointed.</p>
            <p><strong>- John Doe</strong></p>
          </div>
          <div className="review-card">
            <h3>"Highly recommended for daily use."</h3>
            <p>The Turmeric Ginger Mix is now a part of my daily routine. The flavors are amazing and it's a great way to start my day. Thank you, MyShop!</p>
            <p><strong>- Jane Smith</strong></p>
          </div>
          <div className="review-card">
            <h3>"Great for the price."</h3>
            <p>The Herbal Infusion is surprisingly good for its price. It's a simple, yet effective blend. I will definitely be repurchasing.</p>
            <p><strong>- Peter Jones</strong></p>
          </div>
        </div>
      </section>

      {/* Story, Mission, Beginning Section */}
      <section className="about-sections">
        <div className="about-card">
          <h2 className="section-title">The Beginning</h2>
          <p>
            Every great journey has a starting point. Ours began with a simple idea: to provide
            the finest quality products to our customers with a focus on sustainability and
            craftsmanship. From a small workshop, we've grown into a brand dedicated to quality.
          </p>
        </div>
        <div className="about-card">
          <h2 className="section-title">Our Story</h2>
          <p>
            Our story is one of passion and dedication. We believe in the power of natural
            ingredients and the beauty of simplicity. Each product is a testament to our
            commitment to excellence, crafted with care and an eye for detail. We are not just a
            brand; we are a community built on trust and a shared love for quality.
          </p>
        </div>
        <div className="about-card">
          <h2 className="section-title">Our Mission</h2>
          <p>
            Our mission is to enrich lives by offering products that are not only beautiful but
            also beneficial. We strive to be a positive influence in our community and the world
            by promoting sustainable practices and responsible sourcing. We are committed to
            delivering joy, one product at a time.
          </p>
        </div>
      </section>
    </main>
  );
}

// New Loading Overlay Component
const LoadingOverlay = () => (
  <div className="loading-overlay">
    <div className="loading-spinner"></div>
    <div className="loading-text">Loading...</div>
  </div>
);

// App Component
export default function App() {
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [notifications, setNotifications] = useState([]);
  // For large-scale notifications, also store broadcasts separately
  const [broadcasts, setBroadcasts] = useState([]);
  // Global activity indicator for UX feedback (used to drive spinner favicon)
  const [globalBusyCount, setGlobalBusyCount] = useState(0);
  const faviconSpinnerIntervalRef = useRef(null);
  const faviconAngleRef = useRef(0);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Handle Google redirect results
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // User signed in via redirect
          const user = result.user;
          if (user) {
            // Check if user already exists and has a role
            const userDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile`, 'details');
            const docSnap = await getDoc(userDocRef);
            
            if (docSnap.exists()) {
              const existingRole = docSnap.data().role;
              
              // Determine if this was an admin or user login based on the current route
              const isAdminLogin = window.location.pathname.includes('/admin');
              
              // If user is admin but trying to login through regular user login
              if (existingRole === 'admin' && !isAdminLogin) {
                await signOut(auth);
                alert("Admin accounts must use the 'Login as Admin' option. Please use the admin login page.");
                return;
              }
              
              // If user is regular user but trying to login through admin login
              if (existingRole === 'user' && isAdminLogin) {
                await signOut(auth);
                alert("Regular user accounts cannot login as admin. Please use the regular user login page.");
                return;
              }
            }
            
            const userProfile = {
              firstName: user.displayName?.split(' ')[0] || '',
              lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
              email: user.email,
              role: window.location.pathname.includes('/admin') ? 'admin' : 'user'
            };
            
            // Save to private profile
            await setDoc(userDocRef, userProfile, { merge: true });
            
            // Also save to public users collection for admin access
            try {
              const publicUserDocRef = doc(db, `artifacts/${appId}/publicUsers/${user.uid}`);
              await setDoc(publicUserDocRef, {
                ...userProfile,
                createdAt: new Date(),
                status: 'active'
              }, { merge: true });
            } catch (publicErr) {
              console.log('Could not create public user entry:', publicErr);
              // Continue anyway - this is not critical
            }
            
            // Success message
            if (window.location.pathname.includes('/admin')) {
              alert('Admin login successful! Welcome to MyShop Admin!');
              navigate('/admin');
            } else {
              alert('Login successful! Welcome to MyShop!');
              navigate('/');
            }
          }
        }
      } catch (error) {
        console.error('Error handling redirect result:', error);
        alert('Login failed! Please try again.');
      }
    };

    handleRedirectResult();
  }, [auth, appId, navigate]);

  // Auth state listener
  useEffect(() => {
    let unsubCart = () => {};
    let unsubWishlist = () => {};
    let unsubNotifications = () => {};
    let unsubBroadcasts = () => {};
    
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const userDocRef = doc(db, `artifacts/${appId}/users/${authUser.uid}/profile`, 'details');
        const docSnap = await getDoc(userDocRef);

        let userData;
        if (docSnap.exists()) {
          userData = docSnap.data();
        } else {
          let firstName = authUser.displayName;
          let lastName = "";
          const nameParts = authUser.displayName?.split(' ') || [];
          if (nameParts.length > 1) {
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ');
          }
          const newUserProfile = {
            firstName: firstName,
            lastName: lastName,
            email: authUser.email,
            address: ''
          };
          await setDoc(userDocRef, newUserProfile);
          userData = newUserProfile;
        }

        setUser({
          ...authUser,
          ...userData,
        });

        // Set up cart listener
        const cartDocRef = doc(db, `artifacts/${appId}/users/${authUser.uid}/cart`, 'items');
        unsubCart = onSnapshot(cartDocRef, (docSnap) => {
          if (docSnap.exists() && docSnap.data().items) {
            setCart(docSnap.data().items);
          } else {
            setCart([]);
          }
        });

        // Set up wishlist listener
        const wishlistDocRef = doc(db, `artifacts/${appId}/users/${authUser.uid}/wishlist`, 'items');
        unsubWishlist = onSnapshot(wishlistDocRef, (docSnap) => {
          if (docSnap.exists() && docSnap.data().items) {
            setWishlist(docSnap.data().items);
          } else {
            setWishlist([]);
          }
        });

        // Set up notifications listener (personal + broadcasts)
        const notificationsDocRef = doc(db, `artifacts/${appId}/users/${authUser.uid}/notifications`, 'items');
        unsubNotifications = onSnapshot(notificationsDocRef, (docSnap) => {
          if (docSnap.exists() && docSnap.data().items) {
            const items = docSnap.data().items;
            // Latest first
            const sorted = [...items].sort((a, b) => {
              const aDate = (a.timestamp && typeof a.timestamp.toDate === 'function') ? a.timestamp.toDate() : new Date(a.timestamp);
              const bDate = (b.timestamp && typeof b.timestamp.toDate === 'function') ? b.timestamp.toDate() : new Date(b.timestamp);
              const at = aDate.getTime();
              const bt = bDate.getTime();
              return bt - at;
            });
            // merge with broadcast stream already in state
            setNotifications([...broadcasts, ...sorted]);
          } else {
            setNotifications(broadcasts);
          }
        });

        // Broadcasts collection (admin-wide notifications)
        const broadcastsRef = collection(db, `artifacts/${appId}/broadcasts`);
        const broadcastsQuery = query(broadcastsRef, orderBy('timestamp', 'desc'));
        unsubBroadcasts = onSnapshot(broadcastsQuery, (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...d.data(), isBroadcast: true }));
          setBroadcasts(items);
          // merge into notifications list along with personal
          setNotifications((currentPersonal) => {
            const personalOnly = (currentPersonal || []).filter((n) => !n.isBroadcast);
            return [...items, ...personalOnly];
          });
        });

        // Only redirect if user is not on the correct route and needs to complete profile
        // For admin users, don't force redirect - let them navigate freely
        if (userData.role !== 'admin' && (!userData.address || !userData.address.flat)) {
          // Only redirect if not already on profile completion page
          if (location.pathname !== '/profile/complete') {
            navigate("/profile/complete");
          }
        } else {
          // Redirect to home after successful login
          if (location.pathname.includes('/account/login') || location.pathname.includes('/admin/login')) {
            navigate("/");
          }
        }
        
      } else {
        setUser(null);
        setCart([]);
        setWishlist([]);
        setNotifications([]);
      }
      setLoading(false);
      setIsAuthLoading(false);
    });

    return () => {
      unsubscribe();
      unsubCart();
      unsubWishlist();
      unsubNotifications();
      try { unsubBroadcasts && unsubBroadcasts(); } catch (e) {}
    };
  }, [db, navigate]); // Removed location.pathname dependency to prevent infinite loops

  // Function to detect mobile device
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
  };

  // ----- Favicon spinner helpers -----
  const setFavicon = (href) => {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = href;
  };

  const startFaviconSpinner = () => {
    if (faviconSpinnerIntervalRef.current) return; // already spinning
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    faviconSpinnerIntervalRef.current = setInterval(() => {
      const angle = (faviconAngleRef.current += 0.25); // radians per tick
      ctx.clearRect(0, 0, size, size);

      // Background circle
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Outer ring
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 6;
      ctx.stroke();

      // Progress arc
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 4, angle, angle + Math.PI * 1.1);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();

      setFavicon(canvas.toDataURL('image/png'));
    }, 80);
  };

  const stopFaviconSpinner = () => {
    if (faviconSpinnerIntervalRef.current) {
      clearInterval(faviconSpinnerIntervalRef.current);
      faviconSpinnerIntervalRef.current = null;
    }
    // Optionally restore original favicon if you have one cached
  };

  const beginActivity = () => {
    setGlobalBusyCount((c) => {
      const next = c + 1;
      if (next === 1) startFaviconSpinner();
      return next;
    });
  };

  const endActivity = () => {
    setGlobalBusyCount((c) => {
      const next = Math.max(0, c - 1);
      if (next === 0) stopFaviconSpinner();
      return next;
    });
  };

  const withActivity = async (fnOrPromise) => {
    beginActivity();
    try {
      if (typeof fnOrPromise === 'function') {
        return await fnOrPromise();
      }
      return await fnOrPromise;
    } finally {
      endActivity();
    }
  };

  const handleGoogleLogin = async (isAdminLogin = false) => {
    try {
      setIsAuthLoading(true);
      const provider = new GoogleAuthProvider();
      
      // Use redirect for mobile devices, popup for desktop
      if (isMobileDevice()) {
        // For mobile devices, use redirect
        alert('Redirecting to Google for authentication... Please wait.');
        await signInWithRedirect(auth, provider);
        // The redirect will happen, and we'll handle the result in useEffect
        return;
      } else {
        // For desktop devices, use popup
        const result = await signInWithPopup(auth, provider);
        
        if (result.user) {
          // Check if user already exists and has a role
          const userDocRef = doc(db, `artifacts/${appId}/users/${result.user.uid}/profile`, 'details');
          const docSnap = await getDoc(userDocRef);
          
          if (docSnap.exists()) {
            const existingRole = docSnap.data().role;
            
            // If user is admin but trying to login through regular user login
            if (existingRole === 'admin' && !isAdminLogin) {
              await signOut(auth);
              alert("Admin accounts must use the 'Login as Admin' option. Please use the admin login page.");
              return;
            }
            
            // If user is regular user but trying to login through admin login
            if (existingRole === 'user' && isAdminLogin) {
              await signOut(auth);
              alert("Regular user accounts cannot login as admin. Please use the regular user login page.");
              return;
            }
          }
          
          const userProfile = {
            firstName: result.user.displayName?.split(' ')[0] || '',
            lastName: result.user.displayName?.split(' ').slice(1).join(' ') || '',
            email: result.user.email,
            role: isAdminLogin ? 'admin' : 'user'
          };
          
          // Save to private profile
          await setDoc(userDocRef, userProfile, { merge: true });
          
          // Also save to public users collection for admin access
          try {
            const publicUserDocRef = doc(db, `artifacts/${appId}/publicUsers/${result.user.uid}`);
            await setDoc(publicUserDocRef, {
              ...userProfile,
              createdAt: new Date(),
              status: 'active'
            }, { merge: true });
          } catch (publicErr) {
            console.log('Could not create public user entry:', publicErr);
            // Continue anyway - this is not critical
          }
          
          // Success message
          if (isAdminLogin) {
            alert('Admin login successful! Welcome to MyShop Admin!');
            navigate('/admin');
          } else {
            alert('Login successful! Welcome to MyShop!');
            // Regular users will be handled by the auth state listener
          }
        }
      }
    } catch (error) {
      console.error('Google login error:', error);
      let errorMessage = 'Google login failed! ';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage += 'Login popup was closed. Please try again.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage += 'Login popup was blocked. Please allow popups and try again.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage += 'Login was cancelled. Please try again.';
      } else if (error.code === 'auth/redirect-cancelled-by-user') {
        errorMessage += 'Login was cancelled. Please try again.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      alert(errorMessage);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Wrapper functions for cart and wishlist with authentication checks
  const handleAddToCart = (product, quantity = 1) => {
    if (!user) {
      alert('Please log in to add items to your cart.');
      navigate('/account/login');
      return;
    }
    addToCart(product, quantity);
  };

  const handleAddToWishlist = (product) => {
    if (!user) {
      alert('Please log in to add items to your wishlist.');
      navigate('/account/login');
      return;
    }
    addToWishlist(product);
  };

  const handleLogout = async () => {
    try {
      setIsAuthLoading(true);
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsAuthLoading(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (!user) return;

    const confirmed = window.confirm("Are you sure you want to delete your account? This action is permanent and cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert("No authenticated user found.");
        return;
      }

      const email = currentUser.email;
      if (!email) {
        alert("Your account does not have an email associated. Please re-login and try again.");
        return;
      }

      const password = window.prompt("Please enter your password to confirm deletion:");
      if (!password) {
        alert("Password is required to delete your account.");
        return;
      }

      const credential = EmailAuthProvider.credential(email, password);
      await reauthenticateWithCredential(currentUser, credential);

      await deleteUser(currentUser);
      alert("Account deleted successfully.");
      navigate('/');
    } catch (error) {
      console.error("Error deleting account:", error);
      let message = "Failed to delete account.";
      if (error && error.code) {
        switch (error.code) {
          case 'auth/wrong-password':
            message = "Incorrect password. Please try again.";
            break;
          case 'auth/too-many-requests':
            message = "Too many attempts. Please try again later.";
            break;
          case 'auth/requires-recent-login':
            message = "For security, please log out and log back in, then try again.";
            break;
          default:
            message = `Failed to delete account. ${error.message || ''}`;
        }
      }
      alert(message);
    }
  };

  const handleTraditionalLogin = async ({ email, password }) => {
    try {
      setIsAuthLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if the user is an admin
      const userDocRef = doc(db, `artifacts/${appId}/users/${userCredential.user.uid}/profile`, 'details');
      const docSnap = await getDoc(userDocRef);
      
      if (docSnap.exists() && docSnap.data().role === 'admin') {
        // Admin trying to login through regular user login
        await signOut(auth);
        alert("Admin accounts must use the 'Login as Admin' option. Please use the admin login page.");
        return;
      }
      
      // Success - user will be redirected by auth state listener
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "Login failed. ";
      
      if (error.code === 'auth/user-not-found') {
        errorMessage += "No account found with this email. Please sign up first.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage += "Incorrect password. Please try again.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage += "Please enter a valid email address.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage += "Too many failed attempts. Please try again later.";
      } else {
        errorMessage += error.message || "Please try again.";
      }
      
      alert(errorMessage);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleTraditionalSignup = async ({ name, email, password }) => {
    try {
      setIsAuthLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const [firstName, ...lastName] = name.split(' ');
      const userDocRef = doc(db, `artifacts/${appId}/users/${userCredential.user.uid}/profile`, 'details');
      
      const userProfile = {
        firstName,
        lastName: lastName.join(' '),
        email: userCredential.user.email,
        address: ''
      };
      
      // Save to private profile
      await setDoc(userDocRef, userProfile);
      
      // Also save to public users collection for admin access
      try {
        const publicUserDocRef = doc(db, `artifacts/${appId}/publicUsers/${userCredential.user.uid}`);
        await setDoc(publicUserDocRef, {
          ...userProfile,
          createdAt: new Date(),
          status: 'active'
        });
      } catch (publicErr) {
        console.log('Could not create public user entry:', publicErr);
        // Continue anyway - this is not critical
      }
      
      // Success - user will be redirected by auth state listener
      alert("Account created successfully! Welcome to MyShop!");
      
    } catch (error) {
      console.error("Sign up error:", error);
      let errorMessage = "Sign up failed. ";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage += "This email is already registered. Please try logging in instead.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage += "Password should be at least 6 characters long.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage += "Please enter a valid email address.";
      } else {
        errorMessage += error.message || "Please try again.";
      }
      
      alert(errorMessage);
    } finally {
      setIsAuthLoading(false);
    }
  };
  
  const handleAdminLogin = async ({ email, password }) => {
    try {
      setIsAuthLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      // Success - user will be redirected by auth state listener
    } catch (error) {
      console.error("Admin login error:", error);
      let errorMessage = "Admin login failed. ";
      
      if (error.code === 'auth/user-not-found') {
        errorMessage += "No admin account found with this email. Please sign up first.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage += "Incorrect password. Please try again.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage += "Please enter a valid email address.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage += "Too many failed attempts. Please try again later.";
      } else {
        errorMessage += error.message || "Please try again.";
      }
      
      alert(errorMessage);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAdminSignup = async ({ name, email, password }) => {
    try {
      setIsAuthLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const [firstName, ...lastName] = name.split(' ');
      const userDocRef = doc(db, `artifacts/${appId}/users/${userCredential.user.uid}/profile`, 'details');
      
      const adminProfile = {
        firstName,
        lastName: lastName.join(' '),
        email: userCredential.user.email,
        role: 'admin'
      };
      
      // Save to private profile
      await setDoc(userDocRef, adminProfile);
      
      // Also save to public users collection for admin access
      try {
        const publicUserDocRef = doc(db, `artifacts/${appId}/publicUsers/${userCredential.user.uid}`);
        await setDoc(publicUserDocRef, {
          ...adminProfile,
          createdAt: new Date(),
          status: 'active'
        });
      } catch (publicErr) {
        console.log('Could not create public admin entry:', publicErr);
        // Continue anyway - this is not critical
      }
      
      // Success - user will be redirected by auth state listener
      alert("Admin account created successfully! Welcome to MyShop Admin!");
      
    } catch (error) {
      console.error("Admin sign up error:", error);
      let errorMessage = "Admin sign up failed. ";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage += "This email is already registered. Please try logging in instead.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage += "Password should be at least 6 characters long.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage += "Please enter a valid email address.";
      } else {
        errorMessage += error.message || "Please try again.";
      }
      
      alert(errorMessage);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAdminForgotPassword = async (email) => {
    try {
      setIsAuthLoading(true);
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Please check your inbox.");
      setIsAuthLoading(false);
      navigate("/admin/login");
    } catch (error) {
      setIsAuthLoading(false);
      alert("Error sending password reset email: " + error.message);
      console.error("Password reset error:", error);
    }
  };

  const handleUpdateProfile = async (profileData) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile`, 'details');
      await setDoc(userDocRef, profileData, { merge: true });
      
      // Also update the public users collection for admin access
      try {
        const publicUserDocRef = doc(db, `artifacts/${appId}/publicUsers/${user.uid}`);
        await setDoc(publicUserDocRef, profileData, { merge: true });
      } catch (publicErr) {
        console.log('Could not update public user entry:', publicErr);
        // Continue anyway - this is not critical
      }
      
      setUser(prevUser => ({ ...prevUser, ...profileData }));
      setLoading(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const filteredProducts = getAllProducts().filter((p) => {
    // Handle both 'name' (hardcoded products) and 'title' (admin products)
    const productName = p.name || p.title || '';
    return productName.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  async function addToCart(product, quantity) {
    if (!user) {
      alert('Please log in to add items to your cart.');
      return;
    }
    const cartDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/cart`, 'items');
    
    const updatedCart = cart && product && product.id && cart.some(item => item.product.id === product.id)
      ? cart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item)
      : [...(cart || []), { product, quantity }];

    try {
      await setDoc(cartDocRef, { items: updatedCart });
    } catch (error) {
      console.error("Error adding to cart: ", error);
      alert("Failed to add to cart.");
    }
  }

  async function updateQuantity(productId, quantity) {
    if (!user) return;
    const cartDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/cart`, 'items');
    
    const updatedCart = (cart || []).map((item) =>
      item.product && item.product.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item
    );
    
    try {
      await setDoc(cartDocRef, { items: updatedCart });
    } catch (error) {
      console.error("Error updating cart quantity: ", error);
    }
  }

  async function removeItem(productId) {
    if (!user) return;
    const cartDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/cart`, 'items');
    
    const updatedCart = (cart || []).filter((item) => item.product && item.product.id !== productId);
    
    try {
      await setDoc(cartDocRef, { items: updatedCart });
    } catch (error) {
      console.error("Error removing item from cart: ", error);
    }
  }

  // Wishlist functions
  async function addToWishlist(product) {
    if (!user) {
      alert('Please log in to add items to your wishlist.');
      return;
    }
    const wishlistDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/wishlist`, 'items');
    
    // Check if product is already in wishlist
    const isInWishlist = wishlist && product && product.id && wishlist.some(item => item.id === product.id);
    
    let updatedWishlist;
    if (isInWishlist) {
      // Remove from wishlist
      updatedWishlist = (wishlist || []).filter(item => item.id !== product.id);
    } else {
      // Add to wishlist
      updatedWishlist = [...(wishlist || []), product];
    }

    try {
      await setDoc(wishlistDocRef, { items: updatedWishlist });
      // Removed alert - user will see visual feedback through the heart icon color change
    } catch (error) {
      console.error("Error updating wishlist: ", error);
      alert("Failed to update wishlist.");
    }
  }

  async function removeFromWishlist(productId) {
    if (!user) return;
    const wishlistDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/wishlist`, 'items');
    
    const updatedWishlist = (wishlist || []).filter((item) => item.id !== productId);
    
    try {
      await setDoc(wishlistDocRef, { items: updatedWishlist });
    } catch (error) {
      console.error("Error removing item from wishlist: ", error);
    }
  }

  // Email notification function
  async function sendEmailNotification(email, title, message) {
    try {
      // Using a simple email service (you can replace this with your preferred service)
      // For now, we'll simulate email sending and provide instructions
      console.log(`Email notification would be sent to ${email}:`);
      console.log(`Subject: ${title}`);
      console.log(`Message: ${message}`);
      
      // TODO: Replace with actual email service
      // Options:
      // 1. EmailJS (https://www.emailjs.com/) - Easy to set up
      // 2. SendGrid (https://sendgrid.com/) - Professional service
      // 3. Nodemailer with your own backend
      // 4. Firebase Functions with SendGrid
      
      // For now, we'll just log the email details
      // In production, replace this with actual email sending code
      
    } catch (error) {
      console.error(`Error sending email to ${email}:`, error);
      // Don't throw error to prevent blocking other notifications
    }
  }

  // Mark all notifications as read
  const markNotificationsAsRead = async () => {
    if (!user) return;
    
    try {
      // Update local state immediately for better UX
      if (notifications && notifications.length > 0) {
        const updatedNotifications = notifications.map(item => ({
          ...item,
          isRead: true
        }));
        setNotifications(updatedNotifications);
      }
      
      const userRef = doc(db, `artifacts/${appId}/users/${user.uid}/notifications`, 'items');
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const notificationsData = userDoc.data();
        if (notificationsData.items && Array.isArray(notificationsData.items)) {
          // Mark all notifications as read
          const updatedItems = notificationsData.items.map(item => ({
            ...item,
            isRead: true
          }));
          
          await setDoc(userRef, { items: updatedItems }, { merge: true });
        }
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };



  // Admin notification function
  // Utility: run async handlers over an array with concurrency control and progress callback
  async function processInBatches(items, handler, concurrency = 20, onProgress) {
    let inFlight = 0;
    let index = 0;
    let done = 0;
    return new Promise((resolve, reject) => {
      const results = new Array(items.length);
      const launchNext = () => {
        if (done === items.length) return resolve(results);
        while (inFlight < concurrency && index < items.length) {
          const current = index++;
          inFlight++;
          Promise.resolve(handler(items[current], current))
            .then((res) => {
              results[current] = res;
            })
            .catch((err) => {
              results[current] = err;
            })
            .finally(() => {
              inFlight--;
              done++;
              onProgress && onProgress(`Sending ${done}/${items.length}…`);
              if (done === items.length) {
                resolve(results);
              } else {
                launchNext();
              }
            });
        }
      };
      launchNext();
    });
  }

  async function sendNotificationToAllUsers(notification, onProgress) {
    if (!user || user.role !== 'admin') {
      throw new Error('Only admins can send notifications.');
    }

    return withActivity(async () => {
      onProgress && onProgress('Fetching users…');
      // Get all users from public users collection
      const publicUsersRef = collection(db, `artifacts/${appId}/publicUsers`);
      const usersSnapshot = await getDocs(publicUsersRef);
      const allDocs = usersSnapshot.docs;
      const total = allDocs.length;
      if (total === 0) {
        onProgress && onProgress('No users found');
        alert('No users found to notify.');
        return;
      }

      const makeNotificationFor = (uid) => ({
        id: `${Date.now()}_${uid}`,
        title: notification.title,
        message: notification.message,
        timestamp: serverTimestamp(),
        isRead: false,
      });

      onProgress && onProgress(`Sending 0/${total}…`);

      const writeWithTimeout = async (ref, data, ms = 8000) => {
        return Promise.race([
          setDoc(ref, data, { merge: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
        ]);
      };
      // Use direct writes with controlled parallelism to avoid a single batch hang
      const results = await processInBatches(
        allDocs,
        async (docSnap) => {
          const uid = docSnap.id;
          const data = docSnap.data();
          const ref = doc(db, `artifacts/${appId}/users/${uid}/notifications`, 'items');
          try {
            await writeWithTimeout(ref, { items: arrayUnion(makeNotificationFor(uid)) });
          } catch (err) {
            console.error('Write failed for', uid, err);
            // Continue with others
            throw err;
          }
          if (data && data.email) {
            // fire and forget; we do not await email
            Promise.resolve(sendEmailNotification(data.email, notification.title, notification.message)).catch(() => {});
          }
          return true;
        },
        20,
        onProgress
      );

      const failed = results.filter((r) => r instanceof Error);

      // Always write a broadcast copy so all users see it immediately
      let broadcastOk = true;
      try {
        const broadcastsRef = collection(db, `artifacts/${appId}/broadcasts`);
        await setDoc(doc(broadcastsRef), {
          title: notification.title,
          message: notification.message,
          timestamp: serverTimestamp(),
        });
      } catch (e) {
        broadcastOk = false;
        console.warn('Broadcast write failed (non-blocking):', e);
      }

      if (failed.length === 0) {
        alert('Notification sent to all users successfully!');
      } else if (failed.length === results.length && broadcastOk) {
        // All per-user writes failed (likely rules). Fall back to broadcast-only success.
        onProgress && onProgress('Sent via broadcast');
        alert('Notification sent to all users (broadcast). Per-user copies were skipped due to permissions.');
      } else {
        alert(`Notification delivered with ${failed.length} per-user failures. Everyone will still see the broadcast.`);
      }
    });
  }

  function handleSelectProduct(productId) {
    setSearchTerm("");
    navigate(`/product/${productId}`);
  }

  const handleUserForgotPassword = async (email) => {
    if (!email) {
      alert('Please enter your email in the email field first.');
      return;
    }
    try {
      setIsAuthLoading(true);
      await sendPasswordResetEmail(auth, email);
      alert('Password reset email sent! Please check your inbox.');
      navigate('/account/login');
    } catch (error) {
      console.error('Password reset error:', error);
      alert('Error sending password reset email: ' + error.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <>
      <ScrollToTop />
      {(isAuthLoading || loading) && <LoadingOverlay />}
      <div className={`app-container ${(isAuthLoading || loading) ? 'blurred' : ''}`}>
        <Navigation
        cartItemsCount={(cart || []).reduce((sum, i) => sum + (i && i.quantity ? i.quantity : 0), 0)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filteredProducts={filteredProducts}
        onSelectProduct={handleSelectProduct}
        user={user}
        onLogout={handleLogout}
        isAuthLoading={isAuthLoading}
        notifications={notifications}
        wishlist={wishlist}
      />

      <Routes>
        <Route
          path="/"
          element={<Home products={PRODUCTS} onAddToCart={handleAddToCart} cart={cart} user={user} onAddToWishlist={handleAddToWishlist} wishlist={wishlist} />}
        />
        <Route
          path="/products"
          element={<ProductList onAddToCart={handleAddToCart} cart={cart} user={user} onAddToWishlist={handleAddToWishlist} wishlist={wishlist} />}
        />
        <Route
          path="/product/:productId"
          element={<ProductDetail onAddToCart={handleAddToCart} cart={cart} user={user} onAddToWishlist={handleAddToWishlist} wishlist={wishlist} />}
        />
        <Route path="/cart" element={
          loading ? <LoadingOverlay /> :
          user ? 
            <CartPage cart={cart} onUpdateQuantity={updateQuantity} onRemoveItem={removeItem} /> : 
            <Navigate to="/account/login" replace />
        } />
        
        <Route path="/account/login" element={<AccountAuth onGoogleLogin={() => handleGoogleLogin(false)} onTraditionalLogin={handleTraditionalLogin} onTraditionalSignup={handleTraditionalSignup} onForgotPassword={handleUserForgotPassword} isLoading={isAuthLoading} isLoginState={true} onToggleForm={() => navigate('/account/signup')} />} />
        <Route path="/account/signup" element={<AccountAuth onGoogleLogin={() => handleGoogleLogin(false)} onTraditionalLogin={handleTraditionalLogin} onTraditionalSignup={handleTraditionalSignup} onForgotPassword={handleUserForgotPassword} isLoading={isAuthLoading} isLoginState={false} onToggleForm={() => navigate('/account/login')} />} />
        
        <Route path="/admin/login" element={<AdminAuth onGoogleLogin={(isAdmin) => handleGoogleLogin(isAdmin)} onTraditionalLogin={handleAdminLogin} onTraditionalSignup={handleAdminSignup} onForgotPassword={handleAdminForgotPassword} isLoading={isAuthLoading} isLoginState={true} onToggleForm={() => navigate('/admin/signup')} />} />
        <Route path="/admin/signup" element={<AdminAuth onGoogleLogin={(isAdmin) => handleGoogleLogin(isAdmin)} onTraditionalLogin={handleAdminLogin} onTraditionalSignup={handleAdminSignup} onForgotPassword={handleAdminForgotPassword} isLoading={isAuthLoading} isLoginState={false} onToggleForm={() => navigate('/admin/login')} />} />
        
        <Route path="/admin/*" element={
          loading ? <LoadingOverlay /> : (
            user && user.role === 'admin' ? 
              <AdminDashboard db={db} auth={auth} appId={appId} sendNotificationToAllUsers={sendNotificationToAllUsers} /> : 
              <PlaceholderPage title="Admin Access Required" />
          )
        } />

        <Route path="/profile/complete" element={
          loading ? <LoadingOverlay /> :
          user && user.role !== 'admin' ? 
            <CompleteProfile user={user} onUpdateProfile={handleUpdateProfile} /> : 
            <PlaceholderPage title="Please log in." />
        } />
        <Route path="/profile/*" element={
          loading ? <LoadingOverlay /> :
          user ? (
            user.role === 'admin' ? <Navigate to="/admin" replace /> :
            <UserProfile
              user={user}
              onUpdateProfile={handleUpdateProfile}
              onLogout={handleLogout}
              onDeleteAccount={handleDeleteAccount}
              wishlist={wishlist}
              notifications={notifications}
              onRemoveFromWishlist={removeFromWishlist}
              onAddToCart={addToCart}
              onMarkNotificationsAsRead={markNotificationsAsRead}
            />
          ) : (
            <PlaceholderPage title="Please log in to view your profile." />
          )
        } />

        <Route
          path="/track"
          element={<PlaceholderPage title="Track Your Order" />}
        />
        <Route
          path="/return-policy"
          element={<PlaceholderPage title="Return Policy" />}
        />
        <Route path="/about" element={<PlaceholderPage title="About Us" />}
        />
        <Route
          path="/contact"
          element={<PlaceholderPage title="Contact Us" />}
        />
        <Route
          path="/shipping-policy"
          element={<PlaceholderPage title="Shipping Policy" />}
        />
        <Route
          path="/terms"
          element={<PlaceholderPage title="Terms of Service" />}
        />
        <Route path="/faq" element={<PlaceholderPage title="FAQ" />} />
        <Route path="/privacy" element={<PlaceholderPage title="Privacy Policy" />} />
      </Routes>

      <Footer />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');

        :root {
          --primary-color: #f6f6f6;
          --secondary-color: #e3e3e3;
          --accent-green: #283618;
          --text-dark: #283618;
          --text-light: #f6f6f6;
          --border-color: #d1d1d1;
          --shadow-color: rgba(0, 0, 0, 0.1);
          --carousel-blue: #007bff;
          --f-blue: #2874f0;
          --f-light-blue: #e8f0fe;
        }

        /* Global Styles */
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Poppins', sans-serif;
          background: var(--secondary-color);
          color: var(--text-dark);
          line-height: 1.6;
        }

        h1, h2, h3, h4, h5, h6 {
            font-family: 'Playfair Display', serif;
            color: var(--accent-green);
        }

        p, strong, li, a, button, input, label {
            font-family: 'Poppins', sans-serif;
        }

        a {
          color: var(--accent-green);
          text-decoration: none;
        }

        a:hover {
          text-decoration: underline;
        }

        /* Buttons */
        .btn {
          font-family: 'Poppins', sans-serif;
          background: var(--accent-green);
          color: var(--text-light);
          border: none;
          padding: 0.8rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          text-align: center;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px var(--shadow-color);
        }

        /* Responsive Buttons */
        @media (max-width: 768px) {
          .btn {
            padding: 0.7rem 1.25rem;
            font-size: 0.85rem;
          }
        }

        @media (max-width: 480px) {
          .btn {
            padding: 0.6rem 1rem;
            font-size: 0.8rem;
          }
        }

        .btn:hover {
          background: #465330;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 6px 8px var(--shadow-color);
        }
        
        .btn-add {
          background: var(--accent-green);
          color: var(--text-light);
        }

        .btn-add:hover {
          background: #465330;
        }
        
        /* NEW: Temporary animation class */
        .btn-animating {
          background-color: transparent !important;
          color: var(--accent-green) !important;
          border: 2px solid var(--accent-green) !important;
          box-shadow: none !important;
          transition: all 0.2s ease-in-out;
          
        }

        .btn-added {
          background-color: #a3b18a;
          cursor: pointer;
          color: #283618;
        }

        .btn-buy {
          background: #e76f51;
        }

        .btn-buy:hover {
          background: #e76f51;
        }


        .btn-add, .btn-buy, .auth-btn {
          background: var(--accent-green);
        }

        .btn-add:hover, .auth-btn:hover {
          background: #465330;
        }

        .btn-buy:hover {
          background: #465330;
        }

        /* NEW: Button for product detail pages and cards */
        .btn-product-detail {
          background: var(--accent-green);
          color: var(--text-light);
          text-decoration: none;
          padding: 0.8rem 1.5rem;
          border-radius: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px var(--shadow-color);
          font-size: 0.9rem;
        }
        .btn-product-detail:hover {
          background: #465330;
          transform: translateY(-2px);
          box-shadow: 0 6px 8px var(--shadow-color);
          text-decoration: none;
        }

        /* NEW: Button for "View All" on home page */
        .btn-view-all {
          background: none;
          color: var(--text-dark);
          padding: 0.5rem 1rem;
          border: 1px solid var(--accent-green);
          border-radius: 8px;
          transition: background-color 0.3s ease, color 0.3s ease;
          font-size: 0.9rem;
        }
        .btn-view-all:hover {
          background: var(--accent-green);
          color: var(--text-light);
          text-decoration: none;
        }

        .btn-back {
          background: var(--accent-green);
          color: var(--text-light);
        }
        .btn-back:hover {
          background: #465330;
        }

        /* Header & Navigation */
        .header {
          background: var(--primary-color);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          position: sticky;
          top: 0;
          z-index: 2000;
          box-shadow: 0 2px 4px var(--shadow-color);
        }

        /* Responsive Header */
        @media (max-width: 1200px) {
          .header {
            padding: 1rem 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .header {
            padding: 1rem;
          }
        }

        @media (max-width: 480px) {
          .header {
            padding: 0.75rem;
          }
        }

        .nav-left, .nav-center, .nav-right {
          display: flex;
          align-items: center;
        }

        .nav-left {
            flex: 1;
        }

        .nav-center {
            flex: 2;
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
        }

        .nav-right {
            flex: 1;
            justify-content: flex-end;
            position: relative;
        }

        .logo {
          font-family: 'Playfair Display', serif;
          font-weight: bold;
          font-size: 2rem;
          color: var(--accent-green);
          margin-left: 0.5rem;
        }

        @media (max-width: 768px) {
          .logo {
            font-size: 1.75rem;
          }
        }

        @media (max-width: 480px) {
          .logo {
            font-size: 1.5rem;
            margin-left: 0.25rem;
          }
        }

        .hamburger-btn {
          font-size: 1.5rem;
          background: none;
          border: none;
          color: var(--accent-green);
          cursor: pointer;
          user-select: none;
          transition: color 0.2s ease;
        }

        .hamburger-btn:hover {
          color: #465330;
        }

        .hamburger-btn[aria-expanded="true"] {
          color: #e76f51;
        }

        .hamburger-btn .icon {
          width: 24px;
          height: 24px;
        }

        /* Desktop Search Container */
        .desktop-search-container {
          display: block;
        }

        .mobile-search-container {
          display: none;
          position: relative;
        }

        .search-container {
          position: relative;
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
        }

        @media (max-width: 1200px) {
          .search-container {
            max-width: 350px;
          }
        }

        @media (max-width: 768px) {
          .desktop-search-container {
            display: none;
          }
          
          .mobile-search-container {
            display: block;
          }
          
          .mobile-search-toggle {
            width: 50px;
            height: 50px;
          }

          /* Mobile Authentication Improvements */
          .auth-container {
            padding: 1rem;
          }

          .auth-card {
            margin: 1rem 0;
            padding: 1.5rem;
          }

          .btn-google {
            padding: 12px 20px;
            font-size: 1rem;
            margin: 1rem 0;
          }

          .btn-google img {
            width: 20px;
            height: 20px;
            margin-right: 12px;
          }
        }

        @media (max-width: 480px) {
          .mobile-search-toggle {
            width: 45px;
            height: 45px;
          }
        }

        /* Desktop Search Icon */
        .desktop-search-icon {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          color: var(--text-dark);
        }

        /* Desktop Search Input */
        .desktop-search-input {
          font-family: 'Poppins', sans-serif;
          width: 100%;
          padding: 10px 15px 10px 45px;
          border-radius: 25px;
          border: 1px solid var(--border-color);
          background: var(--secondary-color);
          color: var(--text-dark);
          font-size: 1rem;
        }

        /* Mobile Search Styles */
        @media (max-width: 768px) {
          .mobile-search-toggle {
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            transition: all 0.3s ease;
            z-index: 10;
          }
          
          .mobile-search-toggle:hover {
            background: var(--secondary-color);
          }
          
          .mobile-search-icon {
            width: 24px;
            height: 24px;
            color: var(--text-dark);
            transition: all 0.3s ease;
          }
          
          .mobile-search-input {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            padding: 10px 15px 10px 45px;
            border-radius: 25px;
            border: 1px solid var(--border-color);
            background: var(--secondary-color);
            color: var(--text-dark);
            font-size: 1rem;
            opacity: 0;
            visibility: hidden;
            transform: scale(0.8);
            transition: all 0.3s ease;
            cursor: text;
          }
          
          .mobile-search-input.mobile-visible {
            opacity: 1;
            visibility: visible;
            transform: scale(1);
            z-index: 5;
          }
          
          .mobile-search-input:focus {
            outline: none;
            border-color: var(--accent-green);
            box-shadow: 0 0 0 2px rgba(40, 54, 24, 0.2);
          }
        }

        /* Floating Mobile Search Overlay */
        .mobile-search-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          z-index: 9999;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 80px;
          animation: fadeIn 0.3s ease;
        }

        .mobile-search-overlay-content {
          background: var(--primary-color);
          width: 90%;
          max-width: 400px;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease;
        }

        .mobile-search-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }

        .mobile-search-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          transition: background-color 0.2s ease;
        }

        .mobile-search-close:hover {
          background: var(--secondary-color);
        }

        .mobile-search-close svg {
          width: 20px;
          height: 20px;
          color: var(--text-dark);
        }

        .mobile-search-header h3 {
          margin: 0;
          color: var(--accent-green);
          font-size: 1.2rem;
        }

        .mobile-search-input-container {
          position: relative;
          margin-bottom: 1rem;
        }

        .mobile-search-input-icon {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          color: var(--text-dark);
        }

        .mobile-search-overlay-input {
          width: 100%;
          padding: 15px 15px 15px 45px;
          border-radius: 25px;
          border: 2px solid var(--border-color);
          background: var(--secondary-color);
          color: var(--text-dark);
          font-size: 1.1rem;
          transition: border-color 0.2s ease;
        }

        .mobile-search-overlay-input:focus {
          outline: none;
          border-color: var(--accent-green);
          box-shadow: 0 0 0 3px rgba(40, 54, 24, 0.2);
        }

        .mobile-search-overlay-results {
          max-height: 300px;
          overflow-y: auto;
        }

        .mobile-search-result-item {
          display: flex;
          align-items: center;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 8px;
          background: var(--secondary-color);
          transition: background-color 0.2s ease;
          text-decoration: none;
          color: inherit;
        }

        .mobile-search-result-item:hover {
          background: var(--border-color);
        }

        .mobile-search-result-image {
          width: 40px;
          height: 40px;
          border-radius: 6px;
          margin-right: 12px;
          object-fit: cover;
        }

        .mobile-search-result-info {
          flex: 1;
        }

        .mobile-search-result-name {
          display: block;
          font-weight: 500;
          margin-bottom: 4px;
          color: var(--text-dark);
        }

        .mobile-search-result-price {
          display: block;
          color: var(--accent-green);
          font-weight: 600;
        }

        /* Animations */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        }

        @media (max-width: 768px) {
          input[type="text"] {
            padding: 8px 12px 8px 40px;
            font-size: 0.9rem;
          }
        }

        @media (max-width: 480px) {
          input[type="text"] {
            padding: 6px 10px 6px 35px;
            font-size: 0.85rem;
          }
        }

        .search-dropdown {
          position: absolute;
          background: var(--primary-color);
          width: 100%;
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid var(--border-color);
          border-top: none;
          z-index: 2000;
          list-style: none;
          padding: 0;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 4px 6px var(--shadow-color);
        }

        @media (max-width: 768px) {
          .search-dropdown {
            max-height: 180px;
          }
          
          .mobile-search-dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--primary-color);
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid var(--border-color);
            border-top: none;
            z-index: 2000;
            list-style: none;
            padding: 0;
            border-radius: 0 0 8px 8px;
            box-shadow: 0 4px 6px var(--shadow-color);
            margin-top: 5px;
          }
        }

        @media (max-width: 480px) {
          .search-dropdown {
            max-height: 160px;
          }
        }

        .search-dropdown li {
          padding: 12px 15px;
          border-bottom: 1px solid var(--border-color);
        }

        @media (max-width: 768px) {
          .search-dropdown li {
            padding: 10px 12px;
          }
        }

        @media (max-width: 480px) {
          .search-dropdown li {
            padding: 8px 10px;
          }
        }

        .search-dropdown li a {
          color: var(--accent-green);
          display: block;
        }

        .search-dropdown li:hover {
          background: var(--secondary-color);
        }

        /* Enhanced search results with images like Flipkart */
        .search-result-item {
          display: flex !important;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: var(--accent-green);
        }

        .search-result-image {
          width: 40px;
          height: 40px;
          object-fit: cover;
          border-radius: 4px;
          border: 1px solid var(--border-color);
        }

        @media (max-width: 768px) {
          .search-result-image {
            width: 35px;
            height: 35px;
          }
        }

        @media (max-width: 480px) {
          .search-result-image {
            width: 30px;
            height: 30px;
          }
        }

        .search-result-info {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .search-result-name {
          font-weight: 500;
          font-size: 0.9rem;
          margin-bottom: 2px;
        }

        .search-result-price {
          font-size: 0.8rem;
          color: var(--accent-green);
          font-weight: 600;
        }

        .nav-icon {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: var(--accent-green);
          cursor: pointer;
          position: relative;
          margin-left: 1rem;
          display: flex;
          align-items: center;
        }

        .nav-icon .icon {
          width: 24px;
          height: 24px;
        }

        .wishlist-icon {
          margin-right: 8px;
        }

        .wishlist-count {
          position: absolute;
          top: -5px;
          right: -8px;
          background: #e76f51;
          color: white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          font-size: 0.7rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }

        .cart-count {
          position: absolute;
          top: -5px;
          right: -8px;
          background: #e76f51; /* A nice coral color for contrast */
          color: white;
          border-radius: 50%;
          font-size: 0.7rem;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Poppins', sans-serif;
        }

        .profile-link {
          position: relative;
        }

        .nav-notification-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #e74c3c;
          color: white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: bold;
          animation: pulse 2s infinite;
        }

        .hamburger-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1999;
          cursor: pointer;
        }

        .hamburger-menu {
          position: fixed;
          top: 70px;
          left: 0;
          width: 250px;
          background: var(--primary-color);
          color: var(--text-dark);
          padding: 1.5rem;
          transform: translateX(-260px);
          transition: transform 0.3s ease;
          z-index: 2000;
          height: calc(100% - 70px);
          overflow-y: auto;
          border-right: 1px solid var(--border-color);
          box-shadow: 4px 0 8px var(--shadow-color);
        }

        .hamburger-close-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          font-size: 1.5rem;
          color: var(--text-dark);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 4px;
          transition: background-color 0.2s ease;
        }

        .hamburger-close-btn:hover {
          background-color: var(--secondary-color);
        }

        .hamburger-menu.open {
          transform: translateX(0);
        }

        .hamburger-menu ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .hamburger-menu li {
          margin-bottom: 1.2rem;
        }

        .hamburger-menu a {
          color: var(--accent-green);
          font-size: 1rem;
        }

        /* NEW Profile Dropdown */
        .profile-menu-container {
            position: relative;
            margin-left: 1rem;
        }
        
        .profile-menu-dropdown {
            position: absolute;
            top: 100%;
            right: 0;
            background: var(--primary-color);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            box-shadow: 0 4px 8px var(--shadow-color);
            min-width: 180px;
            padding: 1rem;
            z-index: 2001;
            display: none;
            flex-direction: column;
            gap: 0.5rem;
            margin-top: 0;
        }
        
        .profile-menu-container.open .profile-menu-dropdown,
        .profile-menu-dropdown.open {
            display: flex;
        }
        
        .profile-menu-dropdown::before {
            content: '';
            position: absolute;
            top: -10px;
            left: 0;
            right: 0;
            height: 10px;
            background: transparent;
        }
        
        .profile-menu-dropdown a, .profile-menu-dropdown button {
            color: var(--text-dark);
            text-decoration: none;
            background: none;
            border: none;
            padding: 0.5rem;
            text-align: left;
            cursor: pointer;
            transition: background-color 0.2s ease;
            border-radius: 4px;
        }
        
        .profile-menu-dropdown a:hover, .profile-menu-dropdown button:hover {
            background-color: var(--secondary-color);
            text-decoration: none;
        }
        
        .dropdown-user-name {
            font-weight: 600;
            padding: 0.5rem;
            color: var(--accent-green);
        }

        /* NEW Profile Link Styling */
        .profile-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--accent-green);
          font-size: 0.9rem;
          font-weight: 500;
          text-decoration: none;
          transition: opacity 0.3s ease;
        }
        .profile-link:hover {
            opacity: 0.8;
            text-decoration: none;
        }
        .profile-name {
          display: none;
        }
        @media (min-width: 768px) {
          .profile-name {
            display: block;
          }
        }
        /* End of new styles */


        /* Main Content */
        .main-content {
          padding: 2rem;
          max-width: 1200px;
          margin: auto;
          min-height: 80vh;
          background: var(--primary-color);
          box-shadow: 0 4px 8px var(--shadow-color);
          margin-top: 1rem;
          border-radius: 8px;
        }

        /* Responsive Main Content */
        @media (max-width: 1200px) {
          .main-content {
            max-width: 95%;
            padding: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .main-content {
            max-width: 98%;
            padding: 1rem;
            margin-top: 0.5rem;
          }
        }

        @media (max-width: 480px) {
          .main-content {
            max-width: 100%;
            padding: 0.75rem;
            margin-top: 0.25rem;
            border-radius: 0;
          }
        }
        
        /* New Product Detail Page Styles */
        .product-detail-full {
          background: var(--secondary-color);
          box-shadow: none;
          border-radius: 0;
          padding: 0;
          max-width: 100%;
        }

        .product-layout {
          display: flex;
          gap: 2rem;
          padding: 2rem;
          background: var(--primary-color);
          border-radius: 8px;
          margin: 2rem auto;
          max-width: 1200px;
          box-shadow: 0 4px 8px var(--shadow-color);
        }

        /* Responsive Product Layout */
        @media (max-width: 1200px) {
          .product-layout {
            max-width: 95%;
            gap: 1.5rem;
            padding: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .product-layout {
            max-width: 98%;
            flex-direction: column;
            gap: 1rem;
            padding: 1rem;
            margin: 1rem auto;
          }
        }

        @media (max-width: 480px) {
          .product-layout {
            max-width: 100%;
            padding: 0.75rem;
            margin: 0.5rem auto;
            border-radius: 0;
          }
        }
        
        .product-main-info {
          flex: 2;
          display: flex;
          gap: 2rem;
          flex-wrap: wrap;
        }

        @media (max-width: 768px) {
          .product-main-info {
            flex-direction: column;
            gap: 1rem;
          }
        }

        @media (max-width: 480px) {
          .product-main-info {
            gap: 0.75rem;
          }
        }

        .product-media {
          flex: 1;
        }

        .product-media img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }
        
        .product-details-content {
          flex: 1;
        }

        .product-title {
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        @media (max-width: 768px) {
          .product-title {
            font-size: 1.75rem;
            margin-bottom: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .product-title {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
          }
        }

        .product-description {
          font-size: 1.1rem;
          line-height: 1.6;
        }
        
        .product-sidebar {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .price-details-card {
          background: var(--primary-color);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
          box-shadow: 0 2px 4px var(--shadow-color);
        }

        .price-details-title {
          font-size: 1.2rem;
          color: var(--text-dark);
          font-weight: 600;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
        }
        
        .price-line {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
        }
        
        .price-line.total-amount {
          font-weight: 600;
          font-size: 1.2rem;
          color: var(--accent-green);
        }
        
        .price-divider {
          border-top: 1px dashed var(--border-color);
          margin: 0.5rem 0;
        }

        .text-green {
          color: #26a541; /* Green color for discounts */
        }
        
        .product-detail-bottom {
          padding: 0 2rem;
          max-width: 1200px;
          margin: auto;
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .actions button {
          width: 100%;
        }

        .quantity-input {
          display: flex;
          align-items: center;
          gap: 1rem;
          justify-content: center;
        }
        
        /* Existing Product Detail and other styles below */
        
        .main-title {
          font-size: 2.5rem;
          text-align: center;
          margin-bottom: 2rem;
        }

        @media (max-width: 1200px) {
          .main-title {
            font-size: 2.25rem;
          }
        }

        @media (max-width: 768px) {
          .main-title {
            font-size: 2rem;
            margin-bottom: 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .main-title {
            font-size: 1.75rem;
            margin-bottom: 1rem;
          }
        }

        .section-title {
          font-family: 'Poppins', sans-serif;
          font-size: 1.2rem;
          color: #555;
          margin-top: 0;
          margin-bottom: 1rem;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .section-title {
            font-size: 1.1rem;
            margin-bottom: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .section-title {
            font-size: 1rem;
            margin-bottom: 0.5rem;
          }
        }

        /* Product Grid */
        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2rem;
          margin-top: 2rem;
        }

        /* Responsive Product Grid */
        @media (max-width: 1200px) {
          .product-grid {
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .product-grid {
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 1rem;
            margin-top: 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .product-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
            margin-top: 1rem;
          }
        }

        .product-card {
          background: var(--secondary-color);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 4px 8px var(--shadow-color);
        }

        @media (max-width: 768px) {
          .product-card {
            padding: 0.75rem;
            border-radius: 8px;
          }
        }

        @media (max-width: 480px) {
          .product-card {
            padding: 0.5rem;
            border-radius: 6px;
          }
        }

        .product-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 12px var(--shadow-color);
        }

        .product-card-image {
          width: 100%;
          height: 200px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        @media (max-width: 768px) {
          .product-card-image {
            height: 180px;
            margin-bottom: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .product-card-image {
            height: 160px;
            margin-bottom: 0.5rem;
          }
        }

        .product-card-content h3 {
          font-size: 1.2rem;
          margin: 0;
          color: var(--text-dark);
        }

        .product-card-content p {
          margin: 0.5rem 0;
          font-size: 1.1rem;
          color: var(--accent-green);
        }

        @media (max-width: 768px) {
          .product-card-content h3 {
            font-size: 1.1rem;
          }

          .product-card-content p {
            font-size: 1rem;
            margin: 0.4rem 0;
          }
        }

        @media (max-width: 480px) {
          .product-card-content h3 {
            font-size: 1rem;
          }

          .product-card-content p {
            font-size: 0.9rem;
            margin: 0.3rem 0;
          }
        }

        .product-card-actions {
          margin-top: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        @media (max-width: 768px) {
          .product-card-actions {
            margin-top: 0.75rem;
            gap: 0.4rem;
          }
        }

        @media (max-width: 480px) {
          .product-card-actions {
            margin-top: 0.5rem;
            gap: 0.3rem;
            flex-direction: column;
            align-items: stretch;
          }
        }
        
        .faqs {
          margin-top: 4rem;
        }

        .faqs ul {
          list-style: none;
          padding: 0;
        }

        .faqs li {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .faqs li strong {
          display: block;
          color: var(--accent-green);
          margin-bottom: 0.5rem;
          font-size: 1.2rem;
        }

        .faqs li p {
          color: var(--text-dark);
        }

        .related-products {
          margin-top: 4rem;
        }

        .related-products .product-grid.small {
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1rem;
        }

        .product-card.small {
          padding: 1rem;
        }

        .product-card.small h4 {
          font-size: 1rem;
          margin: 0;
          color: var(--text-dark);
        }

        .product-card-image.small {
          height: 120px;
        }

        /* New Full-Page Cart Styles */
        .cart-full-page {
          background: var(--secondary-color);
          box-shadow: none;
          border-radius: 0;
          padding: 2rem;
        }
        
        .cart-layout {
          display: flex;
          gap: 2rem;
          max-width: 1200px;
          margin: 2rem auto;
        }

        /* Responsive Cart Layout */
        @media (max-width: 1200px) {
          .cart-layout {
            max-width: 95%;
            gap: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .cart-layout {
            max-width: 98%;
            flex-direction: column;
            gap: 1rem;
            margin: 1rem auto;
          }
        }

        @media (max-width: 480px) {
          .cart-layout {
            max-width: 100%;
            gap: 0.75rem;
            margin: 0.5rem auto;
          }
        }
        
        .cart-items-list {
          flex: 2;
          background: var(--primary-color);
          border-radius: 8px;
          padding: 2rem;
          box-shadow: 0 4px 8px var(--shadow-color);
        }
        
        .cart-item-card {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          border-bottom: 1px solid var(--border-color);
          padding: 1rem 0;
        }
        
        .cart-item-image-full {
          width: 100px;
          height: 100px;
          object-fit: cover;
          border-radius: 8px;
        }
        
        .cart-item-details-full {
          flex: 1;
        }

        .cart-item-details-full h3 {
          font-size: 1.2rem;
          margin: 0;
        }

        .cart-item-details-full p {
          margin: 0.5rem 0;
        }

        .cart-item-controls-full {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 1rem;
        }
        
        .cart-item-controls-full input {
          width: 60px;
          text-align: center;
        }

        /* Mobile improvements for full-page cart */
        @media (max-width: 768px) {
          .cart-items-list {
            padding: 1rem;
          }

          .cart-item-card {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }

          .cart-item-details-full {
            width: 100%;
          }

          .cart-item-controls-full {
            width: 100%;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 0.5rem;
          }

          .cart-item-controls-full label {
            margin-right: 0.5rem;
          }

          .remove-btn {
            margin-left: auto;
            font-size: 0.95rem;
          }
        }

        @media (max-width: 480px) {
          .cart-item-image-full {
            width: 56px;
            height: 56px;
          }

          .cart-item-controls-full input {
            width: 48px;
          }

          .btn-checkout-full {
            width: 100%;
          }
        }

        .remove-btn {
          background: none;
          color: #e76f51;
          border: none;
          cursor: pointer;
          font-weight: 500;
        }
        
        .flex-end-btn-container {
          display: flex;
          justify-content: flex-end;
          padding-top: 2rem;
        }

        .btn-checkout-full {
          font-size: 1rem;
          font-weight: 600;
          padding: 1rem 2rem;
        }

        .price-details-sidebar {
          flex: 1;
        }
        
        .empty-cart-message-full {
          text-align: center;
          font-size: 1.2rem;
          padding: 4rem 0;
        }
        
        /* Cart Sidebar */
        .cart-sidebar {
          position: fixed;
          right: 0;
          top: 0;
          width: 350px;
          max-width: 100%;
          height: 100%;
          background: var(--primary-color);
          box-shadow: -6px 0 12px var(--shadow-color);
          padding: 2rem 1.5rem;
          z-index: 2500;
          overflow-y: auto;
          border-left: 1px solid var(--border-color);
          display: none; /* Hide old sidebar */
        }

        @media (max-width: 768px) {
          .cart-sidebar {
            width: 100%;
            max-width: 100%;
          }
        }

        @media (max-width: 480px) {
          .cart-sidebar {
            padding: 1rem;
          }
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 2rem;
          cursor: pointer;
          float: right;
          color: var(--text-dark);
        }

        .cart-items {
          list-style: none;
          padding: 0;
          margin: 1.5rem 0;
          max-height: 60vh;
          overflow-y: auto;
        }

        .cart-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 0;
          border-bottom: 1px solid var(--border-color);
        }

        @media (max-width: 768px) {
          .cart-item {
            padding: 0.75rem 0;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }

        @media (max-width: 480px) {
          .cart-item {
            padding: 0.5rem 0;
            gap: 0.4rem;
          }
        }

        .cart-item-details {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        @media (max-width: 768px) {
          .cart-item-details {
            gap: 0.75rem;
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .cart-item-details {
            gap: 0.5rem;
          }
        }

        .cart-item-image {
          width: 80px;
          height: 60px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }

        @media (max-width: 768px) {
          .cart-item-image {
            width: 70px;
            height: 50px;
          }
        }

        @media (max-width: 480px) {
          .cart-item-image {
            width: 60px;
            height: 45px;
          }
        }

        .cart-item strong {
          color: var(--accent-green);
        }

        .cart-item p {
          color: var(--text-dark);
          margin: 0;
        }

        .cart-item-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        @media (max-width: 768px) {
          .cart-item-controls {
            gap: 0.4rem;
            width: 100%;
            justify-content: flex-end;
          }
        }

        @media (max-width: 480px) {
          .cart-item-controls {
            gap: 0.3rem;
          }
        }

        .cart-item-controls input {
          width: 50px;
          padding: 0.2rem;
          font-size: 1rem;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          background: var(--secondary-color);
          color: var(--text-dark);
          text-align: center;
        }

        @media (max-width: 768px) {
          .cart-item-controls input {
            width: 45px;
            padding: 0.15rem;
            font-size: 0.9rem;
          }
        }

        @media (max-width: 480px) {
          .cart-item-controls input {
            width: 40px;
            padding: 0.1rem;
            font-size: 0.85rem;
          }
        }

        .remove-btn {
          background: none;
          border: none;
          font-size: 1.1rem;
          color: #e76f51;
          cursor: pointer;
        }

        .cart-total {
          font-weight: bold;
          font-size: 1.5rem;
          text-align: right;
          margin-bottom: 1.5rem;
          color: var(--accent-green);
        }

        @media (max-width: 768px) {
          .cart-total {
            font-size: 1.25rem;
            margin-bottom: 1.25rem;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .cart-total {
            font-size: 1.1rem;
            margin-bottom: 1rem;
          }
        }

        .empty-cart-message {
          text-align: center;
          margin: 4rem 0;
          font-size: 1.2rem;
          color: var(--text-dark);
        }

        @media (max-width: 768px) {
          .empty-cart-message {
            margin: 3rem 0;
            font-size: 1.1rem;
          }
        }

        @media (max-width: 480px) {
          .empty-cart-message {
            margin: 2rem 0;
            font-size: 1rem;
          }
        }

        /* Footer */
        .footer-desktop {
          background: var(--accent-green);
          color: var(--text-light);
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 2rem;
          padding: 3rem 2rem;
          margin-top: 2rem;
        }

        .footer-mobile {
          display: none;
        }

        /* Responsive Footer */
        @media (max-width: 1200px) {
          .footer-desktop {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            padding: 2.5rem 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .footer-desktop {
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 1rem;
            padding: 2rem 1rem;
            margin-top: 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .footer-desktop {
            display: none;
          }
          
          .footer-mobile {
            display: block;
            background: var(--accent-green);
            color: var(--text-light);
            padding: 1.5rem 1rem;
            margin-top: 1rem;
            text-align: center;
          }

          .social-icons-mobile {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 2rem;
          }

          .social-icon-mobile {
            color: var(--text-light);
            transition: transform 0.2s ease, opacity 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
          }

          .social-icon-mobile:hover {
            transform: scale(1.1);
            opacity: 0.8;
            background: rgba(255, 255, 255, 0.2);
          }
        }

        .footer-section h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 1.5rem;
          color: var(--text-light);
        }

        .footer-section p, .footer-section li {
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .footer-section ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .footer-section ul li {
          margin-bottom: 0.8rem;
        }

        .footer-section a {
          color: var(--text-light);
        }

        /* Home Page Styles */
        .home-page {
          padding: 0;
          margin: 0;
          max-width: none;
          background: var(--primary-color);
          box-shadow: none;
        }

        .carousel-section {
          width: 100%;
          height: 500px;
          position: relative;
          text-align: center;
          overflow: hidden;
        }

        /* Responsive Carousel */
        @media (max-width: 1200px) {
          .carousel-section {
            height: 450px;
          }
        }

        @media (max-width: 768px) {
          .carousel-section {
            height: 400px;
          }
        }

        @media (max-width: 480px) {
          .carousel-section {
            height: 300px;
          }
        }

        .carousel-container {
          position: relative;
          height: 100%;
          width: 100%;
        }

        .carousel-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .carousel-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: var(--text-dark);
          text-shadow: none;
          width: 90%;
        }

        .carousel-text h2.carousel-title {
          font-size: 3rem;
          color: var(--text-dark); /* Corrected color */
          margin-bottom: 1rem;
        }

        .carousel-text p {
          font-size: 1.2rem;
          margin-bottom: 2rem;
        }

        /* Responsive Carousel Text */
        @media (max-width: 1200px) {
          .carousel-text h2.carousel-title {
            font-size: 2.5rem;
          }

          .carousel-text p {
            font-size: 1.1rem;
            margin-bottom: 1.75rem;
          }
        }

        @media (max-width: 768px) {
          .carousel-text h2.carousel-title {
            font-size: 2rem;
            margin-bottom: 0.75rem;
          }

          .carousel-text p {
            font-size: 1rem;
            margin-bottom: 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .carousel-text h2.carousel-title {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
          }

          .carousel-text p {
            font-size: 0.9rem;
            margin-bottom: 1rem;
          }
        }

        .carousel-dots {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 10px;
        }

        .carousel-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          border: 1px solid var(--text-dark);
          transition: background-color 0.3s ease;
        }

        .carousel-dot.active {
          background-color: var(--text-dark);
        }


        .home-products-section {
          padding: 2rem;
          max-width: 1200px;
          margin: auto;
          background: var(--primary-color);
          border-radius: 8px;
          margin-top: 2rem;
          box-shadow: 0 4px 8px var(--shadow-color);
        }

        /* Responsive Home Products Section */
        @media (max-width: 1200px) {
          .home-products-section {
            max-width: 95%;
            padding: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .home-products-section {
            max-width: 98%;
            padding: 1rem;
            margin-top: 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .home-products-section {
            max-width: 100%;
            padding: 0.75rem;
            margin-top: 1rem;
            border-radius: 0;
          }
        }

        .flex-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .flex-header .section-title {
          margin-top: 0;
          margin-bottom: 0;
        }

        .reviews-section {
          background: var(--secondary-color);
          padding: 4rem 2rem;
          margin-top: 2rem;
          text-align: center;
        }

        /* Responsive Reviews Section */
        @media (max-width: 1200px) {
          .reviews-section {
            padding: 3rem 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .reviews-section {
            padding: 2rem 1rem;
            margin-top: 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .reviews-section {
            padding: 1.5rem 0.75rem;
            margin-top: 1rem;
          }
        }

        .reviews-section .section-title {
          margin-top: 0;
        }

        .reviews-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        /* Responsive Reviews Container */
        @media (max-width: 1200px) {
          .reviews-container {
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .reviews-container {
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
          }
        }

        @media (max-width: 480px) {
          .reviews-container {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }

        .review-card {
          background: var(--primary-color);
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 8px var(--shadow-color);
        }

        .review-card h3 {
          color: var(--accent-green);
          font-size: 1.3rem;
          margin-bottom: 0.5rem;
        }

        .review-card p {
          font-style: italic;
        }

        .about-sections {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          padding: 4rem 2rem;
          max-width: 1200px;
          margin: auto;
        }

        /* Responsive About Sections */
        @media (max-width: 1200px) {
          .about-sections {
            max-width: 95%;
            padding: 3rem 1.5rem;
            gap: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .about-sections {
            max-width: 98%;
            padding: 2rem 1rem;
            gap: 1rem;
          }
        }

        @media (max-width: 480px) {
          .about-sections {
            max-width: 100%;
            padding: 1.5rem 0.75rem;
            gap: 1rem;
            grid-template-columns: 1fr;
          }
        }

        .about-card .section-title {
          margin-top: 0;
        }

        /* NEW: Styles for the login/signup section */
        .auth-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: calc(100vh - 160px); /* Adjust based on header/footer height */
            padding: 1rem;
        }
        
        @media (max-width: 768px) {
            .auth-container {
                padding: 0.5rem;
                min-height: calc(100vh - 120px);
            }
            
            .auth-card {
                padding: 1.5rem;
                margin: 0.5rem;
            }
            
            .auth-title {
                font-size: 1.8rem;
            }
            
            .auth-subtitle {
                font-size: 1rem;
                margin-bottom: 1rem;
            }
            
            .auth-form {
                gap: 1rem;
            }
        }
        
        @media (max-width: 480px) {
            .auth-container {
                padding: 0.25rem;
                min-height: calc(100vh - 100px);
            }
            
            .auth-card {
                padding: 0.75rem;
                margin: 0.25rem;
            }
            
            .auth-title {
                font-size: 1.6rem;
                margin-bottom: 0.4rem;
            }
            
            .auth-subtitle {
                font-size: 0.9rem;
                margin-bottom: 0.75rem;
            }
            
            .auth-form {
                gap: 0.75rem;
            }
            
            .divider {
                margin: 1rem 0;
            }
            
            .toggle-form-text {
                margin-top: 1rem;
            }
            
            .auth-btn {
                padding: 0.6rem;
                font-size: 0.9rem;
            }
            
            .btn-google {
                padding: 0.6rem 1rem;
                font-size: 0.9rem;
            }
            
            .btn-google img {
                width: 16px;
                height: 16px;
            }
            
            .auth-form input {
                padding: 8px 10px;
                font-size: 0.9rem;
            }
            
            .password-input-container input {
                padding: 8px 40px 8px 10px;
                font-size: 0.9rem;
            }
        }

        .auth-card {
            background: #fff;
            padding: 2rem;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
        }

        .auth-title {
            font-size: 2rem;
            color: var(--accent-green);
            margin-bottom: 0.5rem;
            font-weight: 700;
            letter-spacing: -0.5px;
        }
        
        .auth-subtitle {
            color: #666;
            margin-bottom: 1.5rem;
            font-size: 1.1rem;
            line-height: 1.5;
        }

        .auth-form {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
        }

        .form-group {
            text-align: left;
        }

        @media (max-width: 768px) {
          .form-group {
            margin-bottom: 0.5rem;
          }
        }

        @media (max-width: 480px) {
          .form-group {
            margin-bottom: 0.4rem;
          }
        }
        
        /* New Styles for password visibility */
        .password-group {
          position: relative;
        }
        
        .password-input-container {
          position: relative;
        }

        .password-input-container input {
            width: 100%;
            padding: 10px 45px 10px 12px; /* More padding on right for button */
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        @media (max-width: 768px) {
          .password-input-container input {
            padding: 8px 40px 8px 10px;
            font-size: 0.9rem;
          }
        }

        @media (max-width: 480px) {
          .password-input-container input {
            padding: 6px 35px 6px 8px;
            font-size: 0.85rem;
          }
        }
        
        .password-input-container input:focus {
            outline: none;
            border-color: var(--accent-green);
            box-shadow: 0 0 0 3px rgba(40, 54, 24, 0.1);
        }
        
        .toggle-password-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          color: #666;
          border-radius: 4px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 768px) {
          .toggle-password-btn {
            padding: 5px;
            right: 6px;
          }
        }

        @media (max-width: 480px) {
          .toggle-password-btn {
            padding: 4px;
            right: 5px;
          }
        }
        
        .toggle-password-btn:hover {
          background-color: rgba(0, 0, 0, 0.05);
          color: var(--accent-green);
        }
        
        .toggle-password-btn:active {
          transform: translateY(-50%) scale(0.95);
        }
        
        .toggle-password-btn .icon {
          width: 18px;
          height: 18px;
          stroke-width: 2;
        }

        @media (max-width: 768px) {
          .toggle-password-btn .icon {
            width: 16px;
            height: 16px;
          }
        }

        @media (max-width: 480px) {
          .toggle-password-btn .icon {
            width: 14px;
            height: 14px;
          }
        }
        /* End of New Styles for password visibility */


        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: #333;
            font-size: 0.95rem;
        }
        
        @media (max-width: 480px) {
            .form-group label {
                margin-bottom: 0.4rem;
                font-size: 0.9rem;
            }
            
            .toggle-password-btn {
                padding: 4px;
            }
            
            .toggle-password-btn .icon {
                width: 16px;
                height: 16px;
            }
        }

        .auth-form input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        
        .auth-form input:focus {
            outline: none;
            border-color: var(--accent-green);
            box-shadow: 0 0 0 3px rgba(40, 54, 24, 0.1);
        }

        .auth-form input::placeholder {
            color: #aaa;
        }

        .auth-btn {
            width: 100%;
            padding: 0.75rem;
            background-color: var(--accent-green);
            color: var(--text-light);
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 1rem;
            letter-spacing: 0.5px;
        }
        
        .auth-btn:hover {
            background-color: #465330;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(40, 54, 24, 0.2);
        }
        
        .auth-btn:active {
            transform: translateY(0);
        }

        .auth-btn:hover {
            background-color: #465330;
        }

        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 1.5rem 0;
          color: #666;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .divider {
            margin: 1.25rem 0;
            font-size: 0.95rem;
          }
        }

        @media (max-width: 480px) {
          .divider {
            margin: 1rem 0;
            font-size: 0.9rem;
          }
        }

        .divider::before, .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid #e0e0e0;
        }

        .divider:not(:empty)::before {
          margin-right: 1rem;
        }

        .divider:not(:empty)::after {
          margin-left: 1rem;
        }

        .btn-google {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #fff;
          color: #333;
          border: 2px solid #e0e0e0;
          padding: 0.75rem 1.25rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          width: 100%;
          border-radius: 8px;
          font-weight: 500;
          transition: all 0.3s ease;
          font-size: 1rem;
        }

        @media (max-width: 768px) {
          .btn-google {
            padding: 0.6rem 1rem;
            font-size: 0.95rem;
          }
        }

        @media (max-width: 480px) {
          .btn-google {
            padding: 0.5rem 0.75rem;
            font-size: 0.9rem;
          }
        }

        .btn-google:hover {
          background-color: #f8f9fa;
          border-color: #d0d0d0;
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          transform: translateY(-1px);
        }
        
        .btn-google:active {
          transform: translateY(0);
        }

        .btn-google img {
          width: 20px;
          margin-right: 10px;
        }

        @media (max-width: 768px) {
          .btn-google img {
            width: 18px;
            margin-right: 8px;
          }
        }

        @media (max-width: 480px) {
          .btn-google img {
            width: 16px;
            margin-right: 6px;
          }
        }

        .toggle-form-text {
            margin-top: 1.5rem;
            font-size: 1rem;
            color: #666;
        }

        @media (max-width: 768px) {
          .toggle-form-text {
            margin-top: 1.25rem;
            font-size: 0.95rem;
          }
        }

        @media (max-width: 480px) {
          .toggle-form-text {
            margin-top: 1rem;
            font-size: 0.9rem;
          }
        }

        .toggle-link {
            color: var(--accent-green);
            font-weight: 600;
            cursor: pointer;
            text-decoration: underline;
            transition: color 0.2s ease;
        }

        @media (max-width: 768px) {
          .toggle-link {
            font-size: 0.95rem;
          }
        }

        @media (max-width: 480px) {
          .toggle-link {
            font-size: 0.9rem;
          }
        }
        
        .toggle-link:hover {
            color: #465330;
        }

        .forgot-password {
            text-align: right;
            margin-bottom: 0.75rem;
        }

        .forgot-password a {
            color: var(--accent-green);
            font-size: 0.95rem;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s ease;
        }

        @media (max-width: 768px) {
          .forgot-password a {
            font-size: 0.9rem;
          }
        }

        @media (max-width: 480px) {
          .forgot-password a {
            font-size: 0.85rem;
          }
        }

        .forgot-password a:hover {
            color: #465330;
            text-decoration: underline;
        }

        /* NEW: Loading Overlay Styles */
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(5px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          transition: opacity 0.3s ease;
        }

        .loading-text {
          font-family: 'Playfair Display', serif;
          font-size: 3rem;
          font-weight: 700;
          color: var(--accent-green);
          margin-top: 1rem;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 5px solid var(--accent-green);
          border-top: 5px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Loading Blur Effect */
        .app-container {
          transition: filter 0.3s ease;
        }

        .app-container.blurred {
          filter: blur(3px);
          pointer-events: none;
        }
        
        /* NEW: Profile Page Actions */
        .profile-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        
        /* NEW: User Profile Layout Styles */
        .user-profile-layout {
          display: flex;
          background: var(--primary-color);
          padding: 0;
          box-shadow: none;
          margin-top: 2rem;
          border-radius: 0;
          align-items: flex-start; /* Ensure top alignment */
        }

        /* Responsive User Profile Layout */
        @media (max-width: 1200px) {
          .user-profile-layout {
            margin-top: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .user-profile-layout {
            flex-direction: column;
            margin-top: 1rem;
          }
        }

        @media (max-width: 480px) {
          .user-profile-layout {
            margin-top: 0.5rem;
          }
        }
        
        /* Force both sections to start at exactly the same position */
        .profile-sidebar,
        .profile-content {
          margin-top: 0 !important;
          padding-top: 1.5rem !important;
        }
        
        /* Override any default margins from main-content class */
        .user-profile-layout.main-content {
          margin-top: 2rem;
        }
        .profile-sidebar {
          width: 250px;
          padding: 1.5rem;
          background: #fff;
          border-right: 1px solid #f0f0f0;
          flex-shrink: 0; /* Prevent sidebar from shrinking */
        }

        @media (max-width: 768px) {
          .profile-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid #f0f0f0;
            padding: 1rem;
          }
        }

        @media (max-width: 480px) {
          .profile-sidebar {
            padding: 0.75rem;
          }
        }
        .profile-content {
          flex: 1;
          padding: 1.5rem;
          background: var(--secondary-color);
        }

        @media (max-width: 768px) {
          .profile-content {
            padding: 1rem;
          }
        }

        @media (max-width: 480px) {
          .profile-content {
            padding: 0.75rem;
          }
        }
        
        /* Ensure content cards align with sidebar content */
        .profile-content .profile-section-card {
          margin-left: 0;
          margin-right: 0;
        }
        
        /* Create a content wrapper that aligns with sidebar */
        .profile-content-wrapper {
          padding-left: 1.5rem; /* Match sidebar padding */
          width: 100%;
          margin-top: 0; /* Ensure no top margin */
          padding-top: 0; /* Remove top padding to align with sidebar */
        }

        @media (max-width: 768px) {
          .profile-content-wrapper {
            padding-left: 0;
          }
        }
        .profile-header {
          display: flex;
          align-items: center;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #f0f0f0;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 768px) {
          .profile-header {
            padding-bottom: 1rem;
            margin-bottom: 1rem;
          }
        }

        @media (max-width: 480px) {
          .profile-header {
            padding-bottom: 0.75rem;
            margin-bottom: 0.75rem;
          }
        }
        .profile-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          object-fit: cover;
          margin-right: 1rem;
          border: 1px solid var(--border-color);
        }

        @media (max-width: 768px) {
          .profile-avatar {
            width: 50px;
            height: 50px;
            margin-right: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .profile-avatar {
            width: 45px;
            height: 45px;
            margin-right: 0.5rem;
          }
        }
        .profile-name-container {
          display: flex;
          flex-direction: column;
        }
        .profile-greeting {
          font-size: 0.9rem;
          color: #777;
          margin: 0;
        }
        .profile-full-name {
          font-size: 1.1rem;
          margin: 0;
          font-family: 'Poppins', sans-serif;
          font-weight: 600;
          color: var(--accent-green);
        }

        @media (max-width: 768px) {
          .profile-full-name {
            font-size: 1rem;
          }
        }

        @media (max-width: 480px) {
          .profile-full-name {
            font-size: 0.9rem;
          }
        }
        .profile-nav .nav-title {
          font-family: 'Poppins', sans-serif;
          font-weight: 600;
          font-size: 0.9rem;
          color: #878787;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }

        @media (max-width: 768px) {
          .profile-nav .nav-title {
            margin-top: 1rem;
            margin-bottom: 0.4rem;
          }
        }

        @media (max-width: 480px) {
          .profile-nav .nav-title {
            margin-top: 0.75rem;
            margin-bottom: 0.3rem;
            font-size: 0.85rem;
          }
        }
        .profile-nav ul {
          list-style: none;
          padding: 0;
          margin-bottom: 1.5rem;
        }
        .profile-nav ul li a {
          display: block;
          padding: 0.75rem 0;
          color: #212121;
          font-size: 1rem;
          font-weight: 500;
          transition: background-color 0.2s ease;
          position: relative;
        }

        .notification-badge {
          position: absolute;
          top: 0.25rem;
          right: 0;
          background: #e74c3c;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: bold;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7);
          }
          70% {
            transform: scale(1.1);
            box-shadow: 0 0 0 10px rgba(231, 76, 60, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(231, 76, 60, 0);
          }
        }

        @media (max-width: 768px) {
          .profile-nav ul li a {
            padding: 0.6rem 0;
            font-size: 0.95rem;
          }
        }

        @media (max-width: 480px) {
          .profile-nav ul li a {
            padding: 0.5rem 0;
            font-size: 0.9rem;
          }
        }
        .profile-nav ul li a:hover {
          text-decoration: none;
          background-color: #f0f0f0;
        }
        .profile-nav ul li a.active {
          color: var(--f-blue);
          font-weight: 600;
          background-color: var(--f-light-blue);
        }
        .profile-section-card {
          background: #fff;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px var(--shadow-color);
        }

        @media (max-width: 768px) {
          .profile-section-card {
            padding: 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .profile-section-card {
            padding: 1rem;
            border-radius: 6px;
          }
        }
        .profile-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .profile-section-header .section-title {
          margin: 0;
        }
        .profile-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        @media (max-width: 768px) {
          .profile-info-grid {
            gap: 1rem;
          }
        }

        @media (max-width: 480px) {
          .profile-info-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
        }
        .profile-section-card input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .profile-section-card input:disabled {
          background: #f7f7f7;
        }
        .btn-edit {
          background: none;
          border: none;
          color: var(--f-blue);
          font-weight: 600;
          cursor: pointer;
        }
        .btn-delete {
          background-color: #e76f51;
          color: white;
          width: auto;
          padding: 0.8rem 2rem;
        }
        .address-display {
          border: 1px solid #f0f0f0;
          border-radius: 8px;
          padding: 1rem;
          background: #f7f7f7;
        }

        /* NEW: Admin Panel Styles */
        .admin-dashboard-container {
          display: flex;
          min-height: calc(100vh - 70px - 2rem);
          max-width: 1400px;
          margin: auto;
          margin-top: 2rem;
          box-shadow: 0 4px 8px var(--shadow-color);
          background: #fff;
        }

        /* Responsive Admin Dashboard */
        @media (max-width: 1200px) {
          .admin-dashboard-container {
            max-width: 95%;
            margin-top: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .admin-dashboard-container {
            max-width: 98%;
            flex-direction: column;
            margin-top: 1rem;
            min-height: auto;
          }
        }

        @media (max-width: 480px) {
          .admin-dashboard-container {
            max-width: 100%;
            margin-top: 0.5rem;
            box-shadow: none;
          }
        }
        
        .admin-sidebar {
          width: 280px;
          background: #fff;
          padding: 2rem 1.5rem;
          border-right: 1px solid var(--border-color);
        }

        @media (max-width: 768px) {
          .admin-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid var(--border-color);
            padding: 1.5rem 1rem;
          }
        }

        @media (max-width: 480px) {
          .admin-sidebar {
            padding: 1rem 0.75rem;
          }
        }
        
        .admin-sidebar-header {
          padding-bottom: 1rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }
        
        .admin-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.8rem;
          color: var(--accent-green);
        }

        @media (max-width: 768px) {
          .admin-title {
            font-size: 1.6rem;
          }
        }

        @media (max-width: 480px) {
          .admin-title {
            font-size: 1.4rem;
          }
        }
        
        .admin-nav-list {
          list-style: none;
          padding: 0;
        }
        
        .admin-nav-link {
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          margin-bottom: 0.5rem;
          color: #212121;
          font-weight: 500;
          border-radius: 8px;
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        
        .admin-nav-link:hover {
          background-color: var(--f-light-blue);
          color: var(--f-blue);
          text-decoration: none;
        }
        
        .admin-nav-link.active {
          background-color: var(--f-light-blue);
          color: var(--f-blue);
          font-weight: 600;
        }
        
        .admin-nav-icon {
          font-size: 1.2rem;
          margin-right: 1rem;
        }
        
        .admin-main-content {
          flex: 1;
          padding: 2rem;
          background: var(--secondary-color);
        }
        
        .admin-content-card {
          background: #fff;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px var(--shadow-color);
          margin-bottom: 2rem;
        }

        @media (max-width: 768px) {
          .admin-content-card {
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .admin-content-card {
            padding: 1rem;
            margin-bottom: 1rem;
            border-radius: 6px;
          }
        }
        
        .admin-content-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.8rem;
          color: var(--accent-green);
          margin-bottom: 1.5rem;
        }

        @media (max-width: 768px) {
          .admin-content-title {
            font-size: 1.6rem;
            margin-bottom: 1.25rem;
          }
        }

        @media (max-width: 480px) {
          .admin-content-title {
            font-size: 1.4rem;
            margin-bottom: 1rem;
          }
        }
        
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1.5rem;
        }

        @media (max-width: 768px) {
          .admin-table {
            margin-top: 1rem;
            font-size: 0.9rem;
          }
        }

        @media (max-width: 480px) {
          .admin-table {
            margin-top: 0.75rem;
            font-size: 0.85rem;
          }
        }
        
        .admin-table th, .admin-table td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }

        @media (max-width: 768px) {
          .admin-table th, .admin-table td {
            padding: 8px;
          }
        }

        @media (max-width: 480px) {
          .admin-table th, .admin-table td {
            padding: 6px;
            font-size: 0.8rem;
          }
        }
        
        .admin-table th {
          background-color: #f7f7f7;
          font-weight: 600;
          color: #555;
        }
        
        .admin-form-container {
          margin-bottom: 2rem;
        }
        
        .admin-form-container form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .admin-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        @media (max-width: 768px) {
          .admin-form-grid {
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .admin-form-grid {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }
        }
        
        .form-group-inline {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        
        .product-thumb {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 4px;
        }
        
        .btn-sm {
          padding: 0.4rem 0.8rem;
          font-size: 0.8rem;
        }
        
        .btn-action {
          background: #007bff;
          color: white;
          margin-right: 0.5rem;
        }
        .btn-delete {
          background: #dc3545;
          color: white;
        }
        .btn-edit-product {
          background: #ffc107;
          color: #333;
          margin-right: 0.5rem;
        }
        .btn-delete-product {
          background: #dc3545;
        }
        .btn-primary {
          background: var(--accent-green);
          color: white;
          width: auto;
          padding: 0.8rem 2rem;
          align-self: flex-start;
        }

        /* Product Management Styles */
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .add-product-form {
          background: #f8f9fa;
          padding: 2rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          border: 1px solid #e9ecef;
        }

        .add-product-form h2 {
          margin-bottom: 1.5rem;
          color: var(--accent-green);
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #333;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 100px;
        }

        .image-preview {
          margin-top: 1rem;
          text-align: center;
        }

        .image-preview img {
          max-width: 200px;
          max-height: 200px;
          border-radius: 8px;
          border: 2px solid #ddd;
        }

        .price-summary {
          background: #e8f5e8;
          padding: 1rem;
          border-radius: 8px;
          margin: 1rem 0;
          border-left: 4px solid var(--accent-green);
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }

        .products-list h2 {
          margin-bottom: 1.5rem;
          color: var(--accent-green);
        }

        .no-products {
          text-align: center;
          color: #666;
          font-style: italic;
          padding: 2rem;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 2rem;
        }

        .product-card-admin {
          background: #fff;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .product-image {
          position: relative;
          height: 200px;
          overflow: hidden;
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-status {
          position: absolute;
          top: 10px;
          right: 10px;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.live {
          background: #d4edda;
          color: #155724;
        }

        .status-badge.draft {
          background: #fff3cd;
          color: #856404;
        }

        .product-info {
          padding: 1.5rem;
        }

        .product-info h3 {
          margin-bottom: 0.5rem;
          color: #333;
        }

        .product-description {
          color: #666;
          margin-bottom: 1rem;
          line-height: 1.5;
        }

        .product-details {
          margin-bottom: 1.5rem;
        }

        .price-info {
          margin-bottom: 1rem;
        }

        .original-price {
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
          margin-right: 1rem;
        }

        .discount-price {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--accent-green);
        }

        .stock-info {
          color: #666;
          font-size: 0.9rem;
        }

        .product-actions {
          display: flex;
          gap: 0.5rem;
        }

        .loading-spinner {
          text-align: center;
          padding: 2rem;
          color: #666;
        }

        /* Loading spinner for buttons */
        .btn-loading-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 8px;
        }

        /* Utility classes */
        .text-center {
          text-align: center;
        }

        .mb-6 {
          margin-bottom: 1.5rem;
        }

        .max-w-sm {
          max-width: 24rem;
        }

        .mx-auto {
          margin-left: auto;
          margin-right: auto;
        }

        .mt-6 {
          margin-top: 1.5rem;
        }

        .btn-detail-small {
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
        }

        .profile-subtitle {
          color: #777;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .btn-logout {
          background-color: #e76f51;
          color: white;
          width: 100%;
          margin-top: 1rem;
        }

        .dropdown-logout-btn {
          background: none;
          border: none;
          color: var(--text-dark);
          text-decoration: none;
          padding: 0.5rem;
          text-align: left;
          cursor: pointer;
          transition: background-color 0.2s ease;
          border-radius: 4px;
          width: 100%;
        }

        .dropdown-logout-btn:hover {
          background-color: var(--secondary-color);
        }

        .dropdown-logout-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .cart-icon {
          position: relative;
        }

        .btn-checkout {
          background: var(--accent-green);
          color: var(--text-light);
          width: 100%;
        }

        .placeholder {
          text-align: center;
          padding: 2rem;
        }


        @media (max-width: 1024px) {
          .admin-dashboard-container {
            flex-direction: column;
          }
          .admin-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid var(--border-color);
          }
        }

        /* Wishlist Button Styles */
        .wishlist-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: 10;
        }

        .wishlist-btn:hover {
          background: rgba(255, 255, 255, 1);
          transform: scale(1.1);
        }

        .wishlist-btn.in-wishlist {
          color: #e74c3c;
          background: rgba(231, 76, 60, 0.1);
        }

        .wishlist-btn.in-wishlist svg {
          fill: #e74c3c;
          stroke: #e74c3c;
        }

        .wishlist-btn:not(.in-wishlist) svg {
          fill: none;
          stroke: #666;
        }

        .wishlist-btn svg {
          width: 20px;
          height: 20px;
        }

        .product-card-header {
          position: relative;
        }

        .btn-wishlist {
          background: #f8f9fa;
          color: #6c757d;
          border: 1px solid #dee2e6;
        }

        .btn-wishlist:hover {
          background: #e9ecef;
          color: #495057;
        }

        .btn-wishlist-added {
          background: #e74c3c;
          color: white;
          border: 1px solid #e74c3c;
        }

        .btn-wishlist-added:hover {
          background: #c0392b;
          color: white;
        }

        /* Enhanced wishlist button styling */
        .btn-wishlist {
          position: relative;
          overflow: hidden;
        }

        .btn-wishlist::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }

        .btn-wishlist:hover::before {
          left: 100%;
        }

        /* Product Grid Full Width */
        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2rem;
          width: 100%;
          max-width: 100%;
        }

        @media (max-width: 768px) {
          .product-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .product-grid {
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1rem;
          }
        }

        /* Wishlist Page Styles */
        .wishlist-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .wishlist-item {
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          gap: 1rem;
        }

        .wishlist-item-image {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 4px;
        }

        .wishlist-item-details {
          flex: 1;
        }

        .wishlist-item-details h4 {
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
        }

        .wishlist-item-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .btn-remove {
          background: #e74c3c;
          color: white;
        }

        .btn-remove:hover {
          background: #c0392b;
        }

        /* Notifications Styles */
        .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .notification-item {
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
          background: white;
        }

        .notification-item.unread {
          border-left: 4px solid var(--accent-green);
          background: #f8f9fa;
        }

        .notification-item h4 {
          margin: 0 0 0.5rem 0;
          color: var(--accent-green);
        }

        .notification-item p {
          margin: 0 0 0.5rem 0;
          color: #666;
        }

        .notification-item small {
          color: #999;
          font-size: 0.8rem;
        }

        /* Google Login Button Hover Fix */
        .btn-google:hover {
          background: #333 !important;
          color: white !important;
        }



        /* Mobile Profile Layout */
        .mobile-profile-menu {
          width: 100%;
          padding: 1rem;
          background: white;
          border-bottom: 1px solid var(--border-color);
        }

        .mobile-profile-header {
          display: flex;
          align-items: center;
          padding-bottom: 1rem;
          margin-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .mobile-profile-nav {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .mobile-nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          text-decoration: none;
          color: var(--text-dark);
          border-radius: 8px;
          transition: all 0.3s ease;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          font-family: 'Poppins', sans-serif;
        }

        .mobile-nav-item:hover,
        .mobile-nav-item.active {
          background: var(--accent-green);
          color: white;
        }

        .mobile-nav-item.logout-btn {
          margin-top: 1rem;
          background: #e74c3c;
          color: white;
        }

        .mobile-nav-item.logout-btn:hover {
          background: #c0392b;
        }

        .nav-icon {
          font-size: 1.2rem;
          width: 24px;
          text-align: center;
        }

        /* Mobile Profile Pages */
        @media (max-width: 768px) {
          .user-profile-layout {
            flex-direction: column;
          }
          
          .profile-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid var(--border-color);
            padding: 1rem;
          }
          
          .profile-content {
            width: 100%;
            padding: 0;
          }
          
          .profile-content-wrapper {
            padding-left: 0;
          }

          /* Full-size profile pages on mobile */
          .profile-section-card {
            margin: 0;
            border-radius: 0;
            min-height: calc(100vh - 200px);
            padding: 1.5rem;
            background: white;
          }

          .profile-section-header {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
            margin-bottom: 2rem;
          }



          .profile-section-header {
            margin-bottom: 2rem;
          }

          .profile-info-grid {
            gap: 1.5rem;
          }

          .form-group {
            margin-bottom: 1.5rem;
          }

          .form-group input,
          .form-group textarea {
            padding: 1rem;
            font-size: 1rem;
          }

          .btn-edit {
            padding: 0.75rem 1.5rem;
            font-size: 1rem;
          }

          .address-display {
            font-size: 1rem;
            line-height: 1.6;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 8px;
          }

          .wishlist-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .wishlist-item {
            padding: 1.5rem;
          }

          .wishlist-item-image {
            width: 100px;
            height: 100px;
          }

          .wishlist-item-details h4 {
            font-size: 1.1rem;
          }

          .wishlist-item-actions {
            flex-direction: column;
            gap: 0.75rem;
          }

          .wishlist-item-actions .btn {
            width: 100%;
            padding: 0.75rem;
          }

          .notifications-list {
            gap: 1.5rem;
          }

          .notification-item {
            padding: 1.5rem;
          }

          .notification-item h4 {
            font-size: 1.1rem;
          }

          .notification-item p {
            font-size: 1rem;
            line-height: 1.5;
          }

          .orders-content,
          .reviews-content {
            padding: 3rem 1.5rem;
          }

          .orders-content p,
          .reviews-content p {
            font-size: 1.1rem;
            margin-bottom: 2rem;
          }

          .orders-content .btn,
          .reviews-content .btn {
            padding: 1rem 2rem;
            font-size: 1.1rem;
          }
        }

        /* Orders and Reviews Content */
        .orders-content,
        .reviews-content {
          text-align: center;
          padding: 2rem;
        }

        .orders-content p,
        .reviews-content p {
          margin-bottom: 1rem;
          color: #666;
        }

        /* Admin Notification Management Styles */
        .admin-content-subtitle {
          color: #666;
          margin-bottom: 2rem;
          font-size: 0.9rem;
        }

        .form-help {
          color: #999;
          font-size: 0.8rem;
          margin-top: 0.25rem;
        }

        .form-actions {
          margin-top: 2rem;
        }

        .btn-primary {
          background: var(--accent-green);
          color: white;
        }

        .btn-primary:hover {
          background: #465330;
        }

        .btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .notification-guidelines {
          margin-top: 3rem;
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid var(--accent-green);
        }

        .notification-guidelines h3 {
          margin-bottom: 1rem;
          color: var(--accent-green);
        }

        .notification-guidelines ul {
          margin: 0;
          padding-left: 1.5rem;
        }

        .notification-guidelines li {
          margin-bottom: 0.5rem;
          color: #666;
        }
      `}</style>
    </>
  );
}