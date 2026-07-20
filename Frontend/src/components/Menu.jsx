import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { gatewayClient } from "../api/client";

const Menu = () => {
  const [dishes, setDishes] = useState([]);

  useEffect(() => {
    gatewayClient
      .get("/menu", { params: { popular: true } })
      .then(({ data }) => setDishes(data.items))
      .catch(() => setDishes([]));
  }, []);

  return (
    <>
      <section className="menu" id="menu">
        <div className="container">
          <div className="heading_section">
            <span className="section-eyebrow">Fan Favorites</span>
            <h1 className="heading">POPULAR DISHES</h1>
            <p>
              At BurgirrHUB, our menu is packed with mouthwatering options
              spanning American, Italian and Chinese kitchens, but there are a
              few dishes that have become absolute fan favorites &mdash; the
              creations our guests keep coming back for.
            </p>
          </div>
          <div className="dishes_container">
            {dishes.map((item) => (
              <Link to={`/order?item=${item._id}`} className="card" key={item._id}>
                <button>{item.cuisine}</button>
                <img src={item.imageUrl || "/dinner1.jpeg"} alt={item.name} />
                <div className="card-body">
                  <h3>{item.name}</h3>
                  <div className="card-meta">
                    <span>{item.category}</span>
                    <span className="card-price">&#8377;{item.price}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <Link to="/menu2" className="btn menu-view-all">
            View Full Menu
          </Link>
        </div>
      </section>
    </>
  );
};
export default Menu;
