const pool = require('../config/db');
const { validateLuhn, getCardNetwork, validateVPA, generateId } = require('../services/paymentService');

const processPayment = async (req, res, isPublic) => {
    const { order_id, method, vpa, card } = req.body;
    
    const orderRes = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id]);
    if (orderRes.rows.length === 0) return res.status(400).json({ error: { code: "BAD_REQUEST_ERROR", description: "Invalid Order" } });
    const order = orderRes.rows[0];

    if (!isPublic && req.merchant.id !== order.merchant_id) {
        return res.status(400).json({ error: { code: "BAD_REQUEST_ERROR", description: "Order does not belong to merchant" } });
    }

    let paymentData = { 
        id: generateId("pay_"), order_id, merchant_id: order.merchant_id, 
        amount: order.amount, currency: order.currency, method, status: 'processing', 
        created_at: new Date().toISOString() 
    };
    
    if (method === 'upi') {
        if (!vpa || !validateVPA(vpa)) return res.status(400).json({ error: { code: "INVALID_VPA", description: "VPA format invalid" } });
        paymentData.vpa = vpa;
    } else if (method === 'card') {
        if (!card || !validateLuhn(card.number)) return res.status(400).json({ error: { code: "INVALID_CARD", description: "Card validation failed" } });
        
        let expYear = parseInt(card.expiry_year);
        if (expYear < 100) expYear += 2000;
        const now = new Date();
        if (expYear < now.getFullYear() || (expYear === now.getFullYear() && parseInt(card.expiry_month) < (now.getMonth() + 1))) {
             return res.status(400).json({ error: { code: "EXPIRED_CARD", description: "Card expired" } });
        }
        paymentData.card_network = getCardNetwork(card.number);
        paymentData.card_last4 = card.number.slice(-4);
    } else {
        return res.status(400).json({ error: { code: "BAD_REQUEST_ERROR", description: "Invalid method" } });
    }

    try {
        await pool.query('INSERT INTO payments (id, order_id, merchant_id, amount, currency, method, status, vpa, card_network, card_last4) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
            [paymentData.id, paymentData.order_id, paymentData.merchant_id, paymentData.amount, paymentData.currency, paymentData.method, paymentData.status, paymentData.vpa, paymentData.card_network, paymentData.card_last4]);

        // TEST MODE LOGIC
        const isTestMode = process.env.TEST_MODE === 'true';
        let delay = isTestMode ? parseInt(process.env.TEST_PROCESSING_DELAY || '1000') : Math.floor(Math.random() * 5000) + 5000;
        let isSuccess = isTestMode ? (process.env.TEST_PAYMENT_SUCCESS !== 'false') : (method === 'upi' ? Math.random() < 0.90 : Math.random() < 0.95);

        setTimeout(async () => {
            const status = isSuccess ? 'success' : 'failed';
            const error_code = isSuccess ? null : 'PAYMENT_FAILED';
            const error_desc = isSuccess ? null : 'Transaction declined';
            await pool.query('UPDATE payments SET status = $1, error_code = $2, error_description = $3, updated_at = NOW() WHERE id = $4', [status, error_code, error_desc, paymentData.id]);
        }, delay); 

        res.status(201).json(paymentData);
    } catch (err) { res.status(500).json({ error: "Server Error" }); }
};

const getPayment = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM payments WHERE id = $1', [req.params.payment_id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: "Error" }); }
};

// ... existing code ...

const getDashboardStats = async (req, res) => {
    try {
        const merchantId = req.merchant.id;

        // 1. Get Total Transactions Count
        const countResult = await pool.query(
            'SELECT COUNT(*) FROM payments WHERE merchant_id = $1', 
            [merchantId]
        );
        const totalTransactions = parseInt(countResult.rows[0].count);

        // 2. Get Total Successful Amount
        const amountResult = await pool.query(
            "SELECT SUM(amount) FROM payments WHERE merchant_id = $1 AND status = 'success'", 
            [merchantId]
        );
        const totalAmount = parseInt(amountResult.rows[0].sum || '0');

        // 3. Get Success Rate
        const successCountResult = await pool.query(
            "SELECT COUNT(*) FROM payments WHERE merchant_id = $1 AND status = 'success'", 
            [merchantId]
        );
        const successCount = parseInt(successCountResult.rows[0].count);
        
        const successRate = totalTransactions === 0 
            ? 0 
            : Math.round((successCount / totalTransactions) * 100);

        res.json({
            count: totalTransactions,
            amount: totalAmount, // Send in paise, frontend will format it
            successRate: successRate + "%"
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
};

const getTransactions = async (req, res) => {
    try {
        // Ask database for the list of payments, newest first
        const result = await pool.query(
            'SELECT * FROM payments WHERE merchant_id = $1 ORDER BY created_at DESC', 
            [req.merchant.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
};

// Update module.exports to include it:
module.exports = { processPayment, getPayment, getDashboardStats, getTransactions };

