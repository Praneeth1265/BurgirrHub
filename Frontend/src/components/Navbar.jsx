// Navbar.js
import React from "react";
import { data } from "../restApi.json";
import { Link } from "react-scroll";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const isStaff = user?.role === "staff" || user?.role === "admin";

  return (
    <>
      <nav className="nav1">
        <img src="./burger_favicon.png" alt="" height={70} />
        <div className="logo">BurgirrHUB</div>
        <div className="navLinks">
          <div className="links">
            {data[0].navbarLinks.map((element) => (
              element.title !== "RESERVATION" && (
              <div key={element.id}>
                <Link
                  to={element.link}
                  spy={true}
                  smooth={true}
                  duration={1500}
                >
                  {element.title}
                </Link>
              </div>
              )
            ))}
            <div>
              <NavLink to="/reservations">RESERVATION</NavLink>
            </div>
            <div>
              <NavLink to="/order">
                ORDER {itemCount > 0 && `(${itemCount})`}
              </NavLink>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isStaff && (
              <NavLink to="/manager-dashboard">
                <button className="manbtn">Manager Dashboard</button>
              </NavLink>
            )}
            {isAuthenticated ? (
              <>
                <NavLink to="/orders/history">My Orders</NavLink>
                <button className="manbtn" onClick={logout}>
                  Logout
                </button>
              </>
            ) : (
              <NavLink to="/login">
                <button className="manbtn">Sign In</button>
              </NavLink>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
