const { paymentQueue, refundQueue, webhookQueue } = require('../config/queue');
const pool = require('../config/db');
const axios = require('axios');

console.log("Worker Service Running...");

// 1. PAYMENT WORKER
paymentQueue.process(async (job) => {
    const { paymentId, method } = job.data;
    console.log(`Processing payment: ${paymentId}`);
    
    const client = await pool.connect();
    try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Short delay

        // Update Payment to Success
        await client.query(
            "UPDATE payments SET status = 'success', updated_at = NOW() WHERE id = $1",
            [paymentId]
        );

        const res = await client.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
        const payment = res.rows[0];

        // --- FIX IS HERE: DEFINING RETRY OPTIONS ---
        const isTestMode = process.env.WEBHOOK_RETRY_INTERVALS_TEST === 'true';
        const retryOptions = {
            attempts: 5,
            backoff: {
                type: 'exponential',
                delay: isTestMode ? 2000 : 60000 // 2 seconds (Test) vs 1 minute (Prod)
            }
        };

        // Trigger Webhook Job WITH OPTIONS
        webhookQueue.add({
            merchant_id: payment.merchant_id,
            event: 'payment.success',
            payload: {
                event: 'payment.success',
                timestamp: Math.floor(Date.now() / 1000),
                data: { payment }
            }
        }, retryOptions); // <--- PASSING THE OPTIONS HERE

    } catch (err) {
        console.error("Payment Worker Error:", err);
        await client.query("UPDATE payments SET status = 'failed' WHERE id = $1", [paymentId]);
    } finally {
        client.release();
    }
});

// 2. REFUND WORKER
refundQueue.process(async (job) => {
    const { refundId } = job.data;
    const client = await pool.connect();
    try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await client.query("UPDATE refunds SET status = 'processed', processed_at = NOW() WHERE id = $1", [refundId]);
        
        const res = await client.query('SELECT * FROM refunds WHERE id = $1', [refundId]);
        const refund = res.rows[0];

        // Add webhook for refund too
        webhookQueue.add({
            merchant_id: refund.merchant_id,
            event: 'refund.processed',
            payload: {
                event: 'refund.processed',
                timestamp: Math.floor(Date.now() / 1000),
                data: { refund }
            }
        }, { attempts: 5, backoff: { type: 'exponential', delay: 2000 } });

    } catch (err) {
        console.error("Refund Error:", err);
    } finally {
        client.release();
    }
});

// 3. WEBHOOK WORKER
webhookQueue.process(async (job) => {
    const { merchant_id, event, payload } = job.data;
    const client = await pool.connect();

    try {
        const merchRes = await client.query('SELECT webhook_url FROM merchants WHERE id = $1', [merchant_id]);
        const webhookUrl = merchRes.rows[0]?.webhook_url;

        if (!webhookUrl) {
            console.log(`No URL for merchant ${merchant_id}. Skipping.`);
            return;
        }

        console.log(`Attempting Webhook to: ${webhookUrl} (Attempt ${job.attemptsMade + 1})`);

        await axios.post(webhookUrl, payload, { timeout: 5000 });

        await client.query(
            `INSERT INTO webhook_logs (merchant_id, event, payload, status, response_code, created_at, last_attempt_at) VALUES ($1, $2, $3, 'success', $4, NOW(), NOW())`,
            [merchant_id, event, payload, 200]
        );
        console.log(`Webhook Sent!`);

    } catch (err) {
        console.error(`Webhook Failed: ${err.message}`);
        
        const responseCode = err.response ? err.response.status : 500;
        await client.query(
            `INSERT INTO webhook_logs (merchant_id, event, payload, status, response_code, created_at, last_attempt_at) VALUES ($1, $2, $3, 'pending', $4, NOW(), NOW())`,
            [merchant_id, event, payload, responseCode]
        );

        // THROW ERROR TO TRIGGER RETRY
        throw new Error("Webhook delivery failed"); 
    } finally {
        client.release();
    }
});