import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { gatewayClient } from "../../api/client";

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
      <a href="/" className="back-to-home-btn">
        Back to Home
      </a>
      <h1 className="menu-title">My Orders</h1>

      {loading && <p>Loading...</p>}
      {!loading && orders.length === 0 && <p>No orders yet.</p>}

      {orders.map((order) => (
        <div className="checkout-summary" key={order._id} style={{ marginBottom: 16 }}>
          <h2>
            {order.branch} &middot; <span className={`order-status order-status-${order.status}`}>{order.status}</span>
          </h2>
          {order.items.map((i, idx) => (
            <div className="checkout-line" key={idx}>
              <span>
                {i.name} x{i.quantity}
              </span>
              <span>&#8377;{i.price * i.quantity}</span>
            </div>
          ))}
          <div className="checkout-line checkout-total">
            <span>Total</span>
            <span>&#8377;{order.totalAmount}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrderHistory;
