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
    getJobStatus
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');


//  added 'protect' because the we need authentication for payments
router.post('/', protect, processPayment); 

router.get('/:payment_id', getPayment);

// Merchant Protected Routes
router.get('/merchant/stats', protect, getDashboardStats);
router.get('/merchant/transactions', protect, getTransactions);
router.get('/merchant/webhooks', protect, getWebhookLogs);
router.post('/merchant/webhooks/:webhook_id/retry', protect, retryWebhook);

// Payment Operations
router.post('/:payment_id/capture', protect, capturePayment);
router.post('/:payment_id/refunds', protect, createRefund);
router.get('/merchant/refunds/:refund_id', protect, getRefund);

// Testing Route
router.get('/test/jobs/status', getJobStatus);

module.exports = router;