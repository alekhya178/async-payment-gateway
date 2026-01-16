// A simple script to create an order
async function createOrder() {
    console.log("Creating Order...");
    
    try {
        const response = await fetch('http://localhost:8000/api/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'key_test_abc123',
                'x-api-secret': 'secret_test_xyz789'
            },
            body: JSON.stringify({
                amount: 50000, // ₹500.00
                currency: "INR",
                receipt: "receipt_1"
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log("\nSUCCESS! Order Created.");
            console.log("Order ID:", data.id);
            console.log("\nCLICK THIS LINK TO TEST CHECKOUT:");
            console.log(`http://localhost:3001/checkout?order_id=${data.id}`);
        } else {
            console.log("Error:", data);
        }
    } catch (error) {
        console.log("Failed to connect to API. Is Docker running?", error.message);
    }
}

createOrder();