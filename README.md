# Production-Ready Async Payment Gateway

A high-performance payment infrastructure featuring asynchronous processing, resilient webhook delivery with exponential backoff, and an embeddable JavaScript SDK.

## Key Features
* Asynchronous Architecture: Offloads heavy processing to a Redis-based job queue.
* Resilient Webhooks: Automatic retries using exponential backoff.
* Embeddable SDK: Drop-in JavaScript widget for seamless merchant integration.

## Quick Start

1. Start Services:
   docker-compose up -d --build

2. Access Interfaces:
   * API: http://localhost:8000
   * Dashboard: http://localhost:3000
   * Demo Shop: http://localhost:3001/merchant_demo.html
   * SDK File: http://localhost:3001/checkout.js

## API Documentation

### Core Endpoints
* POST /api/v1/payments : Create a payment (Returns pending)
* POST /api/v1/payments/:id/capture : Captures a successful payment
* POST /api/v1/payments/:id/refunds : Initiates an async refund
* GET /api/v1/payments/test/jobs/status : Returns Redis queue health stats

### Webhooks
* GET /api/v1/merchant/webhooks : List delivery logs
* POST /api/v1/merchant/webhooks/:id/retry : Manually retry a failed webhook

## SDK Integration Guide

Merchants can integrate the gateway by including the script:
```bash
<script src="http://localhost:3001/checkout.js"></script>

<script>
  const gateway = new PaymentGateway({
    key: 'pk_test_12345',
    orderId: 'ord_98765',
    onSuccess: (data) => console.log('Success:', data),
    onFailure: (error) => console.error('Failed:', error)
  });

  // Open the modal
  gateway.open();
</script>
```