import "./header.css";
import { Search, ShoppingBag, X } from "lucide-react";
import { Link } from "react-router-dom"; // ✅ IMPORTANT
import { useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import {
  buildCheckoutPayloadFromCartItems,
  createShopifyCheckout,
} from "../api/shopifyCheckout";

const SHOPIFY_STORE_URL = import.meta.env.VITE_SHOPIFY_STORE_URL;

const normalizeBaseUrl = (value) =>
  typeof value === "string" ? value.replace(/\/+$/, "") : "";

const formatPrice = (value) =>
  Number.isFinite(value) ? `$${value.toLocaleString()}` : "-";

const Header = () => {
  const { count, items, removeFromCart } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

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
                disabled={isCheckingOut}
                onClick={async () => {
                  try {
                    setIsCheckingOut(true);

                    const payload = buildCheckoutPayloadFromCartItems(items);

                    if (!payload.lineItems.length) {
                      const baseUrl = normalizeBaseUrl(SHOPIFY_STORE_URL);
                      if (!baseUrl) {
                        alert("No checkoutable Shopify items in cart yet.");
                        return;
                      }
                      window.location.href = `${baseUrl}/cart`;
                      return;
                    }

                    const checkout = await createShopifyCheckout(payload);

                    if (!checkout?.checkoutUrl) {
                      throw new Error("Checkout URL missing from API response");
                    }

                    window.location.href = checkout.checkoutUrl;
                  } catch (error) {
                    console.error("Checkout error", error);
                    alert("Unable to start checkout. Please try again.");
                  } finally {
                    setIsCheckingOut(false);
                  }
                }}
              >
                {isCheckingOut ? "Starting checkout..." : "Checkout"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
};

export default Header;
