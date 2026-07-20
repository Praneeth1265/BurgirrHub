import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { gatewayClient } from "../../api/client";
import { useCart } from "../../context/CartContext";

const CUISINES = ["All", "American", "Italian", "Chinese"];
const GST_RATE = 0.05; // 2.5% CGST + 2.5% SGST, matches Checkout.jsx

const OrderMenu = () => {
  const { branch, setBranch, items, addItem, updateQuantity, itemCount } = useCart();
  const [branches, setBranches] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cuisine, setCuisine] = useState("All");
  const [cartOpen, setCartOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("item");
  const hasScrolled = useRef(false);

  useEffect(() => {
    gatewayClient
      .get("/branches")
      .then(({ data }) => {
        setBranches(data.branches);
        if (!branch && data.branches.length > 0) {
          setBranch(data.branches[0].name);
        }
      })
      .catch(() => toast.error("Failed to load branches"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!branch) return;
    setLoading(true);
    gatewayClient
      .get("/menu", { params: { branch } })
      .then(({ data }) => setMenu(data.items))
      .catch(() => toast.error("Failed to load menu"))
      .finally(() => setLoading(false));
  }, [branch]);

  useEffect(() => {
    if (!highlightId || loading || hasScrolled.current || menu.length === 0) return;
    const el = document.getElementById(`item-${highlightId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      hasScrolled.current = true;
    }
  }, [highlightId, loading, menu]);

  const quantityInCart = (menuItemId) => items.find((i) => i.menuItemId === menuItemId)?.quantity || 0;

  const filteredMenu = useMemo(
    () => (cuisine === "All" ? menu : menu.filter((m) => m.cuisine === cuisine)),
    [menu, cuisine]
  );

  const grouped = filteredMenu.reduce((acc, item) => {
    (acc[item.category] ||= []).push(item);
    return acc;
  }, {});

  // `menu` is already server-filtered to items that are both available at
  // `branch` and currently in stock (see menuController's listMenu) -- so
  // any cart item whose id isn't in here can't be ordered right now,
  // whether that's because it belongs to a different branch's cart or it
  // just sold out. Cart items are never deleted for this; they're just
  // excluded from what's payable until it's resolved (switch branch back,
  // or remove them).
  const availableIds = useMemo(() => new Set(menu.map((m) => m._id)), [menu]);
  const availableCartItems = items.filter((i) => availableIds.has(i.menuItemId));
  const unavailableCartItems = items.filter((i) => !availableIds.has(i.menuItemId));

  const subtotal = availableCartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const gst = subtotal * GST_RATE;
  const grandTotal = subtotal + gst;

  return (
    <div className="order-page">
      <Link to="/" className="back-to-home-btn">
        Back to Home
      </Link>

      <div className="order-main">
        <h1 className="menu-title" style={{ marginTop: 60 }}>
          Order Online
        </h1>
        <p className="menu-subtitle" style={{ marginBottom: 20 }}>
          Dine-in ordering &mdash; skip the queue, order straight to your table.
        </p>

        <div className="order-branch-select">
          <label htmlFor="order-branch">Branch:</label>
          <select id="order-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
            {branches.map((b) => (
              <option key={b._id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="cuisine-filter">
          {CUISINES.map((c) => (
            <button key={c} className={cuisine === c ? "active" : ""} onClick={() => setCuisine(c)}>
              {c}
            </button>
          ))}
        </div>

        {loading && <p>Loading menu...</p>}

        {!loading &&
          Object.entries(grouped).map(([category, categoryItems]) => (
            <div key={category} className="order-category">
              <h2>{category}</h2>
              <div className="order-items-grid">
                {categoryItems.map((item) => {
                  const qty = quantityInCart(item._id);
                  const outOfStock = !item.isAvailable || item.stock === 0;
                  return (
                    <div
                      className={`order-item-card ${highlightId === item._id ? "highlighted" : ""} ${outOfStock ? "unavailable" : ""}`}
                      key={item._id}
                      id={`item-${item._id}`}
                    >
                      <div className="order-item-top">
                        <div className="order-item-name">
                          <span className={`veg-dot ${item.isVeg ? "" : "nonveg"}`}></span>
                          {item.name}
                        </div>
                      </div>
                      <div className="order-item-desc">{item.description}</div>
                      {item.ingredients?.length > 0 && (
                        <div className="order-item-ingredients">{item.ingredients.join(", ")}</div>
                      )}
                      <div className="order-item-tags">
                        <span>{item.cuisine}</span>
                        {item.calories && <span>&middot; {item.calories} kcal</span>}
                      </div>
                      <div className="order-item-price">&#8377;{item.price}</div>
                      {outOfStock ? (
                        <span className="order-item-oos">Out of stock</span>
                      ) : qty === 0 ? (
                        <button className="btn" onClick={() => addItem(item)}>
                          Add to cart
                        </button>
                      ) : (
                        <div className="order-item-stepper">
                          <button onClick={() => updateQuantity(item._id, qty - 1)}>-</button>
                          <span>{qty}</span>
                          <button onClick={() => updateQuantity(item._id, qty + 1)}>+</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>

      <div className={`cart-panel ${cartOpen ? "expanded" : ""}`}>
        <div className="cart-fab" onClick={() => setCartOpen((v) => !v)}>
          <h3>Your Cart</h3>
          <span>
            {itemCount} item{itemCount !== 1 ? "s" : ""} &middot; &#8377;{grandTotal.toFixed(0)}
          </span>
        </div>
        <h3 className="cart-panel-title-desktop">Your Cart</h3>

        {items.length === 0 ? (
          <p className="cart-panel-empty">Your cart is empty. Add a dish to get started.</p>
        ) : (
          <>
            <div className="cart-items">
              {availableCartItems.map((i) => (
                <div className="cart-line" key={i.menuItemId}>
                  <div>
                    <div className="cart-line-name">{i.name}</div>
                    <div className="cart-line-price">&#8377;{i.price} each</div>
                  </div>
                  <div className="cart-line-controls">
                    <button onClick={() => updateQuantity(i.menuItemId, i.quantity - 1)}>-</button>
                    <span>{i.quantity}</span>
                    <button onClick={() => updateQuantity(i.menuItemId, i.quantity + 1)}>+</button>
                  </div>
                </div>
              ))}
              {unavailableCartItems.map((i) => (
                <div className="cart-line cart-line-unavailable" key={i.menuItemId}>
                  <div>
                    <div className="cart-line-name">{i.name}</div>
                    <div className="cart-line-price">Not available at {branch}</div>
                  </div>
                  <div className="cart-line-controls">
                    <span>x{i.quantity}</span>
                    <button onClick={() => updateQuantity(i.menuItemId, 0)} title="Remove">
                      &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {unavailableCartItems.length > 0 && (
              <p className="cart-unavailable-note">
                {unavailableCartItems.length} item{unavailableCartItems.length > 1 ? "s" : ""} in your cart{" "}
                {unavailableCartItems.length > 1 ? "aren't" : "isn't"} available at {branch}. Switch branch or
                remove {unavailableCartItems.length > 1 ? "them" : "it"} to continue.
              </p>
            )}

            {availableCartItems.length > 0 && (
              <>
                <div className="cart-totals">
                  <div className="cart-total-row">
                    <span>Subtotal</span>
                    <span>&#8377;{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="cart-total-row">
                    <span>CGST (2.5%)</span>
                    <span>&#8377;{(subtotal * 0.025).toFixed(2)}</span>
                  </div>
                  <div className="cart-total-row">
                    <span>SGST (2.5%)</span>
                    <span>&#8377;{(subtotal * 0.025).toFixed(2)}</span>
                  </div>
                  <div className="cart-total-row cart-grand-total">
                    <span>Total</span>
                    <span>&#8377;{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <Link to="/order/checkout" className="btn">
                  Checkout
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OrderMenu;
