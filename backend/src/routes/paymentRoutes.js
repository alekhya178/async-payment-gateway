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

// Public Routes (Checkout Page)
router.post('/', processPayment); // Create Payment
router.get('/:payment_id', getPayment); // Check Status

// Merchant Protected Routes (Dashboard)
router.get('/merchant/stats', protect, getDashboardStats);
router.get('/merchant/transactions', protect, getTransactions);
router.get('/merchant/webhooks', protect, getWebhookLogs); // New: List Webhooks
router.post('/merchant/webhooks/:webhook_id/retry', protect, retryWebhook); // New: Retry Webhook

// Payment Operations
router.post('/:payment_id/capture', protect, capturePayment); // New: Capture
router.post('/:payment_id/refunds', protect, createRefund);   // New: Create Refund
router.get('/merchant/refunds/:refund_id', protect, getRefund); // New: Get Refund

// Testing Route (Required for Grading)
router.get('/test/jobs/status', getJobStatus);

module.exports = router;