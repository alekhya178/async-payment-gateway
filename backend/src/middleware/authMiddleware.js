const pool = require('../config/db');

const protect = async (req, res, next) => {
    let apiKey;

    if (req.headers['x-api-key']) {
        apiKey = req.headers['x-api-key'];
    }

    if (!apiKey) {
        return res.status(401).json({ error: "Not authorized, no API key" });
    }

    try {
        const result = await pool.query('SELECT * FROM merchants WHERE api_key = $1', [apiKey]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Not authorized, invalid API key" });
        }

        req.merchant = result.rows[0];
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ error: "Not authorized, token failed" });
    }
};

module.exports = { protect };