import "./header.css";
import { Search, ShoppingBag, X } from "lucide-react";
import { Link } from "react-router-dom"; // ✅ IMPORTANT
import { useMemo, useState } from "react";
import { useCart } from "../context/CartContext";

const CHECKOUT_URL =
  "https://danhov-2.myshopify.com/checkouts/cn/hWN7dRDW6bkYNnue4nyWl1a0/en-co?_r=AQAB9c9WMGhBT5N7xFA7zG5mWitnj7HXUrfYvHq54oHy8eE&adminUrl=admin.shopify.com&cart_link_id=M4xgztKg&editedAt=2025-12-02T16%3A04%3A20Z&isPublished=true&preview_theme_id=190642225318&profileName=My+Store+configuration&profile_preview_token=eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiI1amk3MDYtMGUubXlzaG9waWZ5LmNvbSIsImF1ZCI6IjVqaTcwNi0wZS5teXNob3BpZnkuY29tIiwibmJmIjoxNzcwMzc1MzI1LCJjaGVja291dF9wcm9maWxlX2lkIjo2MzkzMjAwODA2LCJjaGVja291dF9wcm9maWxlX3B1Ymxpc2hlZCI6dHJ1ZSwidXNlcl9pZCI6MTMyODg2MjAwNDg2LCJleHAiOjE3NzAzNzg5MjV9.ch5xund_Ibw1UtVVcFhxT6lzBZlBeiqEGsDcYMOiyn0";

const formatPrice = (value) =>
  Number.isFinite(value) ? `$${value.toLocaleString()}` : "-";

const Header = () => {
  const { count, items, removeFromCart } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  const cartTotal = useMemo(
    () =>
      items.reduce((total, item) => {
        const itemTotal = Number(item?.prices?.total) || 0;
        return total + itemTotal * (item.quantity || 1);
      }, 0),
    [items]
  );

  return (
    <header className="site-header">
      <div className="header-container">

        {/* LOGO */}
        <div className="logo">
          <Link to="/">DANHOV</Link>
        </div>

        {/* MENU */}
        <nav className="main-menu">
          <Link to="/">HOME</Link>
          <Link to="/about">ABOUT</Link>
          <Link to="/engagement-rings">ENGAGEMENT RINGS</Link>
          <Link to="/wedding-bands">WEDDING BANDS</Link>

          {/* ✅ Ring Builder */}
          <Link to="/ring-builder">RING BUILDER</Link>

          <Link to="/fine-jewelry">FINE JEWELRY</Link>
          <Link to="/mens-jewelry">MEN'S JEWELRY</Link>
        </nav>

        {/* RIGHT */}
        <div className="header-right">
          <div className="search-box">
            <input type="text" placeholder="Search" />
            <Search size={16} />
          </div>

          <span className="login-text">LOGIN</span>

          <button
            type="button"
            className="cart-icon"
            onClick={() => setIsCartOpen(true)}
            aria-label="Open cart"
          >
            <ShoppingBag size={18} />
            {count > 0 && <span className="cart-count">{count}</span>}
          </button>
        </div>

      </div>

      {isCartOpen && (
        <div className="cart-drawer-overlay" onClick={() => setIsCartOpen(false)}>
          <aside
            className="cart-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cart-drawer-header">
              <h3>Your Bag</h3>
              <button
                type="button"
                className="cart-close"
                onClick={() => setIsCartOpen(false)}
                aria-label="Close cart"
              >
                <X size={18} />
              </button>
            </div>

            {items.length === 0 ? (
              <p className="cart-empty">Your bag is empty.</p>
            ) : (
              <div className="cart-items">
                {items.map((item, index) => (
                  <div className="cart-item" key={item.id || `cart-item-${index}`}>
                    <div className="cart-item-title-row" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div className="cart-item-title">{item.title || "Ring"}</div>
                      <button 
                        className="cart-item-remove" 
                        aria-label="Remove item"
                        style={{background:'none',border:'none',color:'#d00',fontWeight:'bold',fontSize:'1.2em',cursor:'pointer'}}
                        onClick={() => removeFromCart(index)}
                      >
                        ×
                      </button>
                    </div>
                    <div className="cart-item-meta">
                      {item?.diamond?.shape ? `${item.diamond.shape}` : ""}
                      {item?.diamond?.carats ? ` · ${item.diamond.carats} ct` : ""}
                    </div>
                    <div className="cart-item-price">
                      {formatPrice(item?.prices?.total || 0)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="cart-footer">
              <div className="cart-total-row">
                <span>Total</span>
                <strong>{formatPrice(cartTotal)}</strong>
              </div>
              <button
                type="button"
                className="cart-checkout"
                onClick={() => {
                  window.location.href = CHECKOUT_URL;
                }}
              >
                Checkout
              </button>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
};

export default Header;
