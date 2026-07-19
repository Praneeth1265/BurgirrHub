import React from "react";
import { Link, useLocation } from "react-router-dom";
import { HiOutlineArrowNarrowRight } from "react-icons/hi";

const OrderSuccess = () => {
  const { state } = useLocation();

  return (
    <section className="notFound">
      <div className="container">
        <img src="/sandwich.png" alt="order submitted" />
        <h1>Payment submitted!</h1>
        <p>
          Order ID: {state?.orderId || "—"}
          <br />
          We&apos;re confirming your payment now — you&apos;ll get an email shortly, and it'll show up in{" "}
          <Link to="/orders/history">your order history</Link> as &quot;confirmed&quot; once done.
        </p>
        <Link to="/">
          Back to Home <HiOutlineArrowNarrowRight />
        </Link>
      </div>
    </section>
  );
};

export default OrderSuccess;
