import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import GoogleSignInButton from "../../components/GoogleSignInButton";

// Reached only via the hidden double-click on the homepage hero's chef
// illustration -- no nav link anywhere points here. Uses the same Google
// Sign-In as the customer Login page; the only difference is what happens
// after: a "customer" role account is bounced right back out. The real
// access control is server-side (role on the JWT, checked again by every
// service), this is just an honest front door for staff/admin instead of
// funnelling them through the customer login.
const ManagerLogin = () => {
  const { user, isAuthenticated, loginWithGoogle, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const isStaff = user.role === "staff" || user.role === "admin";
    if (isStaff) {
      navigate("/manager-dashboard", { replace: true });
    } else {
      toast.error("This Google account doesn't have manager access.");
      logout();
    }
  }, [isAuthenticated, user, navigate, logout]);

  const handleCredential = async (idToken) => {
    try {
      await loginWithGoogle(idToken);
    } catch (error) {
      toast.error(error.response?.data?.message || "Sign-in failed");
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-visual auth-visual--manager">
        <span className="badge">Staff &amp; Admin Only</span>
        <div className="auth-brand">BurgirrHUB</div>
        <h1>Back of house.</h1>
        <p>
          Manage reservations, live orders, seat availability and kitchen
          stock across every branch. Access is restricted to authorized
          BurgirrHUB accounts.
        </p>
      </div>
      <div className="auth-form-panel">
        <div className="auth-card">
          <h2>Manager Access</h2>
          <p className="auth-subtitle">Sign in with your authorized Google account to continue.</p>
          <div className="manform">
            <GoogleSignInButton onCredential={handleCredential} />
            <a href="/" className="back-to-home-btn back-to-home-btn--inline">
              Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerLogin;
