import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  
  // UI States
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 'initial' -> 'processing' -> 'success' or 'failed'
  const [paymentStatus, setPaymentStatus] = useState('initial'); 
  const [selectedMethod, setSelectedMethod] = useState(null);

  // Form Data
  const [vpa, setVpa] = useState('');
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' });

  const API_KEY = 'key_test_abc123';
  const API_SECRET = 'secret_test_xyz789';

  useEffect(() => {
    if (!orderId) { setError("Missing Order ID"); setLoading(false); return; }

    fetch(`http://localhost:8000/api/v1/orders/${orderId}/public`)
      .then(res => res.ok ? res.json() : Promise.reject("Order not found"))
      .then(data => { setOrder(data); setLoading(false); })
      .catch(err => { setError(err); setLoading(false); });
  }, [orderId]);

  // --- THE POLLING LOGIC ---
  const pollStatus = (paymentId) => {
    const interval = setInterval(() => {
      fetch(`http://localhost:8000/api/v1/payments/${paymentId}`)
        .then(res => res.json())
        .then(data => {
          console.log("Polling Status:", data.status);
          
          if (data.status === 'success') {
            clearInterval(interval);
            setPaymentStatus('success');
            window.parent.postMessage({ type: 'payment_success', data }, '*');
          } 
          else if (data.status === 'failed') {
            clearInterval(interval);
            setPaymentStatus('failed');
            setError(data.error_description || "Payment Failed");
            window.parent.postMessage({ type: 'payment_failed', data }, '*');
          }
          // If 'pending' or 'processing', do nothing and wait for next poll
        })
        .catch(err => console.error("Polling error", err));
    }, 2000); // Check every 2 seconds
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setPaymentStatus('processing'); // 1. Show Spinner
    
    const payload = {
      order_id: orderId,
      method: selectedMethod,
      amount: order.amount,
      vpa: selectedMethod === 'upi' ? vpa : undefined,
      card: selectedMethod === 'card' ? { 
        number: card.number, 
        expiry_month: card.expiry.split('/')[0] || '12', 
        expiry_year: card.expiry.split('/')[1] || '25', 
        cvc: card.cvv 
      } : undefined,
    };

    try {
      const res = await fetch('http://localhost:8000/api/v1/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, 'x-api-secret': API_SECRET },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        // 2. Start Waiting (Polling) instead of showing success immediately
        console.log("Payment Created (Pending). Starting Poll...");
        pollStatus(data.id); 
      } else {
        setPaymentStatus('failed');
        setError(data.error?.description || "Payment failed");
      }
    } catch (err) {
      setPaymentStatus('failed');
      setError("Network connection failed.");
    }
  };

  if (loading) return <div style={{padding:'20px'}}>Loading...</div>;

  // --- SUCCESS VIEW ---
  if (paymentStatus === 'success') {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Arial', border: '1px solid #eee', borderRadius: '8px', maxWidth: '400px', margin: '20px auto' }}>
        <div style={{ fontSize: '50px', marginBottom: '20px' }}>✅</div>
        <h2 style={{color: 'green', margin: '0 0 10px 0'}}>Payment Successful!</h2>
        <p style={{color: '#555'}}>Your transaction for ₹{order.amount/100} is complete.</p>
        <div style={{marginTop: '20px', fontSize: '12px', color: '#999'}}>ID: {orderId}</div>
      </div>
    );
  }

  // --- MAIN FORM VIEW ---
  return (
    <div style={{ padding: '25px', fontFamily: 'Arial', maxWidth: '450px', margin: '30px auto', border: '1px solid #dcdcdc', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '25px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
        <h2 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>Complete Payment</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
          <span style={{ color: '#666' }}>Amount to Pay:</span>
          <span style={{ fontSize: '20px', fontWeight: 'bold' }}>₹{order.amount / 100}</span>
        </div>
        <div style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>Order ID: {orderId}</div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* Processing State */}
      {paymentStatus === 'processing' ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div className="spinner" style={{ fontSize: '30px', marginBottom: '15px', animation: 'spin 1s linear infinite' }}>🔄</div>
          <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>Processing Payment...</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>Please do not close this window.</p>
        </div>
      ) : (
        /* Payment Methods */
        <>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
            <button 
              onClick={() => setSelectedMethod('upi')}
              style={{ flex: 1, padding: '12px', border: selectedMethod === 'upi' ? '2px solid #007bff' : '1px solid #ccc', borderRadius: '8px', background: selectedMethod === 'upi' ? '#f0f7ff' : 'white', cursor: 'pointer', fontWeight: 'bold' }}
            >
              UPI
            </button>
            <button 
              onClick={() => setSelectedMethod('card')}
              style={{ flex: 1, padding: '12px', border: selectedMethod === 'card' ? '2px solid #007bff' : '1px solid #ccc', borderRadius: '8px', background: selectedMethod === 'card' ? '#f0f7ff' : 'white', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Card
            </button>
          </div>

          {/* Forms */}
          {selectedMethod === 'upi' && (
            <form onSubmit={handlePayment}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>UPI ID / VPA</label>
                <input 
                  placeholder="username@bank" 
                  value={vpa} 
                  onChange={e => setVpa(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px', boxSizing: 'border-box' }} 
                />
              </div>
              <button type="submit" style={{ width: '100%', padding: '14px', background: '#0056b3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                Pay ₹{order.amount / 100}
              </button>
            </form>
          )}

          {selectedMethod === 'card' && (
            <form onSubmit={handlePayment}>
              <div style={{ marginBottom: '15px' }}>
                <input placeholder="Card Number" value={card.number} onChange={e => setCard({...card, number: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', marginBottom: '10px', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input placeholder="MM/YY" value={card.expiry} onChange={e => setCard({...card, expiry: e.target.value})} required style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                  <input placeholder="CVV" value={card.cvv} onChange={e => setCard({...card, cvv: e.target.value})} required style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                </div>
              </div>
              <button type="submit" style={{ width: '100%', padding: '14px', background: '#0056b3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                Pay ₹{order.amount / 100}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
};

export default Checkout;