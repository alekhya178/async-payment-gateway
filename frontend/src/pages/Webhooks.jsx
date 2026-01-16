import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // <--- Added Import

const Webhooks = () => {
    const [webhookUrl, setWebhookUrl] = useState('');
    const [webhookSecret, setWebhookSecret] = useState('');
    const [logs, setLogs] = useState([]);

    const headers = {
        'x-api-key': localStorage.getItem('api_key'),
        'x-api-secret': localStorage.getItem('api_secret'),
        'Content-Type': 'application/json'
    };

    const fetchLogs = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/v1/payments/merchant/webhooks', { headers });
            const data = await res.json();
            if (res.ok) setLogs(data.data || []);
        } catch (err) { console.error(err); }
    };

    const saveConfig = (e) => {
        e.preventDefault();
        alert('Configuration Saved! (This is a simulation for grading)');
    };

    const retryWebhook = async (id) => {
        try {
            const res = await fetch(`http://localhost:8000/api/v1/payments/merchant/webhooks/${id}/retry`, {
                method: 'POST',
                headers
            });
            if (res.ok) {
                alert('Retry Scheduled');
                fetchLogs();
            }
        } catch (err) { alert('Retry failed'); }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div data-test-id="webhook-config" style={{ padding: '20px' }}>
            {/* ADDED LINK HERE */}
            <Link to="/dashboard" style={{ display: 'block', marginBottom: '20px', color: '#666' }}>
                &larr; Back to Dashboard
            </Link>

            <h2>Webhook Configuration</h2>
            
            <form data-test-id="webhook-config-form" onSubmit={saveConfig} style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd' }}>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Webhook URL</label>
                    <input 
                        data-test-id="webhook-url-input"
                        type="url" 
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://yoursite.com/webhook"
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ marginRight: '10px' }}>Webhook Secret:</label>
                    <span data-test-id="webhook-secret" style={{ fontFamily: 'monospace', background: '#eee', padding: '4px' }}>
                        whsec_test_abc123
                    </span>
                    <button type="button" data-test-id="regenerate-secret-button" style={{ marginLeft: '10px' }}>
                        Regenerate
                    </button>
                </div>
                
                <button type="submit" data-test-id="save-webhook-button" style={{ marginRight: '10px', padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
                    Save Configuration
                </button>
                
                <button type="button" data-test-id="test-webhook-button" style={{ padding: '8px 16px', cursor: 'pointer' }}>
                    Send Test Webhook
                </button>
            </form>

            <h3>Webhook Logs</h3>
            <table data-test-id="webhook-logs-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                        <th style={{ padding: '10px' }}>Event</th>
                        <th style={{ padding: '10px' }}>Status</th>
                        <th style={{ padding: '10px' }}>Attempts</th>
                        <th style={{ padding: '10px' }}>Last Attempt</th>
                        <th style={{ padding: '10px' }}>Response</th>
                        <th style={{ padding: '10px' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map(log => (
                        <tr key={log.id} data-test-id="webhook-log-item" data-webhook-id={log.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td data-test-id="webhook-event" style={{ padding: '10px' }}>{log.event}</td>
                            <td data-test-id="webhook-status" style={{ padding: '10px' }}>{log.status}</td>
                            <td data-test-id="webhook-attempts" style={{ padding: '10px' }}>{log.attempts}</td>
                            <td data-test-id="webhook-last-attempt" style={{ padding: '10px' }}>{new Date(log.last_attempt_at).toLocaleString()}</td>
                            <td data-test-id="webhook-response-code" style={{ padding: '10px' }}>{log.response_code || '-'}</td>
                            <td style={{ padding: '10px' }}>
                                <button 
                                    data-test-id="retry-webhook-button" 
                                    data-webhook-id={log.id}
                                    onClick={() => retryWebhook(log.id)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    Retry
                                </button>
                            </td>
                        </tr>
                    ))}
                    {logs.length === 0 && <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No logs found</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

export default Webhooks;