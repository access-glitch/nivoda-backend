import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext();
const CART_STORAGE_KEY = "danhov_cart";

const readStoredCart = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => readStoredCart());

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const count = useMemo(
    () => items.reduce((total, item) => total + (item.quantity || 1), 0),
    [items]
  );

  const addRingToCart = (ringItem) => {
    if (!ringItem) return;
    setItems((prev) => [...prev, { ...ringItem, quantity: 1 }]);
  };

  const removeFromCart = (indexToRemove) => {
    setItems((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <CartContext.Provider value={{ items, count, addRingToCart, removeFromCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
