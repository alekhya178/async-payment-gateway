const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateMerchant } = require('../middleware/authMiddleware');

router.get('/stats', authenticateMerchant, paymentController.getDashboardStats);

router.get('/', authenticateMerchant, paymentController.getTransactions);

// Authenticated Route (Merchant creates payment manually?)
router.post('/', authenticateMerchant, (req, res) => paymentController.processPayment(req, res, false));

// Public Routes (Checkout Page creates payment)
router.post('/public', (req, res) => paymentController.processPayment(req, res, true));

// Polling status (Allowed public for checkout)
router.get('/:payment_id', paymentController.getPayment);

module.exports = router;