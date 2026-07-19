import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Wraps a route. With no `roles` prop, just requires any logged-in user
// (customer, staff, or admin). With `roles`, requires one of those
// specific roles -- this is only a UI-level gate for showing/hiding pages;
// the actual enforcement happens server-side on every request regardless
// (see each service's RBAC middleware), so there's nothing unsafe about a
// user briefly seeing a redirect instead of a 403.
const RequireAuth = ({ children, roles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RequireAuth;
