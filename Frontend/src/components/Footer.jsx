import React from "react";
import { Link } from "react-scroll";
import { NavLink } from "react-router-dom";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="logo">BurgirrHUB</div>
          <p>
            A countryside kitchen with a modern table — fresh, honest food
            served with care. Join us for a sit-down meal or order ahead for
            pickup, no queue required.
          </p>
        </div>

        <div className="footer-col">
          <h4>Explore</h4>
          <ul>
            <li>
              <Link to="heroSection" smooth={true} duration={800} offset={-90}>
                Home
              </Link>
            </li>
            <li>
              <Link to="about" smooth={true} duration={800} offset={-90}>
                About Us
              </Link>
            </li>
            <li>
              <Link to="menu" smooth={true} duration={800} offset={-90}>
                Menu
              </Link>
            </li>
            <li>
              <Link to="team" smooth={true} duration={800} offset={-90}>
                Our Team
              </Link>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Dine With Us</h4>
          <ul>
            <li>
              <NavLink to="/reservations">Reserve a Table</NavLink>
            </li>
            <li>
              <NavLink to="/order">Order Online</NavLink>
            </li>
            <li>
              <NavLink to="/orders/history">My Orders</NavLink>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Visit Us</h4>
          <ul>
            <li>
              <span>Open Daily</span>
            </li>
            <li>
              <span>12:00 PM &ndash; 12:00 AM</span>
            </li>
            <li>
              <span>+91 93925 88167</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <span>&copy; {year} BurgirrHUB. All rights reserved.</span>
        <span>Crafted with care by the BurgirrHUB Team</span>
      </div>
    </footer>
  );
};

export default Footer;
