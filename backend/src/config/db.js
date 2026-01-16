const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Test connection
pool.on('connect', () => {
    console.log('Database connected successfully');
});

module.exports = pool;