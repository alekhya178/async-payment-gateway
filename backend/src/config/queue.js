const Queue = require('bull');

const redisConfig = {
    redis: {
        host: 'redis',
        port: 6379
    }
};

// Queue for processing payments
const paymentQueue = new Queue('payment-processing', redisConfig);

// Queue for delivering webhooks
const webhookQueue = new Queue('webhook-delivery', redisConfig);

// Queue for refunds
const refundQueue = new Queue('refund-processing', redisConfig);

module.exports = { paymentQueue, webhookQueue, refundQueue };