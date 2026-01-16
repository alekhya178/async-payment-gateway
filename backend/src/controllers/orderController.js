const pool = require('../config/db');
const { generateId } = require('../services/paymentService');

const createOrder = async (req, res) => {
    const { amount, currency = "INR", receipt, notes } = req.body;
    
    if (!Number.isInteger(amount) || amount < 100) {
        return res.status(400).json({ error: { code: "BAD_REQUEST_ERROR", description: "amount must be at least 100" } });
    }
    
    const orderId = generateId("order_");
    try {
        await pool.query(
            'INSERT INTO orders (id, merchant_id, amount, currency, receipt, notes, status) VALUES ($1, $2, $3, $4, $5, $6, $7)', 
            [orderId, req.merchant.id, amount, currency, receipt, notes || {}, 'created']
        );
        
        res.status(201).json({ 
            id: orderId, 
            merchant_id: req.merchant.id, 
            amount, 
            currency, 
            receipt, 
            notes: notes || {}, 
            status: "created", 
            created_at: new Date().toISOString() 
        });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "Server Error" }); 
    }
};

const getOrder = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders WHERE id = $1 AND merchant_id = $2', [req.params.order_id, req.merchant.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: { code: "NOT_FOUND_ERROR", description: "Order not found" } });
        res.json(result.rows[0]);
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "Server Error" }); 
    }
};

const getPublicOrder = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, amount, currency, status, merchant_id FROM orders WHERE id = $1', [req.params.order_id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Order not found" });
        res.json(result.rows[0]);
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "Server Error" }); 
    }
};

module.exports = { createOrder, getOrder, getPublicOrder };