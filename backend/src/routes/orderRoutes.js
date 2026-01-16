const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateMerchant } = require('../middleware/authMiddleware');

// Authenticated Routes (For Merchant)
router.post('/', authenticateMerchant, orderController.createOrder);
router.get('/:order_id', authenticateMerchant, orderController.getOrder);

// Public Routes (For Checkout Page)
router.get('/:order_id/public', orderController.getPublicOrder);

module.exports = router;