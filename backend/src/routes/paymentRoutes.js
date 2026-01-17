const express = require('express');
const router = express.Router();
const { 
    processPayment, 
    getPayment, 
    getDashboardStats, 
    getTransactions,
    capturePayment,
    createRefund,
    getRefund,
    getWebhookLogs,
    retryWebhook,
    getJobStatus,
    sendTestWebhook
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');


// --- PUBLIC ROUTES ---

// 1. Create Payment
router.post('/', protect, processPayment); 

// 2. Get Payment Details
router.get('/:payment_id', getPayment);

// 3. Job Status (Public Test Endpoint)
// Note: Since this file is mounted at '/api/v1/payments', 
// this route becomes: /api/v1/payments/test/jobs/status
router.get('/test/jobs/status', getJobStatus);


// --- MERCHANT PROTECTED ROUTES ---

router.get('/merchant/stats', protect, getDashboardStats);
router.get('/merchant/transactions', protect, getTransactions);
router.get('/merchant/webhooks', protect, getWebhookLogs);
router.post('/merchant/webhooks/:webhook_id/retry', protect, retryWebhook);
router.post('/merchant/webhooks/test', protect, sendTestWebhook);

// Payment Operations
router.post('/:payment_id/capture', protect, capturePayment);
router.post('/:payment_id/refunds', protect, createRefund);
router.get('/merchant/refunds/:refund_id', protect, getRefund);

module.exports = router;