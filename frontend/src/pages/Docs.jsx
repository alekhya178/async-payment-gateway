import React from 'react';

const Docs = () => {
  return (
    <div data-test-id="api-docs" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Integration Guide</h2>
      
      <section data-test-id="section-create-order" style={{ marginBottom: '30px' }}>
        <h3>1. Create Order</h3>
        <p>Call the API to create an order from your backend.</p>
        <pre data-test-id="code-snippet-create-order" style={{ background: '#f4f4f4', padding: '15px', overflowX: 'auto' }}>
{`curl -X POST http://localhost:8000/api/v1/orders \\
  -H "X-Api-Key: key_test_abc123" \\
  -H "X-Api-Secret: secret_test_xyz789" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 50000,
    "currency": "INR",
    "receipt": "receipt_123"
  }'`}
        </pre>
      </section>
      
      <section data-test-id="section-sdk-integration" style={{ marginBottom: '30px' }}>
        <h3>2. SDK Integration</h3>
        <p>Add this code to your frontend to open the checkout modal.</p>
        <pre data-test-id="code-snippet-sdk" style={{ background: '#f4f4f4', padding: '15px', overflowX: 'auto' }}>
{`<script src="http://localhost:3001/checkout.js"></script>
<script>
const checkout = new PaymentGateway({
  key: 'key_test_abc123',
  orderId: 'order_xyz',
  onSuccess: (response) => {
    console.log('Payment ID:', response.paymentId);
  }
});
checkout.open();
</script>`}
        </pre>
      </section>
      
      <section data-test-id="section-webhook-verification" style={{ marginBottom: '30px' }}>
        <h3>3. Verify Webhook Signature</h3>
        <p>Secure your webhooks by verifying the HMAC signature.</p>
        <pre data-test-id="code-snippet-webhook" style={{ background: '#f4f4f4', padding: '15px', overflowX: 'auto' }}>
{`const crypto = require('crypto');
function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
    
  return signature === expectedSignature;
}`}
        </pre>
      </section>
    </div>
  );
};

export default Docs;