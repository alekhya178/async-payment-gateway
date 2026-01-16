# Database Schema Documentation

The application uses PostgreSQL with the following relational schema.

## 1. Merchants Table
Stores merchant credentials and profile information.
* **Primary Key:** `id` (UUID)

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Yes | Unique Merchant ID (Auto-generated) |
| `name` | VARCHAR(255) | Yes | Name of the merchant |
| `email` | VARCHAR(255) | Yes | Unique email address |
| `api_key` | VARCHAR(64) | Yes | Public key for API authentication |
| `api_secret` | VARCHAR(64) | Yes | Secret key for API authentication |
| `is_active` | BOOLEAN | Yes | Defaults to `true` |
| `created_at` | TIMESTAMP | Yes | Creation time |

## 2. Orders Table
Represents a payment request created by a merchant.
* **Primary Key:** `id` (String: "order_" + 16 chars)
* **Foreign Key:** `merchant_id` references `Merchants(id)`

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(64) | Yes | Unique Order ID |
| `merchant_id` | UUID | Yes | **FK** to Merchants table |
| `amount` | INTEGER | Yes | Amount in paise (Min 100) |
| `currency` | VARCHAR(3) | Yes | Currency Code (Default: INR) |
| `status` | VARCHAR(20) | Yes | `created`, `paid` |
| `receipt` | VARCHAR(255) | No | Optional merchant receipt ID |
| `notes` | JSONB | No | Metadata key-value pairs |

## 3. Payments Table
Represents a transaction attempt against an order.
* **Primary Key:** `id` (String: "pay_" + 16 chars)
* **Foreign Keys:** * `merchant_id` references `Merchants(id)`
    * `order_id` references `Orders(id)`

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(64) | Yes | Unique Payment ID |
| `order_id` | VARCHAR(64) | Yes | **FK** to Orders table |
| `merchant_id` | UUID | Yes | **FK** to Merchants table |
| `amount` | INTEGER | Yes | Transaction amount in paise |
| `method` | VARCHAR(20) | Yes | `upi` or `card` |
| `status` | VARCHAR(20) | Yes | `processing`, `success`, `failed` |
| `vpa` | VARCHAR(255) | No | UPI ID (Only for UPI method) |
| `card_network`| VARCHAR(20) | No | `visa`, `mastercard`, etc. |
| `card_last4` | VARCHAR(4) | No | Last 4 digits of card |
| `error_code` | VARCHAR(50) | No | Error code if failed |
| `error_desc` | TEXT | No | Detailed error message |

## Relationships
* **One Merchant** has **Many Orders**.
* **One Order** can have **Many Payments** (retries), but usually one successful payment.