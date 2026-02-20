import React from "react";
import { HiOutlineArrowNarrowRight } from "react-icons/hi";
import axios from "axios";
import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

const Reservation = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [phone, setPhone] = useState(0);
  const [branch, setBranch] = useState("");
  const navigate = useNavigate();

  const handleReservation = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/v1/reservation/send`,
        { firstName, lastName, email, phone, date, time, branch },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );
      toast.success(data.message);
      setFirstName("");
      setLastName("");
      setPhone(0);
      setEmail("");
      setTime("");
      setDate("");
      setBranch("");
      navigate("/success");
    } catch (error) {
      console.error(error);
      toast.error(error.response.data.message);
    }
  };
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
                  type="number"
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div id="res_div">
                <select name="branch" id="branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
                  <option value="" disabled hidden>Restaurant Branch</option>
                  <option value="HSR Layout">HSR Layout</option>
                  <option value="Bannerghatta">Bannerghatta</option>
                  <option value="Kormanagala">Kormanagala</option>
                  <option value="White field">White field</option>
                  <option value="Majestic">Majestic</option>
                  <option value="ITPL">ITPL</option>
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
