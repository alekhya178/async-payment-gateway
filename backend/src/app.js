const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);

// Health Check
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.status(200).json({ status: "healthy", database: "connected", timestamp: new Date().toISOString() });
    } catch (err) {
        res.status(200).json({ status: "healthy", database: "disconnected" });
    }
});

// Test Merchant Endpoint
app.get('/api/v1/test/merchant', async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM merchants WHERE email = 'test@example.com'");
        if(r.rows.length) res.json({ ...r.rows[0], seeded: true });
        else res.status(404).json({error: "No test merchant"});
    } catch (err) { res.status(500).json({ error: "Database error" }); }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});