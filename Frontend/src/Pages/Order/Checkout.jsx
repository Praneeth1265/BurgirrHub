import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import toast from "react-hot-toast";
import { gatewayClient } from "../../api/client";
import { useCart } from "../../context/CartContext";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CheckoutForm = ({ onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    if (paymentIntent) {
      onSuccess(paymentIntent.status);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button className="btn" type="submit" disabled={!stripe || submitting} style={{ marginTop: 16 }}>
        {submitting ? "Processing..." : "Pay now"}
      </button>
    </form>
  );
};

const Checkout = () => {
  const { branch, items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [clientSecret, setClientSecret] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [placing, setPlacing] = useState(false);

  const placeOrder = async () => {
    setPlacing(true);
    try {
      const { data: orderData } = await gatewayClient.post("/orders", {
        branch,
        items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      });
      const newOrderId = orderData.order._id;
      setOrderId(newOrderId);

      const { data: intentData } = await gatewayClient.post(`/payments/${newOrderId}/intent`);
      setClientSecret(intentData.clientSecret);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to start checkout");
    } finally {
      setPlacing(false);
    }
  };

  const handlePaymentResult = (status) => {
    clearCart();
    // The order's status flip to "confirmed" is webhook-driven (Payment
    // Service -> RabbitMQ -> Order Service, see Phase 4), not decided by
    // this response -- Stripe confirming the charge client-side and our
    // backend marking the order confirmed are two separate steps
    // connected asynchronously, on purpose. This page can only honestly
    // say the payment was submitted, not that the order is confirmed yet.
    navigate("/order/success", { state: { orderId, paymentStatus: status } });
  };

  if (items.length === 0) {
    return (
      <div className="menu-container">
        <a href="/" className="back-to-home-btn">
          Back to Home
        </a>
        <h1 className="menu-title">Checkout</h1>
        <p>Your cart is empty.</p>
        <Link to="/order">Browse the menu</Link>
      </div>
    );
  }

  return (
    <div className="menu-container">
      <a href="/" className="back-to-home-btn">
        Back to Home
      </a>
      <h1 className="menu-title">Checkout</h1>

      <div className="checkout-summary">
        <h2>{branch}</h2>
        {items.map((i) => (
          <div className="checkout-line" key={i.menuItemId}>
            <span>
              {i.name} x{i.quantity}
            </span>
            <span>&#8377;{i.price * i.quantity}</span>
          </div>
        ))}
        <div className="checkout-line checkout-total">
          <span>Total</span>
          <span>&#8377;{subtotal}</span>
        </div>
      </div>

      {!clientSecret && (
        <button className="btn" onClick={placeOrder} disabled={placing}>
          {placing ? "Placing order..." : "Place order & pay"}
        </button>
      )}

      {clientSecret && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm onSuccess={handlePaymentResult} />
        </Elements>
      )}
    </div>
  );
};

export default Checkout;
