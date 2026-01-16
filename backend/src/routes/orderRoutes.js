const express = require('express');
const router = express.Router();
const { createOrder, getOrder, getPublicOrder } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

// Authenticated Routes (For Merchant)
router.post('/', protect, createOrder);
router.get('/:order_id', protect, getOrder);

// Public Routes (For Checkout Page)
router.get('/:order_id/public', getPublicOrder);

module.exports = router;