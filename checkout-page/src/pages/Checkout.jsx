import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('initial'); // initial, processing, success, failed

  // Hardcoded keys for the checkout widget (In real life, these come from props or config)
  const API_KEY = 'key_test_abc123';
  const API_SECRET = 'secret_test_xyz789';

  useEffect(() => {
    if (!orderId) {
      setError("Missing Order ID");
      setLoading(false);
      return;
    }

    // Fetch Order Details
    fetch(`http://localhost:8000/api/v1/orders/${orderId}/public`) // Using the Public route we made
      .then(res => {
        if (!res.ok) throw new Error("Order not found");
        return res.json();
      })
      .then(data => {
        setOrder(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [orderId]);

  const handlePayment = async (method, vpa = null) => {
    setPaymentStatus('processing');
    
    const payload = {
      order_id: orderId,
      method: method,
      amount: order.amount, // Include amount for validation
      card: method === 'card' ? { 
        number: "4242424242424242", 
        expiry_month: "12", 
        expiry_year: "30", 
        cvc: "123" 
      } : undefined,
      vpa: method === 'upi' ? (vpa || "test@upi") : undefined
    };

    try {
      const res = await fetch('http://localhost:8000/api/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,       // <--- CRITICAL: Sending Auth Headers
          'x-api-secret': API_SECRET  // <--- CRITICAL: Sending Auth Headers
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setPaymentStatus('success');
        // Notify parent window (for the SDK)
        window.parent.postMessage({ type: 'payment_success', data }, '*');
      } else {
        setPaymentStatus('failed');
        setError(data.error?.description || "Payment failed");
        window.parent.postMessage({ type: 'payment_failed', data }, '*');
      }
    } catch (err) {
      setPaymentStatus('failed');
      setError("Network connection failed.");
    }
  };

  if (loading) return <div style={{padding: '20px'}}>Loading Order...</div>;
  if (error) return <div style={{padding: '20px', color: 'red'}}>Error: {error}</div>;

  if (paymentStatus === 'success') {
    return (
      <div style={{padding: '40px', textAlign: 'center', fontFamily: 'Arial'}}>
        <h2 style={{color: 'green'}}>Payment Successful!</h2>
        <p>Order {orderId} has been processed.</p>
        <p>You can close this window.</p>
      </div>
    );
  }

  return (
    <div className="checkout-container" style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '400px', margin: '0 auto', border: '1px solid #eee', borderRadius: '8px' }}>
      <h2>Secure Checkout</h2>
      <div style={{ marginBottom: '20px', padding: '10px', background: '#f9f9f9', borderRadius: '4px' }}>
        <div><strong>Merchant:</strong> Test Merchant</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '10px' }}>
          ₹{order.amount / 100} <span style={{fontSize: '14px', color: '#666'}}>{order.currency}</span>
        </div>
      </div>

      {paymentStatus === 'processing' ? (
        <div style={{textAlign: 'center', padding: '20px'}}>Processing Payment...</div>
      ) : (
        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
          <button 
            onClick={() => handlePayment('upi', 'user@upi')}
            style={{padding: '12px', background: '#673ab7', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px'}}
          >
            Pay with UPI
          </button>
          <button 
            onClick={() => handlePayment('card')}
            style={{padding: '12px', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px'}}
          >
            Pay with Card (Test)
          </button>
        </div>
      )}
    </div>
  );
};

export default Checkout;