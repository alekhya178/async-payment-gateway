import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/payments', {
          headers: {
            'x-api-key': localStorage.getItem('api_key'),
            'x-api-secret': localStorage.getItem('api_secret')
          }
        });
        const data = await res.json();
        setTransactions(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTransactions();
  }, []);

  // --- ADDED THIS HELPER FUNCTION ---
  const formatCurrency = (paise) => {
    const rupees = paise / 100;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2
    }).format(rupees);
  };
  // ----------------------------------

  return (
    <div style={{ padding: '20px' }}>
      <h2>Transactions</h2>
      <Link to="/dashboard">Back to Dashboard</Link>
      <br /><br />
      
      <table data-test-id="transactions-table" border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Payment ID</th>
            <th>Order ID</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => (
            <tr key={txn.id} data-test-id="transaction-row" data-payment-id={txn.id}>
              <td data-test-id="payment-id">{txn.id}</td>
              <td data-test-id="order-id">{txn.order_id}</td>
              
              {/* --- UPDATED THIS LINE TO USE THE HELPER --- */}
              <td data-test-id="amount">{formatCurrency(txn.amount)}</td> 
              
              <td data-test-id="method">{txn.method}</td>
              <td data-test-id="status">{txn.status}</td>
              <td data-test-id="created-at">{new Date(txn.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Transactions;