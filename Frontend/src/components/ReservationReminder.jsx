import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { gatewayClient } from "../api/client";
import { useAuth } from "../context/AuthContext";

// Only ever shows the caller's own nearest *upcoming* booking (see
// GET /reservations/mine, added alongside making reservations require
// sign-in) -- a past reservation isn't something worth reminding anyone
// about, so those are filtered out entirely rather than just deprioritized.
const ReservationReminder = () => {
  const { isAuthenticated } = useAuth();
  const [reservation, setReservation] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      setReservation(null);
      return;
    }
    gatewayClient
      .get("/reservations/mine")
      .then(({ data }) => {
        const now = Date.now();
        const upcoming = data.reservations
          .map((r) => ({ ...r, when: new Date(`${r.date}T${r.time}`).getTime() }))
          .filter((r) => !Number.isNaN(r.when) && r.when >= now)
          .sort((a, b) => a.when - b.when);
        setReservation(upcoming[0] || null);
      })
      .catch(() => setReservation(null));
  }, [isAuthenticated]);

  if (!isAuthenticated || !reservation || dismissed) return null;

  const dateLabel = new Date(`${reservation.date}T${reservation.time}`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="reservation-reminder">
      <button className="reservation-reminder-close" onClick={() => setDismissed(true)} aria-label="Dismiss">
        &times;
      </button>
      <div className="reservation-reminder-eyebrow">Upcoming Reservation</div>
      <div className="reservation-reminder-branch">{reservation.branch?.name}</div>
      <div className="reservation-reminder-row">
        <span>{dateLabel}</span>
        <span>{reservation.time}</span>
      </div>
      <div className="reservation-reminder-row">
        <span>
          {reservation.guests} guest{reservation.guests > 1 ? "s" : ""}
        </span>
      </div>
      <button className="btn reservation-reminder-btn" onClick={() => navigate("/order")}>
        Order Ahead
      </button>
    </div>
  );
};

export default ReservationReminder;
