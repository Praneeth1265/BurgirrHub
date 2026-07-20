import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { gatewayClient } from "../../api/client";

const GST_RATE = 0.05; // 2.5% CGST + 2.5% SGST -- matches Checkout.jsx's display convention.

const formatDate = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

// GET /orders is role-scoped server-side -- a customer only ever gets
// their own orders back (see Order Service's listOrders), so there's no
// filtering to do here beyond just rendering what comes back.
const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gatewayClient
      .get("/orders")
      .then(({ data }) => setOrders(data.orders))
      .catch((error) => toast.error(error.response?.data?.message || "Failed to load orders"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="menu-container">
      <Link to="/" className="back-to-home-btn">
        Back to Home
      </Link>
      <h1 className="menu-title">My Orders</h1>
      <p className="menu-subtitle">Every bill from your past dine-in orders, in one place.</p>

      {loading && <p>Loading...</p>}
      {!loading && orders.length === 0 && <p>No orders yet.</p>}

      {orders.map((order) => {
        const gst = order.totalAmount * GST_RATE;
        const grandTotal = order.totalAmount + gst;
        return (
          <div className="checkout-summary" key={order._id} style={{ marginBottom: 20, maxWidth: 560 }}>
            <div className="checkout-summary-header">
              <h2>{order.branch}</h2>
              <span className={`order-status order-status-${order.status}`}>{order.status}</span>
            </div>
            <div className="checkout-line subtle">
              <span>Order #{order._id.slice(-8).toUpperCase()}</span>
              <span>{formatDate(order.createdAt)}</span>
            </div>

            {order.items.map((i, idx) => (
              <div className="checkout-line" key={idx}>
                <span>
                  {i.name} x{i.quantity}
                </span>
                <span>&#8377;{(i.price * i.quantity).toFixed(2)}</span>
              </div>
            ))}

            <div className="checkout-line subtle" style={{ marginTop: 8 }}>
              <span>Subtotal</span>
              <span>&#8377;{order.totalAmount.toFixed(2)}</span>
            </div>
            <div className="checkout-line subtle">
              <span>CGST (2.5%)</span>
              <span>&#8377;{(order.totalAmount * 0.025).toFixed(2)}</span>
            </div>
            <div className="checkout-line subtle">
              <span>SGST (2.5%)</span>
              <span>&#8377;{(order.totalAmount * 0.025).toFixed(2)}</span>
            </div>
            <div className="checkout-line checkout-total">
              <span>Total Paid</span>
              <span>&#8377;{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrderHistory;
