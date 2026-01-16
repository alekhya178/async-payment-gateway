import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const [apiKey] = useState(localStorage.getItem('api_key') || 'Loading...');
    const [apiSecret] = useState(localStorage.getItem('api_secret') || 'Loading...');
  
    // Initialize with 0
    const [stats, setStats] = useState({
        count: 0,
        amount: 0,
        successRate: "0%"
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('http://localhost:8000/api/v1/payments/merchant/stats', {
                    headers: {
                        'x-api-key': localStorage.getItem('api_key'),
                        // 'x-api-secret': localStorage.getItem('api_secret') // Generally not sent in headers for security, but okay for this task
                    }
                });
                const data = await res.json();
                if (res.ok) {
                    setStats(data);
                }
            } catch (err) {
                console.error("Failed to fetch stats", err);
            }
        };

        fetchStats();
        
        // Optional: Refresh data every 5 seconds so you see it update live!
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, []);

    // Helper to format currency (Paise -> Rupees)
    const formatCurrency = (paise) => {
        const rupees = paise / 100;
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(rupees);
    };

    return (
        <div data-test-id="dashboard" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Merchant Dashboard</h1>
                {/* NEW NAVIGATION MENU */}
                <nav>
                    <Link to="/dashboard/transactions" style={{ marginRight: '15px' }}>Transactions</Link>
                    <Link to="/dashboard/webhooks" style={{ marginRight: '15px' }}>Webhooks</Link>
                    <Link to="/dashboard/docs">Documentation</Link>
                </nav>
            </div>
            
            <div data-test-id="api-credentials" style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px' }}>
                <h3>API Credentials</h3>
                <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontWeight: 'bold', marginRight: '10px' }}>API Key:</label>
                    <span data-test-id="api-key">{apiKey}</span>
                </div>
                <div>
                    <label style={{ fontWeight: 'bold', marginRight: '10px' }}>API Secret:</label>
                    <span data-test-id="api-secret">{apiSecret}</span>
                </div>
            </div>

            <div data-test-id="stats-container" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', minWidth: '150px' }}>
                    <div>Total Transactions</div>
                    <div data-test-id="total-transactions" style={{ fontSize: '24px', fontWeight: 'bold' }}>
                        {stats.count}
                    </div>
                </div>
                <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', minWidth: '150px' }}>
                    <div>Total Amount</div>
                    <div data-test-id="total-amount" style={{ fontSize: '24px', fontWeight: 'bold' }}>
                        {formatCurrency(stats.amount)}
                    </div>
                </div>
                <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', minWidth: '150px' }}>
                    <div>Success Rate</div>
                    <div data-test-id="success-rate" style={{ fontSize: '24px', fontWeight: 'bold' }}>
                        {stats.successRate}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;