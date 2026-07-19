import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
    <div className="manparent">
      <div className="manlog">
        <h1>Sign In</h1>
        <div
          className="manform"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}
        >
          <GoogleSignInButton onCredential={handleCredential} />
          <a href="/" className="back-to-home-btn">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
