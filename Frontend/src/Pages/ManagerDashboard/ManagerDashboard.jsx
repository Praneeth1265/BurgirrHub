import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { gatewayClient } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

// Valid next steps per current order status -- mirrors the Order
// Service's own state machine (orderTransitions.js). Kept in sync
// manually since this is just a UI hint; the server is the real
// authority and will reject anything invalid regardless.
const NEXT_STATUSES = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready"],
  ready: ["completed"],
  completed: [],
  cancelled: [],
};

const ManagerDashboard = () => {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("reservations");

  const [reservationsByBranch, setReservationsByBranch] = useState({});
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loadingReservations, setLoadingReservations] = useState(true);

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const fetchReservations = useCallback(async () => {
    setLoadingReservations(true);
    try {
      const { data } = await gatewayClient.get("/reservations");
      // reservation.branch is a populated { _id, name, address } document
      // now, not a plain string -- see Reservation Service's listReservations.
      const grouped = data.reservations.reduce((acc, reservation) => {
        const branchName = reservation.branch?.name || "Unknown";
        if (!acc[branchName]) acc[branchName] = [];
        acc[branchName].push(reservation);
        return acc;
      }, {});
      setReservationsByBranch(grouped);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load reservations");
    } finally {
      setLoadingReservations(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const { data } = await gatewayClient.get("/orders");
      setOrders(data.orders);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load orders");
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
    fetchOrders();
  }, [fetchReservations, fetchOrders]);

  const deleteReservation = async (id, branchName) => {
    try {
      await gatewayClient.delete(`/reservations/${id}`);
      toast.success("Reservation deleted");
      setReservationsByBranch((prev) => {
        const updated = { ...prev };
        updated[branchName] = updated[branchName].filter((r) => r._id !== id);
        return updated;
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting reservation");
    }
  };

  const updateOrderStatus = async (orderId, nextStatus) => {
    try {
      const { data } = await gatewayClient.patch(`/orders/${orderId}/status`, { status: nextStatus });
      toast.success(`Order moved to "${nextStatus}"`);
      setOrders((prev) => prev.map((o) => (o._id === orderId ? data.order : o)));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update order status");
    }
  };

  const toggleBranchVisibility = (branchName) => {
    setSelectedBranch((prev) => (prev === branchName ? null : branchName));
  };

  return (
    <div style={{ padding: "20px" }}>
      <div className="manager-header">
        <a href="/" className="back-to-home-btn">
          Back to Home
        </a>
        <h1>Manager Dashboard</h1>
        <div className="manager-header-right">
          <span>
            {user?.name} ({user?.role})
          </span>
          <button className="btn" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, margin: "100px 0 20px" }}>
        <button className="btn" onClick={() => setTab("reservations")} disabled={tab === "reservations"}>
          Reservations
        </button>
        <button className="btn" onClick={() => setTab("orders")} disabled={tab === "orders"}>
          Orders
        </button>
      </div>

      {tab === "reservations" && (
        <div className="reservation-container">
          {loadingReservations && <p>Loading reservations...</p>}
          {!loadingReservations && Object.keys(reservationsByBranch).length === 0 && (
            <p>No reservations found.</p>
          )}
          {Object.entries(reservationsByBranch).map(([branchName, reservations]) => (
            <div key={branchName} className="branch-column">
              <button onClick={() => toggleBranchVisibility(branchName)} className="btn">
                {branchName} Branch ({reservations.length})
              </button>
              {selectedBranch === branchName && (
                <div className="reservation-items-container">
                  {reservations.map((reservation) => (
                    <div className="reservation-item" key={reservation._id}>
                      <div>
                        NAME: {reservation.firstName} {reservation.lastName}
                      </div>
                      <div>EMAIL: {reservation.email}</div>
                      <div>DATE: {reservation.date}</div>
                      <div>TIME: {reservation.time}</div>
                      <div>PHONE: {reservation.phone}</div>
                      <div className="delete-btn-container">
                        <button onClick={() => deleteReservation(reservation._id, branchName)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "orders" && (
        <div className="reservation-container">
          {loadingOrders && <p>Loading orders...</p>}
          {!loadingOrders && orders.length === 0 && <p>No orders found.</p>}
          {orders.map((order) => (
            <div className="reservation-item" key={order._id} style={{ marginBottom: 12 }}>
              <div>ORDER ID: {order._id}</div>
              <div>BRANCH: {order.branch}</div>
              <div>CUSTOMER: {order.customerEmail}</div>
              <div>
                ITEMS:{" "}
                {order.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}
              </div>
              <div>TOTAL: &#8377;{order.totalAmount}</div>
              <div>STATUS: {order.status}</div>
              {NEXT_STATUSES[order.status]?.length > 0 && (
                <div className="delete-btn-container" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {NEXT_STATUSES[order.status].map((nextStatus) => (
                    <button key={nextStatus} onClick={() => updateOrderStatus(order._id, nextStatus)}>
                      Mark {nextStatus}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
