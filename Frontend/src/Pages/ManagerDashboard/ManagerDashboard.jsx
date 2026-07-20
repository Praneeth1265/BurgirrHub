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

  const [branches, setBranches] = useState([]);
  const [seatEdits, setSeatEdits] = useState({});
  const [loadingBranches, setLoadingBranches] = useState(true);

  const [menuItems, setMenuItems] = useState([]);
  const [stockEdits, setStockEdits] = useState({});
  const [loadingMenu, setLoadingMenu] = useState(true);

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

  const fetchBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const { data } = await gatewayClient.get("/branches");
      setBranches(data.branches);
      setSeatEdits(Object.fromEntries(data.branches.map((b) => [b._id, b.availableSeats])));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load branches");
    } finally {
      setLoadingBranches(false);
    }
  }, []);

  const fetchMenu = useCallback(async () => {
    setLoadingMenu(true);
    try {
      const { data } = await gatewayClient.get("/menu", { params: { all: true } });
      setMenuItems(data.items);
      setStockEdits(Object.fromEntries(data.items.map((i) => [i._id, i.stock ?? ""])));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load menu");
    } finally {
      setLoadingMenu(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
    fetchOrders();
    fetchBranches();
    fetchMenu();
  }, [fetchReservations, fetchOrders, fetchBranches, fetchMenu]);

  const deleteReservation = async (id, branchName) => {
    try {
      await gatewayClient.delete(`/reservations/${id}`);
      toast.success("Reservation deleted");
      setReservationsByBranch((prev) => {
        const updated = { ...prev };
        updated[branchName] = updated[branchName].filter((r) => r._id !== id);
        return updated;
      });
      fetchBranches();
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

  const saveSeats = async (branchId) => {
    const value = Number(seatEdits[branchId]);
    if (Number.isNaN(value) || value < 0) {
      toast.error("Enter a valid seat count");
      return;
    }
    try {
      const { data } = await gatewayClient.patch(`/branches/${branchId}`, { availableSeats: value });
      setBranches((prev) => prev.map((b) => (b._id === branchId ? data.branch : b)));
      toast.success("Seat availability updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update seats");
    }
  };

  const saveStock = async (itemId) => {
    const raw = stockEdits[itemId];
    const value = raw === "" ? null : Number(raw);
    if (value !== null && (Number.isNaN(value) || value < 0)) {
      toast.error("Enter a valid stock count");
      return;
    }
    try {
      const { data } = await gatewayClient.patch(`/menu/${itemId}`, { stock: value });
      setMenuItems((prev) => prev.map((i) => (i._id === itemId ? data.item : i)));
      toast.success(`${data.item.name} stock updated`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update stock");
    }
  };

  const toggleAvailability = async (item) => {
    try {
      const { data } = await gatewayClient.patch(`/menu/${item._id}`, { isAvailable: !item.isAvailable });
      setMenuItems((prev) => prev.map((i) => (i._id === item._id ? data.item : i)));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update availability");
    }
  };

  return (
    <div style={{ paddingBottom: 60 }}>
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

      <div className="dash-tabs">
        <button className={`dash-tab ${tab === "reservations" ? "active" : ""}`} onClick={() => setTab("reservations")}>
          Reservations
        </button>
        <button className={`dash-tab ${tab === "orders" ? "active" : ""}`} onClick={() => setTab("orders")}>
          Orders
        </button>
        <button className={`dash-tab ${tab === "availability" ? "active" : ""}`} onClick={() => setTab("availability")}>
          Availability
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
                      <div>GUESTS: {reservation.guests ?? "-"}</div>
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

      {tab === "availability" && (
        <div className="availability-section">
          <h3>Seat Availability</h3>
          {loadingBranches && <p>Loading branches...</p>}
          <div className="branch-availability-grid">
            {branches.map((b) => (
              <div className="branch-availability-card" key={b._id}>
                <h4>{b.name}</h4>
                <div className="capacity-note">Capacity: {b.capacity} seats</div>
                <div className="availability-edit-row">
                  <input
                    type="number"
                    min="0"
                    max={b.capacity}
                    value={seatEdits[b._id] ?? ""}
                    onChange={(e) => setSeatEdits((prev) => ({ ...prev, [b._id]: e.target.value }))}
                  />
                  <button className="btn" onClick={() => saveSeats(b._id)}>
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>

          <h3>Menu Stock</h3>
          {loadingMenu && <p>Loading menu...</p>}
          <div className="stock-table-wrap">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {menuItems.map((item) => (
                  <tr key={item._id}>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>&#8377;{item.price}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          type="number"
                          min="0"
                          placeholder="∞"
                          value={stockEdits[item._id] ?? ""}
                          onChange={(e) => setStockEdits((prev) => ({ ...prev, [item._id]: e.target.value }))}
                        />
                        <button className="btn" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => saveStock(item._id)}>
                          Save
                        </button>
                      </div>
                    </td>
                    <td>
                      <button
                        className={`toggle-btn ${item.isAvailable ? "available" : "unavailable"}`}
                        onClick={() => toggleAvailability(item)}
                      >
                        {item.isAvailable ? "Available" : "Unavailable"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
