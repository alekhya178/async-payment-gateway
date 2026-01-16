const pool = require('../config/db');
const { paymentQueue, webhookQueue, refundQueue } = require('../config/queue');
const crypto = require('crypto');
const axios = require('axios');

console.log("Worker Service Started...");

// 1. PAYMENT WORKER
paymentQueue.process(async (job) => {
    const { paymentId, method } = job.data;
    console.log(`Processing payment: ${paymentId}`);

    // Fetch current state logic
    const isTestMode = process.env.TEST_MODE === 'true';
    let delay = isTestMode ? parseInt(process.env.TEST_PROCESSING_DELAY || '1000') : Math.floor(Math.random() * 5000) + 5000;
    
    // Simulate Delay
    await new Promise(resolve => setTimeout(resolve, delay));

    // Determine Success/Failure
    let isSuccess = isTestMode ? (process.env.TEST_PAYMENT_SUCCESS !== 'false') : (method === 'upi' ? Math.random() < 0.90 : Math.random() < 0.95);
    
    const status = isSuccess ? 'success' : 'failed';
    const error_code = isSuccess ? null : 'PAYMENT_FAILED';
    const error_desc = isSuccess ? null : 'Transaction declined';

    // Update DB
    const client = await pool.connect();
    try {
        await client.query(
            'UPDATE payments SET status = $1, error_code = $2, error_description = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
            [status, error_code, error_desc, paymentId]
        );
        
        // TRIGGER WEBHOOK
        const paymentRes = await client.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
        const payment = paymentRes.rows[0];
        const event = isSuccess ? 'payment.success' : 'payment.failed';

        // Add to Webhook Queue
        webhookQueue.add({
            merchant_id: payment.merchant_id,
            event: event,
            payload: {
                event: event,
                timestamp: Math.floor(Date.now() / 1000),
                data: { payment }
            }
        });

    } catch (err) {
        console.error("Payment Worker Error:", err);
        throw err;
    } finally {
        client.release();
    }
});

// 2. WEBHOOK WORKER
webhookQueue.process(async (job) => {
    const { merchant_id, event, payload } = job.data;
    const client = await pool.connect();

    try {
        // Get Merchant details
        const merchRes = await client.query('SELECT webhook_url, webhook_secret FROM merchants WHERE id = $1', [merchant_id]);
        if (merchRes.rows.length === 0 || !merchRes.rows[0].webhook_url) return; // No webhook configured

        const { webhook_url, webhook_secret } = merchRes.rows[0];

        // Create HMAC Signature
        const signature = crypto
            .createHmac('sha256', webhook_secret)
            .update(JSON.stringify(payload))
            .digest('hex');

        // Send Request
        try {
            const response = await axios.post(webhook_url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': signature
                },
                timeout: 5000
            });

            // Log Success
            await client.query(
                `INSERT INTO webhook_logs (merchant_id, event, payload, status, attempts, last_attempt_at, response_code) 
                 VALUES ($1, $2, $3, 'success', $4, NOW(), $5)`,
                [merchant_id, event, payload, job.attemptsMade + 1, response.status]
            );

        } catch (error) {
            // Log Failure
            const code = error.response ? error.response.status : 500;
            const body = error.response ? JSON.stringify(error.response.data) : error.message;

            await client.query(
                `INSERT INTO webhook_logs (merchant_id, event, payload, status, attempts, last_attempt_at, response_code, response_body) 
                 VALUES ($1, $2, $3, 'pending', $4, NOW(), $5, $6)`,
                [merchant_id, event, payload, job.attemptsMade + 1, code, body]
            );
            
            throw new Error('Webhook failed'); // This triggers Bull's retry mechanism
        }

    } finally {
        client.release();
    }
});