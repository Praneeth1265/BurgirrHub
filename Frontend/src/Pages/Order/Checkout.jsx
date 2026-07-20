import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import toast from "react-hot-toast";
import { gatewayClient } from "../../api/client";
import { useCart } from "../../context/CartContext";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
const GST_RATE = 0.05; // 2.5% CGST + 2.5% SGST -- display only; the server-computed order.totalAmount is what's actually charged.

const CardPaymentForm = ({ onSuccess }) => {
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
      <button className="btn" type="submit" disabled={!stripe || submitting} style={{ marginTop: 18, width: "100%" }}>
        {submitting ? "Processing..." : "Pay now"}
      </button>
    </form>
  );
};

const UpiPaymentForm = ({ orderId, amount, onSuccess }) => {
  const [upiId, setUpiId] = useState("");
  const [processing, setProcessing] = useState(false);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!upiId.trim()) {
      toast.error("Enter a UPI ID to continue");
      return;
    }
    setProcessing(true);
    // Simulated gateway "processing" delay -- there's no real UPI network
    // call here, see payment-service's confirmDummyUpi.
    setTimeout(async () => {
      try {
        await gatewayClient.post(`/payments/${orderId}/confirm-dummy-upi`, { upiId: upiId.trim() });
        onSuccess();
      } catch (error) {
        toast.error(error.response?.data?.message || "UPI payment failed");
        setProcessing(false);
      }
    }, 1400);
  };

  if (processing) {
    return (
      <div className="upi-processing">
        <div className="upi-spinner"></div>
        <p>Confirming payment of &#8377;{amount.toFixed(2)} via UPI&hellip;</p>
      </div>
    );
  }

  return (
    <form className="upi-form" onSubmit={handlePay}>
      <input
        type="text"
        placeholder="yourname@upi"
        value={upiId}
        onChange={(e) => setUpiId(e.target.value)}
      />
      <button className="btn" type="submit">
        Pay &#8377;{amount.toFixed(2)}
      </button>
    </form>
  );
};

const Checkout = () => {
  const { branch, items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [payMethod, setPayMethod] = useState("upi");
  const [cardLoading, setCardLoading] = useState(false);

  const gst = subtotal * GST_RATE;
  const grandTotal = subtotal + gst;

  const placeOrder = async () => {
    if (orderId) return orderId;
    setPlacing(true);
    try {
      const { data: orderData } = await gatewayClient.post("/orders", {
        branch,
        items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      });
      const newOrderId = orderData.order._id;
      setOrderId(newOrderId);
      return newOrderId;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to start checkout");
      return null;
    } finally {
      setPlacing(false);
    }
  };

  const handleProceedToPayment = async () => {
    await placeOrder();
  };

  const loadCardIntent = async () => {
    setPayMethod("card");
    if (clientSecret || cardLoading) return;
    const id = orderId || (await placeOrder());
    if (!id) return;
    setCardLoading(true);
    try {
      const { data } = await gatewayClient.post(`/payments/${id}/intent`);
      setClientSecret(data.clientSecret);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to start card payment");
    } finally {
      setCardLoading(false);
    }
  };

  const handlePaymentSuccess = (status) => {
    clearCart();
    // The order's status flip to "confirmed" is webhook/event-driven (see
    // paymentEventsConsumer), not decided by this response -- this page
    // can only honestly say the payment was submitted, not that the order
    // is confirmed yet.
    navigate("/order/success", { state: { orderId, paymentStatus: status || "submitted" } });
  };

  if (items.length === 0) {
    return (
      <div className="checkout-page">
        <a href="/" className="back-to-home-btn">
          Back to Home
        </a>
        <h1 className="menu-title" style={{ marginTop: 80 }}>
          Checkout
        </h1>
        <p>Your cart is empty.</p>
        <Link to="/order">Browse the menu</Link>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <a href="/" className="back-to-home-btn">
        Back to Home
      </a>

      <div className="checkout-summary" style={{ marginTop: 90 }}>
        <div className="checkout-summary-header">
          <h2>BurgirrHUB</h2>
          <span>{branch}</span>
        </div>

        {items.map((i) => (
          <div className="checkout-line" key={i.menuItemId}>
            <span>
              {i.name} x{i.quantity}
            </span>
            <span>&#8377;{(i.price * i.quantity).toFixed(2)}</span>
          </div>
        ))}

        <div className="checkout-line subtle" style={{ marginTop: 8 }}>
          <span>Subtotal</span>
          <span>&#8377;{subtotal.toFixed(2)}</span>
        </div>
        <div className="checkout-line subtle">
          <span>CGST (2.5%)</span>
          <span>&#8377;{(subtotal * 0.025).toFixed(2)}</span>
        </div>
        <div className="checkout-line subtle">
          <span>SGST (2.5%)</span>
          <span>&#8377;{(subtotal * 0.025).toFixed(2)}</span>
        </div>
        <div className="checkout-line checkout-total">
          <span>Total</span>
          <span>&#8377;{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {!orderId && (
        <button className="btn" onClick={handleProceedToPayment} disabled={placing} style={{ width: "100%" }}>
          {placing ? "Placing order..." : "Proceed to Payment"}
        </button>
      )}

      {orderId && (
        <div className="payment-section">
          <h2>Payment</h2>
          <div className="payment-tabs">
            <button
              className={`payment-tab ${payMethod === "upi" ? "active" : ""}`}
              onClick={() => setPayMethod("upi")}
            >
              UPI
            </button>
            <button
              className={`payment-tab ${payMethod === "card" ? "active" : ""}`}
              onClick={loadCardIntent}
            >
              Card
            </button>
          </div>

          {payMethod === "upi" && (
            <UpiPaymentForm orderId={orderId} amount={grandTotal} onSuccess={() => handlePaymentSuccess("succeeded")} />
          )}

          {payMethod === "card" && (
            <>
              {cardLoading && <p>Loading card payment...</p>}
              {clientSecret && (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CardPaymentForm onSuccess={handlePaymentSuccess} />
                </Elements>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Checkout;
