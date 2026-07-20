import React, { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import GoogleSignInButton from "../../components/GoogleSignInButton";

// Replaces the old hardcoded-password Manager.jsx entirely. There's one
// login page for everyone -- customers and staff alike sign in with
// Google. What you can *do* afterward depends on the role your account
// was given server-side (new accounts default to "customer"; promoting
// someone to "staff"/"admin" is a manual DB step for now, documented in
// services/README.md -- there's no self-serve staff signup, intentionally).
const Login = () => {
  const { user, isAuthenticated, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const isStaff = user.role === "staff" || user.role === "admin";
    const redirectTo = location.state?.from || (isStaff ? "/manager-dashboard" : "/orders/history");
    navigate(redirectTo, { replace: true });
  }, [isAuthenticated, user, navigate, location]);

  const handleCredential = async (idToken) => {
    try {
      const loggedInUser = await loginWithGoogle(idToken);
      toast.success(`Welcome, ${loggedInUser.name}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Google sign-in failed");
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-visual auth-visual--customer">
        <div className="auth-brand">BurgirrHUB</div>
        <h1>Pull up a chair at our table.</h1>
        <p>
          Sign in to book a table, order ahead for pickup, and keep track of
          every meal you've shared with us &mdash; countryside comfort, served
          your way.
        </p>
      </div>
      <div className="auth-form-panel">
        <div className="auth-card">
          <h2>Sign In</h2>
          <p className="auth-subtitle">Continue with Google to reserve a table or order online.</p>
          <div className="manform">
            <GoogleSignInButton onCredential={handleCredential} />
            <Link to="/" className="back-to-home-btn back-to-home-btn--inline">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
