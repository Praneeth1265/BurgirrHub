import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { gatewayClient } from "../../api/client";
import { useCart } from "../../context/CartContext";

const OrderMenu = () => {
  const { branch, setBranch, items, addItem, updateQuantity, subtotal, itemCount } = useCart();
  const [branches, setBranches] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const quantityInCart = (menuItemId) => items.find((i) => i.menuItemId === menuItemId)?.quantity || 0;

  const grouped = menu.reduce((acc, item) => {
    (acc[item.category] ||= []).push(item);
    return acc;
  }, {});

  return (
    <div className="menu-container">
      <a href="/" className="back-to-home-btn">
        Back to Home
      </a>
      <h1 className="menu-title">Order Online</h1>

      <div className="order-branch-select">
        <label htmlFor="order-branch">Branch: </label>
        <select id="order-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
          {branches.map((b) => (
            <option key={b._id} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Loading menu...</p>}

      {!loading &&
        Object.entries(grouped).map(([category, categoryItems]) => (
          <div key={category} className="order-category">
            <h2>{category}</h2>
            <div className="order-items-grid">
              {categoryItems.map((item) => {
                const qty = quantityInCart(item._id);
                return (
                  <div className="order-item-card" key={item._id}>
                    <div className="order-item-name">{item.name}</div>
                    <div className="order-item-desc">{item.description}</div>
                    <div className="order-item-price">&#8377;{item.price}</div>
                    {qty === 0 ? (
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

      {itemCount > 0 && (
        <div className="cart-summary-bar">
          <span>
            {itemCount} item{itemCount > 1 ? "s" : ""} &middot; &#8377;{subtotal}
          </span>
          <Link to="/order/checkout" className="btn">
            Checkout
          </Link>
        </div>
      )}
    </div>
  );
};

export default OrderMenu;
