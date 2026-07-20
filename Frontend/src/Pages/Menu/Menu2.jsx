import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { gatewayClient } from "../../api/client";

const CUISINES = ["All", "American", "Italian", "Chinese"];

const Menu2 = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cuisine, setCuisine] = useState("All");

  useEffect(() => {
    gatewayClient
      .get("/menu")
      .then(({ data }) => setItems(data.items))
      .catch(() => toast.error("Failed to load menu"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (cuisine === "All" ? items : items.filter((i) => i.cuisine === cuisine)),
    [items, cuisine]
  );

  return (
    <div className="menu-container">
      <Link to="/" className="back-to-home-btn">
        Back to Home
      </Link>
      <h1 className="menu-title">Our Menu</h1>
      <p className="menu-subtitle">
        From countryside classics to Italian and Chinese favorites &mdash; tap
        any dish to order it.
      </p>

      <div className="cuisine-filter">
        {CUISINES.map((c) => (
          <button key={c} className={cuisine === c ? "active" : ""} onClick={() => setCuisine(c)}>
            {c}
          </button>
        ))}
      </div>

      {loading && <p>Loading menu...</p>}

      <div className="menu-items">
        {filtered.map((item) => (
          <Link to={`/order?item=${item._id}`} className="menu-item" key={item._id}>
            <img src={item.imageUrl || "/dinner1.jpeg"} alt={item.name} className="burger-image" />
            <div className="menu-item-body">
              <span className="menu-link">
                <span className={`veg-dot ${item.isVeg ? "" : "nonveg"}`}></span>
                {item.name}
              </span>
              <p className="menu-item-desc">{item.description}</p>
              <div className="menu-item-meta">
                <span>{item.calories ? `${item.calories} kcal` : item.category}</span>
                <span className="menu-item-price">&#8377;{item.price}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Menu2;
