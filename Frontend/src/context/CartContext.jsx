import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "burgirrhub_cart";

export function CartProvider({ children }) {
  const [branch, setBranch] = useState(() => localStorage.getItem(`${STORAGE_KEY}_branch`) || "");
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_branch`, branch);
  }, [branch]);

  // Switching branches invalidates the cart -- menu items and their
  // availability are branch-specific (see Order Service's branch-exclusive
  // item handling), so a cart built for one branch isn't valid at another.
  const changeBranch = useCallback((nextBranch) => {
    setBranch((prevBranch) => {
      if (prevBranch && prevBranch !== nextBranch) {
        setItems([]);
      }
      return nextBranch;
    });
  }, []);

  const addItem = useCallback((menuItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === menuItem._id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === menuItem._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { menuItemId: menuItem._id, name: menuItem.name, price: menuItem.price, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback((menuItemId, quantity) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.menuItemId !== menuItemId);
      return prev.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity } : i));
    });
  }, []);

  const removeItem = useCallback((menuItemId) => {
    setItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  const value = {
    branch,
    setBranch: changeBranch,
    items,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
