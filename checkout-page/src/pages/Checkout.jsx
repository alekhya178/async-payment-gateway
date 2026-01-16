import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  
  // UI States
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('initial'); // initial, processing, success, failed
  const [selectedMethod, setSelectedMethod] = useState(null); // 'upi' or 'card'

  // Form Input States
  const [vpa, setVpa] = useState('');
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' });

  // Keys
  const API_KEY = 'key_test_abc123';
  const API_SECRET = 'secret_test_xyz789';

  useEffect(() => {
    if (!orderId) {
      setError("Missing Order ID");
      setLoading(false);
      return;
    }

    // Fetch Order Details
    fetch(`http://localhost:8000/api/v1/orders/${orderId}/public`)
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

  const handlePayment = async (e) => {
    e.preventDefault(); // STOP page refresh
    setPaymentStatus('processing');
    setError(null);
    
    // Prepare Payload
    const payload = {
      order_id: orderId,
      method: selectedMethod,
      amount: order.amount,
      vpa: selectedMethod === 'upi' ? vpa : undefined,
      card: selectedMethod === 'card' ? { 
        number: card.number, 
        expiry_month: card.expiry.split('/')[0] || '12', 
        expiry_year: card.expiry.split('/')[1] || '30', 
        cvc: card.cvv 
      } : undefined,
    };

    try {
      const res = await fetch('http://localhost:8000/api/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,       // <--- Sending Auth Headers
          'x-api-secret': API_SECRET  // <--- Sending Auth Headers
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setPaymentStatus('success');
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

  if (paymentStatus === 'success') {
    return (
      <div style={{padding: '40px', textAlign: 'center', fontFamily: 'Arial'}}>
        <h2 style={{color: 'green'}}>Payment Successful!</h2>
        <p>Order {orderId} processed.</p>
        <p>You can close this window.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '400px', margin: '0 auto', border: '1px solid #eee', borderRadius: '8px' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '4px' }}>
        <h3 style={{marginTop: 0}}>Complete Payment</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold' }}>
          <span>Amount:</span>
          <span>₹{order.amount / 100}</span>
        </div>
        <div style={{fontSize: '12px', color: '#666'}}>ID: {orderId}</div>
      </div>

      {/* ERROR MESSAGE */}
      {error && <div style={{color: 'red', marginBottom: '15px', textAlign: 'center'}}>{error}</div>}

      {/* METHOD SELECTION TABS */}
      {paymentStatus !== 'processing' && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            onClick={() => setSelectedMethod('upi')}
            style={{ 
              flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer',
              background: selectedMethod === 'upi' ? '#e3f2fd' : 'white',
              borderColor: selectedMethod === 'upi' ? '#2196f3' : '#ccc'
            }}
          >
            UPI
          </button>
          <button 
            onClick={() => setSelectedMethod('card')}
            style={{ 
              flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer',
              background: selectedMethod === 'card' ? '#e3f2fd' : 'white',
              borderColor: selectedMethod === 'card' ? '#2196f3' : '#ccc'
            }}
          >
            Card
          </button>
        </div>
      )}

      {/* UPI FORM */}
      {selectedMethod === 'upi' && paymentStatus !== 'processing' && (
        <form onSubmit={handlePayment}>
          <input 
            placeholder="example@upi" 
            value={vpa} 
            onChange={e => setVpa(e.target.value)} 
            required 
            style={{ width: '100%', padding: '10px', marginBottom: '15px', boxSizing: 'border-box' }} 
          />
          <button type="submit" style={{ width: '100%', padding: '12px', background: '#2196f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}>
            Pay ₹{order.amount / 100}
          </button>
        </form>
      )}

      {/* CARD FORM */}
      {selectedMethod === 'card' && paymentStatus !== 'processing' && (
        <form onSubmit={handlePayment}>
          <input placeholder="Card Number" value={card.number} onChange={e => setCard({...card, number: e.target.value})} required style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input placeholder="MM/YY" value={card.expiry} onChange={e => setCard({...card, expiry: e.target.value})} required style={{ flex: 1, padding: '10px', boxSizing: 'border-box' }} />
            <input placeholder="CVC" value={card.cvv} onChange={e => setCard({...card, cvv: e.target.value})} required style={{ flex: 1, padding: '10px', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" style={{ width: '100%', padding: '12px', background: '#2196f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}>
            Pay ₹{order.amount / 100}
          </button>
        </form>
      )}

      {/* PROCESSING SPINNER */}
      {paymentStatus === 'processing' && (
        <div style={{textAlign: 'center', padding: '20px', color: '#666'}}>
          <div className="spinner" style={{marginBottom: '10px'}}>🔄</div>
          Processing Secure Payment...
        </div>
      )}

    </div>
  );
};

export default Checkout;