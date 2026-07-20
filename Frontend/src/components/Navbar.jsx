// Navbar.js
import React, { useState } from "react";
import { data } from "../restApi.json";
import { Link } from "react-scroll";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const isStaff = user?.role === "staff" || user?.role === "admin";

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav className="nav1">
        <img src="./burger_favicon.png" alt="" height={44} />
        <div className="logo">BurgirrHUB</div>

        <button
          className={`nav-toggle ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`navLinks ${menuOpen ? "open" : ""}`}>
          <div className="links">
            {data[0].navbarLinks.map(
              (element) =>
                element.title !== "RESERVATION" && (
                  <div key={element.id}>
                    <Link
                      to={element.link}
                      spy={true}
                      smooth={true}
                      duration={800}
                      offset={-90}
                      onClick={closeMenu}
                    >
                      {element.title}
                    </Link>
                  </div>
                )
            )}
            <div>
              <NavLink to="/reservations" onClick={closeMenu}>
                RESERVATION
              </NavLink>
            </div>
            <div>
              <NavLink to="/order" onClick={closeMenu}>
                ORDER {itemCount > 0 && `(${itemCount})`}
              </NavLink>
            </div>
          </div>
          <div className="nav-actions">
            {isStaff && (
              <NavLink to="/manager-dashboard" onClick={closeMenu}>
                <button className="manbtn">Manager Dashboard</button>
              </NavLink>
            )}
            {isAuthenticated ? (
              <>
                <NavLink to="/orders/history" onClick={closeMenu}>
                  My Orders
                </NavLink>
                <button
                  className="manbtn"
                  onClick={() => {
                    closeMenu();
                    logout();
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <NavLink to="/login" onClick={closeMenu}>
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
