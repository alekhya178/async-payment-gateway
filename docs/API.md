# API Documentation

**Base URL:** `http://localhost:8000`

All protected endpoints require the following headers:
* `X-Api-Key`: Your Merchant API Key
* `X-Api-Secret`: Your Merchant API Secret

## 1. Health Check
Checks if the API and Database are connected.
* **Endpoint:** `GET /health`
* **Auth Required:** No
* **Response:**
    ```json
    {
      "status": "healthy",
      "database": "connected",
      "timestamp": "2026-01-06T10:30:00Z"
    }
    ```

## 2. Create Order
Creates a new payment order.
* **Endpoint:** `POST /api/v1/orders`
* **Auth Required:** Yes
* **Request Body:**
    ```json
    {
      "amount": 50000,
      "currency": "INR",
      "receipt": "receipt_123",
      "notes": { "customer_name": "John Doe" }
    }
    ```
* **Response (201 Created):**
    ```json
    {
      "id": "order_NXhj67fGH2jk9mPq",
      "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
      "amount": 50000,
      "status": "created",
      "created_at": "..."
    }
    ```

## 3. Get Order
Fetch details of a specific order.
* **Endpoint:** `GET /api/v1/orders/:order_id`
* **Auth Required:** Yes
* **Response (200 OK):**
    ```json
    {
      "id": "order_NXhj67fGH2jk9mPq",
      "amount": 50000,
      "status": "created",
      ...
    }
    ```

## 4. Create Payment
Process a payment for an order.
* **Endpoint:** `POST /api/v1/payments`
* **Auth Required:** Yes
* **Request Body (Card Example):**
    ```json
    {
      "order_id": "order_NXhj67fGH2jk9mPq",
      "method": "card",
      "card": {
        "number": "4242424242424242",
        "expiry_month": "12",
        "expiry_year": "2030",
        "cvv": "123",
        "holder_name": "Test User"
      }
    }
    ```
* **Response (201 Created):**
    ```json
    {
      "id": "pay_H8sK3jD9s2L1pQr",
      "order_id": "order_NXhj67fGH2jk9mPq",
      "status": "processing",
      "method": "card",
      "card_network": "visa",
      "card_last4": "2424"
    }
    ```

## 5. Get Payment
Check the status of a payment.
* **Endpoint:** `GET /api/v1/payments/:payment_id`
* **Auth Required:** Yes
* **Response (200 OK):**
    ```json
    {
      "id": "pay_H8sK3jD9s2L1pQr",
      "status": "success",
      "amount": 50000,
      "method": "card"
    }
    ```

## 6. Test Merchant (System)
Used for automated testing to verify seeding.
* **Endpoint:** `GET /api/v1/test/merchant`
* **Auth Required:** No
* **Response:**
    ```json
    {
      "email": "test@example.com",
      "seeded": true,
      "api_key": "key_test_abc123"
    }
    ```

## Error Codes
* `AUTHENTICATION_ERROR`: Invalid or missing API keys.
* `BAD_REQUEST_ERROR`: Invalid input (amount < 100, missing fields).
* `NOT_FOUND_ERROR`: Order or Payment ID not found.
* `INVALID_VPA`: UPI ID format is incorrect.
* `INVALID_CARD` / `EXPIRED_CARD`: Card validation failed.