const pool = require('../config/db');
const { validateLuhn, getCardNetwork, validateVPA, generateId } = require('../services/paymentService');
const { paymentQueue, refundQueue, webhookQueue } = require('../config/queue');

// 1. CREATE PAYMENT (Async + Idempotency + Crash Proof + Expiry Check)
const processPayment = async (req, res) => {
    try {
        const { order_id, method, vpa, card } = req.body;
        
        // --- 1. Validate Merchant (Safety Check) ---
        if (!req.merchant || !req.merchant.id) {
            return res.status(401).json({ error: { code: "AUTH_ERROR", description: "Not authorized or Invalid API Key" } });
        }

        // --- 2. Idempotency Check ---
        const idempotencyKey = req.headers['idempotency-key'];
        if (idempotencyKey) {
            const cached = await pool.query(
                'SELECT response FROM idempotency_keys WHERE key = $1 AND merchant_id = $2 AND expires_at > NOW()',
                [idempotencyKey, req.merchant.id]
            );
            if (cached.rows.length > 0) {
                return res.status(201).json(cached.rows[0].response);
            }
        }

        // --- 3. Validate Order ---
        const orderRes = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id]);
        if (orderRes.rows.length === 0) return res.status(400).json({ error: { code: "BAD_REQUEST_ERROR", description: "Invalid Order" } });
        const order = orderRes.rows[0];

        if (req.merchant.id !== order.merchant_id) {
            return res.status(400).json({ error: { code: "BAD_REQUEST_ERROR", description: "Order does not belong to merchant" } });
        }

        // --- 4. Prepare Payment Data ---
        let paymentData = { 
            id: generateId("pay_"), 
            order_id, 
            merchant_id: order.merchant_id, 
            amount: order.amount, 
            currency: order.currency, 
            method, 
            status: 'pending', 
            created_at: new Date().toISOString() 
        };
        
        // --- 5. Validate Method Details ---
        if (method === 'upi') {
            if (!vpa || !validateVPA(vpa)) return res.status(400).json({ error: { code: "INVALID_VPA", description: "VPA format invalid" } });
            paymentData.vpa = vpa;
        } else if (method === 'card') {
            if (!card || !validateLuhn(card.number)) return res.status(400).json({ error: { code: "INVALID_CARD", description: "Card validation failed" } });
            
            // --- NEW: EXPIRY DATE CHECK START ---
            const currentYear = new Date().getFullYear(); // e.g. 2026
            const currentMonth = new Date().getMonth() + 1; // e.g. 1 (January)
            
            // Handle 2-digit years (e.g., "21" -> 2021)
            let expYear = parseInt(card.expiry_year);
            if (expYear < 100) expYear += 2000; 

            const expMonth = parseInt(card.expiry_month);

            // Logic: If Exp Year is less than Current Year OR (Years are same AND Exp Month is less than Current Month)
            if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
                return res.status(400).json({ error: { code: "INVALID_CARD", description: "Card has expired" } });
            }
            // --- NEW: EXPIRY DATE CHECK END ---

            paymentData.card_network = getCardNetwork(card.number);
            paymentData.card_last4 = card.number.slice(-4);
        } else {
            return res.status(400).json({ error: { code: "BAD_REQUEST_ERROR", description: "Invalid method" } });
        }

        // --- 6. Insert into DB ---
        await pool.query(
            'INSERT INTO payments (id, order_id, merchant_id, amount, currency, method, status, vpa, card_network, card_last4) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
            [paymentData.id, paymentData.order_id, paymentData.merchant_id, paymentData.amount, paymentData.currency, paymentData.method, paymentData.status, paymentData.vpa, paymentData.card_network, paymentData.card_last4]
        );

        // --- 7. Add to Queue (Async) ---
        await paymentQueue.add({
            paymentId: paymentData.id,
            method: paymentData.method
        });

        // --- 8. Save Idempotency Key ---
        if (idempotencyKey) {
            await pool.query(
                "INSERT INTO idempotency_keys (key, merchant_id, response, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours')",
                [idempotencyKey, req.merchant.id, paymentData]
            );
        }

        // --- Return Immediately ---
        res.status(201).json(paymentData);

    } catch (err) { 
        console.error("Payment Processing Error:", err);
        res.status(500).json({ error: "Server Error", details: err.message }); 
    }
};

// 2. CAPTURE PAYMENT
const capturePayment = async (req, res) => {
    try {
        const { payment_id } = req.params;
        const result = await pool.query('UPDATE payments SET captured = TRUE, updated_at = NOW() WHERE id = $1 AND merchant_id = $2 RETURNING *', [payment_id, req.merchant.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Payment not found" });
        res.json({ ...result.rows[0], captured: true });
    } catch (err) { res.status(500).json({ error: "Server Error" }); }
};

// 3. CREATE REFUND
const createRefund = async (req, res) => {
    const { payment_id } = req.params;
    const { amount, reason } = req.body;
    try {
        const payRes = await pool.query('SELECT * FROM payments WHERE id = $1 AND merchant_id = $2', [payment_id, req.merchant.id]);
        if (payRes.rows.length === 0) return res.status(404).json({ error: "Payment not found" });
        const payment = payRes.rows[0];
        if (payment.status !== 'success') return res.status(400).json({ error: { code: "BAD_REQUEST_ERROR", description: "Payment not in capturable state" } });
        
        const refundRes = await pool.query("SELECT SUM(amount) as total FROM refunds WHERE payment_id = $1", [payment_id]);
        const totalRefunded = parseInt(refundRes.rows[0].total || '0');
        if (amount > (payment.amount - totalRefunded)) return res.status(400).json({ error: { code: "BAD_REQUEST_ERROR", description: "Refund amount exceeds available amount" } });

        const refundId = generateId("rfnd_");
        const refundData = { id: refundId, payment_id, merchant_id: req.merchant.id, amount, reason, status: 'pending', created_at: new Date().toISOString() };
        await pool.query('INSERT INTO refunds (id, payment_id, merchant_id, amount, reason, status) VALUES ($1, $2, $3, $4, $5, $6)', [refundId, payment_id, req.merchant.id, amount, reason, 'pending']);
        await refundQueue.add({ refundId });
        res.status(201).json(refundData);
    } catch (err) { console.error(err); res.status(500).json({ error: "Server Error" }); }
};

// 4. GET REFUND
const getRefund = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM refunds WHERE id = $1 AND merchant_id = $2', [req.params.refund_id, req.merchant.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: "Error" }); }
};

// 5. GET PAYMENT
const getPayment = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM payments WHERE id = $1', [req.params.payment_id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: "Error" }); }
};

// 6. DASHBOARD STATS
const getDashboardStats = async (req, res) => {
    try {
        const merchantId = req.merchant.id;
        const countResult = await pool.query('SELECT COUNT(*) FROM payments WHERE merchant_id = $1', [merchantId]);
        const amountResult = await pool.query("SELECT SUM(amount) FROM payments WHERE merchant_id = $1 AND status = 'success'", [merchantId]);
        const successCountResult = await pool.query("SELECT COUNT(*) FROM payments WHERE merchant_id = $1 AND status = 'success'", [merchantId]);
        const totalTransactions = parseInt(countResult.rows[0].count);
        const totalAmount = parseInt(amountResult.rows[0].sum || '0');
        const successCount = parseInt(successCountResult.rows[0].count);
        const successRate = totalTransactions === 0 ? 0 : Math.round((successCount / totalTransactions) * 100);
        res.json({ count: totalTransactions, amount: totalAmount, successRate: successRate + "%" });
    } catch (err) { console.error(err); res.status(500).json({ error: "Server Error" }); }
};

// 7. GET TRANSACTIONS
const getTransactions = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM payments WHERE merchant_id = $1 ORDER BY created_at DESC', [req.merchant.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Server Error" }); }
};

// 8. LIST WEBHOOK LOGS
const getWebhookLogs = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM webhook_logs WHERE merchant_id = $1 ORDER BY created_at DESC LIMIT 50', [req.merchant.id]);
        res.json({ data: result.rows });
    } catch (err) { res.status(500).json({ error: "Server Error" }); }
};

// 9. RETRY WEBHOOK
const retryWebhook = async (req, res) => {
    try {
        const { webhook_id } = req.params;
        const result = await pool.query("UPDATE webhook_logs SET status = 'pending', attempts = 0, next_retry_at = NULL WHERE id = $1 AND merchant_id = $2 RETURNING *", [webhook_id, req.merchant.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Webhook log not found" });
        const log = result.rows[0];
        await webhookQueue.add({ merchant_id: log.merchant_id, event: log.event, payload: log.payload });
        res.json({ id: log.id, status: "pending", message: "Retry scheduled" });
    } catch (err) { res.status(500).json({ error: "Server Error" }); }
};

// 10. JOB STATUS
const getJobStatus = async (req, res) => {
    try {
        const counts = await paymentQueue.getJobCounts();
        
        // Flatten the object to match the requirements exactly
        res.status(200).json({
            pending: counts.waiting,
            processing: counts.active,
            completed: counts.completed,
            failed: counts.failed,
            worker_status: 'running'
        });
    } catch (err) { 
        console.error("Job Status Error:", err);
        res.status(500).json({ error: "Server Error" }); 
    }
};
//11. test webhook
const sendTestWebhook = async (req, res) => {
    try {
        const merchant_id = req.user.id; // User is authenticated
        const client = await pool.connect();
        
        try {
            // 1. Get the Merchant's URL
            const result = await client.query('SELECT webhook_url FROM merchants WHERE id = $1', [merchant_id]);
            const webhookUrl = result.rows[0]?.webhook_url;

            if (!webhookUrl) {
                return res.status(400).json({ error: "No Webhook URL configured" });
            }

            // 2. Add a Dummy Job to the Queue
            const payload = {
                event: 'payment.success',
                timestamp: Math.floor(Date.now() / 1000),
                data: { 
                    payment: { id: "pay_test_" + Date.now(), amount: 500, status: "success" } 
                }
            };

            await webhookQueue.add({
                merchant_id,
                event: 'payment.success',
                payload
            });

            res.status(200).json({ message: "Test Webhook Queued" });

        } finally {
            client.release();
        }
    } catch (err) {
        console.error("Test Webhook Error:", err);
        res.status(500).json({ error: "Server Error" });
    }
};

module.exports = { 
    processPayment, capturePayment, createRefund, getRefund, getPayment, 
    getDashboardStats, getTransactions, getWebhookLogs, retryWebhook, getJobStatus ,sendTestWebhook
};