import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  
  const [order, setOrder] = useState(null);
  const [method, setMethod] = useState(null);
  const [status, setStatus] = useState('initial'); // initial, processing, success, failed
  const [paymentId, setPaymentId] = useState(null);
  
  // NEW: State for specific error messages
  const [errorMessage, setErrorMessage] = useState('Payment could not be processed');

  // Form States
  const [vpa, setVpa] = useState('');
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' });

  useEffect(() => {
    // Fetch Order Details
    if (orderId) {
        fetch(`http://localhost:8000/api/v1/orders/${orderId}/public`)
            .then(res => res.json())
            .then(data => setOrder(data))
            .catch(err => console.error(err));
    }
  }, [orderId]);

  const handlePayment = async (e) => {
    e.preventDefault();
    setStatus('processing');
    setErrorMessage(''); // Clear previous errors

    const payload = {
        order_id: orderId,
        method: method,
        vpa: method === 'upi' ? vpa : undefined,
        card: method === 'card' ? {
            number: card.number,
            expiry_month: card.expiry.split('/')[0],
            expiry_year: card.expiry.split('/')[1],
            cvv: card.cvv,
            holder_name: card.name
        } : undefined
    };

    try {
        const res = await fetch('http://localhost:8000/api/v1/payments/public', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok) {
            setPaymentId(data.id);
            pollStatus(data.id);
        } else {
            // NEW LOGIC: Capture specific backend error
            if (data.error && data.error.description) {
                setErrorMessage(data.error.description);
            } else {
                setErrorMessage("Payment failed. Please check your details.");
            }
            setStatus('failed');
        }
    } catch (err) { 
        setErrorMessage("Network connection failed.");
        setStatus('failed'); 
    }
  };

  const pollStatus = (pid) => {
    const interval = setInterval(async () => {
        const res = await fetch(`http://localhost:8000/api/v1/payments/${pid}`);
        const data = await res.json();
        if (data.status === 'success') {
            setStatus('success');
            clearInterval(interval);
        } else if (data.status === 'failed') {
            // If it failed during the async bank delay
            if (data.error_description) {
                setErrorMessage(data.error_description);
            } else {
                setErrorMessage("Transaction declined by bank.");
            }
            setStatus('failed');
            clearInterval(interval);
        }
    }, 2000);
  };

  if (!order) return <div>Loading Order...</div>;

  return (
    <div data-test-id="checkout-container" style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', border: '1px solid #ccc' }}>
      
      {/* ORDER SUMMARY */}
      <div data-test-id="order-summary" style={{ marginBottom: '20px', borderBottom: '1px solid #eee' }}>
        <h2>Complete Payment</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Amount: </span><span data-test-id="order-amount">₹{order.amount / 100}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Order ID: </span><span data-test-id="order-id">{orderId}</span>
        </div>
      </div>

      {/* SUCCESS STATE */}
      {status === 'success' && (
          <div data-test-id="success-state" style={{ color: 'green', textAlign: 'center' }}>
              <h2>Payment Successful!</h2>
              <div>Payment ID: <span data-test-id="payment-id">{paymentId}</span></div>
              <span data-test-id="success-message">Your payment has been processed successfully</span>
          </div>
      )}

      {/* FAILED STATE */}
      {status === 'failed' && (
          <div data-test-id="error-state" style={{ color: 'red', textAlign: 'center' }}>
              <h2>Payment Failed</h2>
              
              {/* NEW: Display the specific error message */}
              <span data-test-id="error-message" style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>
                {errorMessage}
              </span>
              
              <button data-test-id="retry-button" onClick={() => setStatus('initial')}>Try Again</button>
          </div>
      )}

      {/* PROCESSING STATE */}
      {status === 'processing' && (
          <div data-test-id="processing-state" style={{ textAlign: 'center' }}>
              <div className="spinner">...</div>
              <span data-test-id="processing-message">Processing payment...</span>
          </div>
      )}

      {/* INITIAL STATE - FORM */}
      {status === 'initial' && (
        <>
          <div data-test-id="payment-methods" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button data-test-id="method-upi" onClick={() => setMethod('upi')} style={{ flex: 1, padding: '10px', background: method === 'upi' ? '#ddd' : '#fff' }}>UPI</button>
            <button data-test-id="method-card" onClick={() => setMethod('card')} style={{ flex: 1, padding: '10px', background: method === 'card' ? '#ddd' : '#fff' }}>Card</button>
          </div>

          {method === 'upi' && (
              <form data-test-id="upi-form" onSubmit={handlePayment}>
                  <input data-test-id="vpa-input" placeholder="username@bank" value={vpa} onChange={e => setVpa(e.target.value)} required style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
                  <button data-test-id="pay-button" type="submit" style={{ width: '100%', padding: '10px', background: 'blue', color: 'white' }}>Pay</button>
              </form>
          )}

          {method === 'card' && (
              <form data-test-id="card-form" onSubmit={handlePayment}>
                  <input data-test-id="card-number-input" placeholder="Card Number" value={card.number} onChange={e => setCard({...card, number: e.target.value})} required style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input data-test-id="expiry-input" placeholder="MM/YY" value={card.expiry} onChange={e => setCard({...card, expiry: e.target.value})} required style={{ flex: 1, padding: '10px', marginBottom: '10px' }} />
                    <input data-test-id="cvv-input" placeholder="CVV" value={card.cvv} onChange={e => setCard({...card, cvv: e.target.value})} required style={{ flex: 1, padding: '10px', marginBottom: '10px' }} />
                  </div>
                  <input data-test-id="cardholder-name-input" placeholder="Name on Card" value={card.name} onChange={e => setCard({...card, name: e.target.value})} required style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
                  <button data-test-id="pay-button" type="submit" style={{ width: '100%', padding: '10px', background: 'blue', color: 'white' }}>Pay</button>
              </form>
          )}
        </>
      )}
    </div>
  );
};
export default Checkout;