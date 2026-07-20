import React, { useEffect, useState } from "react";
import { HiOutlineArrowNarrowRight } from "react-icons/hi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { gatewayClient } from "../../api/client";

const Reservation = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [phone, setPhone] = useState("");
  const [guests, setGuests] = useState(2);
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState([]);
  const [booked, setBooked] = useState(false);
  const navigate = useNavigate();

  // Branches are now real documents (name, address, hours) served by the
  // Reservation Service, not a hardcoded string enum baked into this form
  // -- see services/reservation-service/src/seed/seedBranches.js.
  useEffect(() => {
    gatewayClient
      .get("/branches")
      .then(({ data }) => setBranches(data.branches))
      .catch(() => toast.error("Failed to load branches"));
  }, []);

  const handleReservation = async (e) => {
    e.preventDefault();
    try {
      await gatewayClient.post("/reservations", {
        firstName,
        lastName,
        email,
        phone,
        date,
        time,
        guests: Number(guests),
        branchId,
      });
      toast.success("Reservation confirmed");
      setBooked(true);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };

  if (booked) {
    return (
      <section className="reservation" id="reservation">
        <div className="container" style={{ justifyContent: "center" }}>
          <div className="banner" style={{ flex: "1 1 500px", maxWidth: 500 }}>
            <div className="reservation-success-box">
              <div className="success-icon">&#10003;</div>
              <h2>Your table is booked!</h2>
              <p>
                We've saved your seats. While you wait, would you like to
                order food ahead so it's ready when you arrive?
              </p>
              <div className="success-actions">
                <button className="btn" onClick={() => navigate("/order")}>
                  Order Food Now
                </button>
                <button className="btn btn-outline" onClick={() => navigate("/")}>
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="reservation" id="reservation">
      <div className="container">
        <img src="./modi.png" alt="" />
        <div className="banner">
          <div className="reservation_form_box">
            <h1>MAKE A RESERVATION</h1>
            <form>
              <div>
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div>
                <input
                  type="date"
                  placeholder="Date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <input
                  type="time"
                  placeholder="Time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  className="email_tag"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="guests-field">
                <label htmlFor="guests">Number of Guests</label>
                <input
                  id="guests"
                  type="number"
                  min="1"
                  max="20"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                />
              </div>
              <div id="res_div">
                <select
                  name="branch"
                  id="branch"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                >
                  <option value="" disabled hidden>
                    Restaurant Branch
                  </option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="buttons">
                <button type="submit" onClick={handleReservation} className="subbtn">
                  RESERVE NOW{" "}
                  <span>
                    <HiOutlineArrowNarrowRight />
                  </span>
                </button>
                <Link to={"/"}>
                  Back to Home{" "}
                  <span>
                    <HiOutlineArrowNarrowRight />
                  </span>
                </Link>
              </div>
            </form>
            <p>For Further Questions, Please Call 9392588167</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Reservation;
