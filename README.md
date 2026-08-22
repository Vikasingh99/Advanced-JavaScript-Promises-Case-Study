# Advanced JavaScript Promises Case Study

## E-Commerce Checkout and Order Fulfilment System

---

## 1. Case Study Overview

Build a browser-based **E-Commerce Checkout and Order Fulfilment System** using:

- HTML5
- CSS3
- JavaScript
- JavaScript Promises
- Fetch API
- JSON Server
- REST APIs
- Postman
- Visual Studio Code
- Live Server

The application will simulate a complete checkout workflow beginning with customer information and cart validation and ending with payment, order creation, inventory update, invoice generation, shipping allocation, and notifications.

This document contains:

- Business requirements
- Application workflow
- Implementation steps
- Validation rules
- API requirements
- Failure scenarios
- Testing scenarios
- Acceptance criteria
- Complete starter HTML
- Complete starter CSS

> JavaScript solution code is intentionally not included. Participants must implement the Promise-based workflow.

---

# 2. Business Scenario

An e-commerce company wants to build a checkout application for customers purchasing products online.

A customer should be able to:

1. Review cart items.
2. Enter delivery information.
3. Select a payment method.
4. Apply a coupon.
5. Place an order.
6. Receive progress updates while the order is processed.
7. Receive an order confirmation after successful checkout.

The checkout operation involves multiple asynchronous activities.

Some operations must run sequentially because one operation depends on another.

Other operations can run in parallel because they do not depend on each other.

---

# 3. Main Checkout Workflow

```text
Customer reviews cart
        ↓
Customer enters shipping details
        ↓
Validate customer and cart information
        ↓
Fetch current product information
        ↓
Check inventory for every cart item
        ↓
Validate coupon
        ↓
Calculate subtotal, discount, tax and delivery charge
        ↓
Reserve inventory
        ↓
Process payment
        ↓
Create order
        ↓
Run post-order operations in parallel
        ├── Generate invoice
        ├── Allocate shipping partner
        ├── Send email confirmation
        └── Send SMS confirmation
        ↓
Display final order result
```

---

# 4. Promise Concepts Covered

Participants must use the following concepts:

- Creating Promises with the Promise constructor
- Pending, fulfilled and rejected states
- `resolve()`
- `reject()`
- `.then()`
- `.catch()`
- `.finally()`
- Promise chaining
- Returning Promises from `.then()`
- Throwing errors inside Promise chains
- Error propagation
- Sequential Promise execution
- Parallel Promise execution
- `Promise.all()`
- `Promise.allSettled()`
- `Promise.race()`
- `Promise.any()`
- `async`
- `await`
- `try`
- `catch`
- `finally`
- Fetch API Promises
- HTTP response validation
- Timeout handling

---

# 5. User Roles

## 5.1 Customer

A customer can:

- View cart items
- Change item quantity
- Remove an item
- Enter personal information
- Enter delivery address
- Select payment method
- Apply a coupon
- Place an order
- View checkout execution status
- View final order confirmation

## 5.2 System

The system must:

- Validate input
- Fetch product details
- Check inventory
- Validate coupons
- Calculate the final amount
- Reserve inventory
- Process payment
- Create the order
- Generate an invoice
- Allocate a shipping partner
- Send notifications
- Handle failures
- Display readable status messages

---

# 6. Project Structure

Create the following project structure:

```text
ecommerce-promise-case-study/
│
├── index.html
├── db.json
├── package.json
│
├── css/
│   └── style.css
│
└── js/
    └── app.js
```

The `app.js` file must be created by participants.

---

# 7. Core Entities

## 7.1 Product

Each product should contain:

| Field | Description |
|---|---|
| `id` | Unique product identifier |
| `name` | Product name |
| `category` | Product category |
| `price` | Current product price |
| `stock` | Available stock |
| `image` | Product image URL |
| `active` | Whether the product is available for purchase |

---

## 7.2 Cart Item

Each cart item should contain:

| Field | Description |
|---|---|
| `productId` | Product identifier |
| `name` | Product name |
| `price` | Unit price |
| `quantity` | Selected quantity |
| `image` | Product image URL |

---

## 7.3 Customer

Customer information should contain:

| Field | Description |
|---|---|
| `fullName` | Customer name |
| `email` | Customer email |
| `mobile` | Customer mobile number |
| `addressLine1` | Primary address |
| `addressLine2` | Optional address |
| `city` | Customer city |
| `state` | Customer state |
| `postalCode` | Delivery postal code |

---

## 7.4 Coupon

Each coupon should contain:

| Field | Description |
|---|---|
| `id` | Coupon identifier |
| `code` | Coupon code |
| `discountType` | Percentage or fixed |
| `discountValue` | Discount amount |
| `minimumAmount` | Minimum order amount |
| `maximumDiscount` | Maximum permitted discount |
| `active` | Coupon status |
| `expiryDate` | Coupon expiry date |

---

## 7.5 Order

The final order should contain:

| Field | Description |
|---|---|
| `id` | Unique order identifier |
| `customer` | Customer information |
| `items` | Purchased items |
| `subtotal` | Cart subtotal |
| `discount` | Applied discount |
| `tax` | Tax amount |
| `deliveryCharge` | Shipping charge |
| `totalAmount` | Final payable amount |
| `paymentMethod` | Selected payment method |
| `paymentStatus` | Payment result |
| `orderStatus` | Order status |
| `invoiceStatus` | Invoice status |
| `shippingStatus` | Shipping allocation status |
| `createdAt` | Order creation timestamp |

---

# 8. Suggested JSON Server Resources

The `db.json` file should contain the following resources:

```json
{
  "products": [],
  "coupons": [],
  "orders": [],
  "payments": [],
  "shipments": [],
  "notifications": []
}
```

Participants should create sample data for products and coupons before implementing checkout.

---

# 9. Required REST Endpoints

## Products

```text
GET    http://localhost:3000/products
GET    http://localhost:3000/products/{id}
PATCH  http://localhost:3000/products/{id}
```

## Coupons

```text
GET    http://localhost:3000/coupons
GET    http://localhost:3000/coupons?code={couponCode}
```

## Orders

```text
GET    http://localhost:3000/orders
GET    http://localhost:3000/orders/{id}
POST   http://localhost:3000/orders
PATCH  http://localhost:3000/orders/{id}
```

## Payments

```text
POST   http://localhost:3000/payments
```

## Shipments

```text
POST   http://localhost:3000/shipments
```

## Notifications

```text
POST   http://localhost:3000/notifications
```

---

# 10. Checkout Steps to Implement

## Step 1: Initialize the Application

Participants must:

1. Select all required DOM elements.
2. Create an application state object.
3. Store cart items in an array.
4. Render cart items when the page loads.
5. Calculate and display the initial cart summary.
6. Register form and button event listeners.
7. Display the checkout progress panel.

Suggested state:

```text
cartItems
selectedCoupon
checkoutInProgress
reservedProducts
currentOrder
```

---

## Step 2: Render Cart Items

Create a function that:

1. Reads cart data.
2. Generates one row for every product.
3. Displays:
   - Product image
   - Product name
   - Unit price
   - Quantity
   - Item total
   - Remove action
4. Updates the cart item count.
5. Displays an empty-cart message when necessary.
6. Recalculates the order summary after every quantity change.

No API call is required in the first version.

---

## Step 3: Handle Quantity Changes

When quantity changes:

1. Validate that quantity is at least `1`.
2. Update the selected cart item.
3. Recalculate the item total.
4. Recalculate the cart subtotal.
5. Recalculate discount, tax and total.
6. Do not allow quantity to exceed a reasonable temporary limit before inventory validation.

---

## Step 4: Remove Cart Items

When a customer clicks Remove:

1. Identify the selected product.
2. Remove it from the cart.
3. Render the cart again.
4. Update totals.
5. Disable checkout when the cart becomes empty.

---

## Step 5: Validate Customer Details

Create a Promise-based validation operation.

The Promise should reject when:

- Full name is missing.
- Full name has fewer than three characters.
- Email is invalid.
- Mobile number is invalid.
- Address is missing.
- City is missing.
- State is missing.
- Postal code is invalid.
- Payment method is not selected.

The Promise should resolve with validated checkout data.

---

## Step 6: Validate the Cart

Create a Promise that checks:

- Cart contains at least one item.
- Every quantity is greater than zero.
- Every product ID exists.
- Every item has a valid price.
- No cart item is duplicated.
- Total quantity does not exceed the configured cart limit.

The operation should reject immediately when validation fails.

---

## Step 7: Fetch Current Product Details

For every cart item:

1. Fetch the latest product using:

```text
GET /products/{productId}
```

2. Verify that the HTTP response is successful.
3. Convert the response to JSON.
4. Verify that the product is active.
5. Replace the cart price with the latest server price.
6. Reject when any product is unavailable.

Use parallel Promise execution for independent product requests.

Recommended concept:

```text
Promise.all()
```

The checkout should fail if any required product request fails.

---

## Step 8: Check Inventory

For each fetched product:

1. Compare requested quantity with available stock.
2. Reject when requested quantity is greater than stock.
3. Produce a readable error containing:
   - Product name
   - Requested quantity
   - Available quantity
4. Resolve with inventory-confirmed cart data.

Example error requirement:

```text
Laptop Backpack requested quantity is 4, but only 2 units are available.
```

---

## Step 9: Validate Coupon

Coupon validation should be optional.

When no coupon is entered:

- Resolve with zero discount.

When a coupon is entered:

1. Fetch coupon using its code.
2. Verify that the coupon exists.
3. Verify that it is active.
4. Verify that it has not expired.
5. Verify that subtotal satisfies the minimum amount.
6. Calculate discount based on:
   - Percentage
   - Fixed amount
7. Apply maximum discount when configured.
8. Resolve with coupon and discount details.
9. Reject with a readable message for invalid coupons.

---

## Step 10: Calculate Checkout Amounts

Calculate:

```text
Subtotal = Sum of price × quantity

Discount = Coupon-based discount

Taxable Amount = Subtotal - Discount

Tax = Taxable Amount × Tax Rate

Delivery Charge = Based on order value

Final Total = Taxable Amount + Tax + Delivery Charge
```

Suggested rules:

- Tax rate: 18%
- Free delivery when taxable amount is at least ₹2,000
- Delivery charge below ₹2,000: ₹100
- Final amount cannot be negative

The calculation function may be synchronous but should be included in the Promise chain.

---

## Step 11: Reserve Inventory

Before payment:

1. Reserve the required quantity for each product.
2. Update product stock temporarily using:

```text
PATCH /products/{id}
```

3. New stock should be:

```text
Current Stock - Ordered Quantity
```

4. Store the original product stock in application state.
5. Use `Promise.all()` because every inventory update is mandatory.
6. Reject checkout if any reservation fails.

Important requirement:

- Participants must design an inventory rollback operation.
- If payment fails after inventory reservation, restore the original stock.

---

## Step 12: Process Payment

Create a Promise-based payment operation.

The operation must:

1. Display a payment-processing status.
2. Wait for a simulated delay.
3. Create a payment object.
4. Support:
   - Credit Card
   - Debit Card
   - UPI
   - Cash on Delivery
5. Reject for a simulated payment failure.
6. Resolve with:
   - Payment ID
   - Payment status
   - Payment method
   - Paid amount
   - Payment timestamp

For online payments, implement a timeout requirement using:

```text
Promise.race()
```

The payment should fail if it does not finish within the configured time.

---

## Step 13: Roll Back Inventory After Payment Failure

When payment fails:

1. Read the saved original inventory.
2. Send PATCH requests to restore product stock.
3. Use parallel execution.
4. Record rollback results.
5. Display rollback status.
6. Throw the original payment error after rollback.

The order must not be created when payment fails.

---

## Step 14: Create the Order

After successful payment:

1. Build the final order object.
2. Include:
   - Customer details
   - Cart items
   - Amount breakdown
   - Coupon details
   - Payment details
   - Initial order status
3. Send:

```text
POST /orders
```

4. Validate the HTTP response.
5. Resolve with the saved order returned by JSON Server.
6. Reject when order creation fails.

Suggested initial status:

```text
Confirmed
```

---

## Step 15: Generate Invoice

Create a Promise that:

1. Accepts the created order.
2. Waits for a simulated delay.
3. Creates an invoice number.
4. Calculates invoice totals.
5. Returns invoice information.
6. Supports simulated failure.

Example invoice number:

```text
INV-2026-000101
```

Invoice generation should be treated as a post-order operation.

---

## Step 16: Allocate Shipping Partner

Create a Promise that:

1. Reads the delivery postal code.
2. Selects a shipping partner.
3. Calculates estimated delivery date.
4. Generates a tracking ID.
5. Saves shipment details using:

```text
POST /shipments
```

6. Supports simulated failure.
7. Resolves with shipment details.

Possible partners:

- BlueDart
- Delhivery
- Ecom Express
- Xpressbees

---

## Step 17: Send Email Notification

Create a Promise that:

1. Builds an order-confirmation message.
2. Saves notification details using:

```text
POST /notifications
```

3. Supports simulated email failure.
4. Resolves with notification status.

---

## Step 18: Send SMS Notification

Create another Promise that:

1. Builds a short order-confirmation message.
2. Saves notification details.
3. Supports simulated SMS failure.
4. Resolves with notification status.

---

## Step 19: Run Post-Order Operations in Parallel

After order creation, run:

- Invoice generation
- Shipping allocation
- Email notification
- SMS notification

Use:

```text
Promise.allSettled()
```

Reason:

- Order creation is already complete.
- A notification failure should not cancel the confirmed order.
- Every operation result should be shown separately.

Display each result as:

```text
Invoice       → Successful or Failed
Shipping      → Successful or Failed
Email         → Successful or Failed
SMS           → Successful or Failed
```

---

## Step 20: Update the Order

After post-order operations:

1. Prepare a partial order update.
2. Add:
   - Invoice status
   - Shipping status
   - Notification status
3. Send:

```text
PATCH /orders/{id}
```

4. Do not fail the complete checkout if this optional update fails.
5. Display a warning instead.

---

## Step 21: Display Final Confirmation

The final confirmation must display:

- Order ID
- Customer name
- Number of items
- Total paid amount
- Payment status
- Order status
- Invoice status
- Shipping status
- Tracking ID, when available
- Estimated delivery date
- Notification results

---

## Step 22: Cleanup in `finally`

The final Promise chain must use `.finally()` or `finally` with `async/await`.

Cleanup responsibilities:

- Enable the Place Order button.
- Hide the loading indicator.
- Stop the progress animation.
- Re-enable form fields.
- Record workflow completion.
- Keep error or success result visible.

---

# 11. Failure Simulation Requirements

The interface must allow one failure stage to be selected.

Supported failure stages:

```text
No Failure
Product API Failure
Inventory Failure
Coupon Failure
Inventory Reservation Failure
Payment Failure
Payment Timeout
Order Creation Failure
Invoice Failure
Shipping Failure
Email Failure
SMS Failure
```

Participants must ensure that failures produce different results based on the stage.

---

# 12. Expected Error Behaviour

## Product API Failure

```text
Checkout stops.
Payment does not run.
Order is not created.
```

## Inventory Failure

```text
Checkout stops.
Payment does not run.
Order is not created.
```

## Payment Failure

```text
Reserved inventory is restored.
Order is not created.
Error message is shown.
```

## Order Creation Failure

```text
Payment may already be successful.
The system must show a critical error.
Participants should document how reconciliation would work.
```

## Invoice Failure

```text
Order remains confirmed.
Other post-order operations continue.
Warning is displayed.
```

## Email Failure

```text
Order remains confirmed.
SMS and shipping operations continue.
Warning is displayed.
```

---

# 13. Application Validation Rules

## Customer Name

- Required
- Minimum 3 characters
- Maximum 80 characters

## Email

- Required
- Must follow valid email format

## Mobile Number

- Required
- Exactly 10 digits
- Should not contain letters

## Address

- Required
- Minimum 10 characters

## City

- Required
- Minimum 2 characters

## State

- Required

## Postal Code

- Required
- Exactly 6 digits

## Cart

- At least one item
- Quantity must be at least 1
- Quantity must not exceed available stock

## Coupon

- Optional
- Must be active
- Must not be expired
- Minimum order condition must be satisfied

## Payment Method

- Required

---

# 14. UI Requirements

The page must contain:

- Application header
- Cart section
- Customer-information form
- Delivery-address form
- Coupon section
- Payment-method section
- Order summary
- Failure-simulation dropdown
- Place Order button
- Checkout progress panel
- Success panel
- Error panel

The interface must be responsive for:

- Desktop
- Tablet
- Mobile

---

# 15. Checkout Progress Stages

The progress panel should support the following states:

```text
Waiting
Running
Successful
Failed
Warning
Skipped
```

Required progress entries:

1. Validate customer
2. Validate cart
3. Fetch products
4. Check inventory
5. Validate coupon
6. Calculate total
7. Reserve inventory
8. Process payment
9. Create order
10. Generate invoice
11. Allocate shipping
12. Send email
13. Send SMS
14. Complete checkout

---

# 16. Starter `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <meta
        name="description"
        content="E-Commerce Checkout Promise Case Study"
    >

    <title>E-Commerce Checkout</title>

    <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
    >

    <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossorigin
    >

    <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        rel="stylesheet"
    >

    <link rel="stylesheet" href="css/style.css">
</head>

<body>

    <header class="main-header">
        <div class="container header-content">

            <div class="brand">
                <div class="brand-logo">EC</div>

                <div>
                    <h1>PromiseCart Checkout</h1>
                    <p>
                        Advanced JavaScript Promise Case Study
                    </p>
                </div>
            </div>

            <div class="secure-badge">
                🔒 Secure Checkout
            </div>

        </div>
    </header>


    <main class="container main-content">

        <section class="page-heading">
            <span class="section-label">
                E-Commerce Checkout
            </span>

            <h2>Complete Your Order</h2>

            <p>
                Review your cart, provide delivery details and
                process the order through a Promise-based workflow.
            </p>
        </section>


        <div class="checkout-layout">

            <div class="checkout-main">

                <!-- Cart Section -->
                <section class="card">

                    <div class="card-header">
                        <div>
                            <span class="section-label">
                                Shopping Cart
                            </span>

                            <h3>
                                Your Items
                                <span
                                    id="cartItemCount"
                                    class="count-badge"
                                >
                                    0
                                </span>
                            </h3>
                        </div>
                    </div>


                    <div id="cartItems" class="cart-items">

                        <!-- Cart items will be rendered by JavaScript -->

                    </div>


                    <div
                        id="emptyCart"
                        class="empty-state hidden"
                    >
                        <div class="empty-icon">🛒</div>

                        <h4>Your cart is empty</h4>

                        <p>
                            Add products before continuing to checkout.
                        </p>
                    </div>

                </section>


                <!-- Customer Details -->
                <section class="card">

                    <div class="card-header">
                        <div>
                            <span class="section-label">
                                Customer Information
                            </span>

                            <h3>Contact Details</h3>
                        </div>
                    </div>


                    <div class="form-row">

                        <div class="form-group">
                            <label for="fullName">
                                Full Name
                                <span class="required">*</span>
                            </label>

                            <input
                                type="text"
                                id="fullName"
                                placeholder="Enter full name"
                            >

                            <small
                                id="fullNameError"
                                class="error-message"
                            ></small>
                        </div>


                        <div class="form-group">
                            <label for="email">
                                Email Address
                                <span class="required">*</span>
                            </label>

                            <input
                                type="email"
                                id="email"
                                placeholder="customer@example.com"
                            >

                            <small
                                id="emailError"
                                class="error-message"
                            ></small>
                        </div>

                    </div>


                    <div class="form-group">
                        <label for="mobile">
                            Mobile Number
                            <span class="required">*</span>
                        </label>

                        <input
                            type="tel"
                            id="mobile"
                            maxlength="10"
                            placeholder="Enter 10-digit mobile number"
                        >

                        <small
                            id="mobileError"
                            class="error-message"
                        ></small>
                    </div>

                </section>


                <!-- Delivery Address -->
                <section class="card">

                    <div class="card-header">
                        <div>
                            <span class="section-label">
                                Delivery Information
                            </span>

                            <h3>Shipping Address</h3>
                        </div>
                    </div>


                    <div class="form-group">
                        <label for="addressLine1">
                            Address Line 1
                            <span class="required">*</span>
                        </label>

                        <input
                            type="text"
                            id="addressLine1"
                            placeholder="House number, building and street"
                        >

                        <small
                            id="addressLine1Error"
                            class="error-message"
                        ></small>
                    </div>


                    <div class="form-group">
                        <label for="addressLine2">
                            Address Line 2
                        </label>

                        <input
                            type="text"
                            id="addressLine2"
                            placeholder="Area or landmark"
                        >
                    </div>


                    <div class="form-row">

                        <div class="form-group">
                            <label for="city">
                                City
                                <span class="required">*</span>
                            </label>

                            <input
                                type="text"
                                id="city"
                                placeholder="Enter city"
                            >

                            <small
                                id="cityError"
                                class="error-message"
                            ></small>
                        </div>


                        <div class="form-group">
                            <label for="state">
                                State
                                <span class="required">*</span>
                            </label>

                            <select id="state">
                                <option value="">
                                    Select state
                                </option>

                                <option value="Maharashtra">
                                    Maharashtra
                                </option>

                                <option value="Karnataka">
                                    Karnataka
                                </option>

                                <option value="Gujarat">
                                    Gujarat
                                </option>

                                <option value="Delhi">
                                    Delhi
                                </option>

                                <option value="Tamil Nadu">
                                    Tamil Nadu
                                </option>
                            </select>

                            <small
                                id="stateError"
                                class="error-message"
                            ></small>
                        </div>

                    </div>


                    <div class="form-group">
                        <label for="postalCode">
                            Postal Code
                            <span class="required">*</span>
                        </label>

                        <input
                            type="text"
                            id="postalCode"
                            maxlength="6"
                            placeholder="Enter 6-digit postal code"
                        >

                        <small
                            id="postalCodeError"
                            class="error-message"
                        ></small>
                    </div>

                </section>


                <!-- Coupon -->
                <section class="card">

                    <div class="card-header">
                        <div>
                            <span class="section-label">
                                Savings
                            </span>

                            <h3>Apply Coupon</h3>
                        </div>
                    </div>


                    <div class="coupon-row">

                        <input
                            type="text"
                            id="couponCode"
                            placeholder="Enter coupon code"
                        >

                        <button
                            type="button"
                            id="applyCouponButton"
                            class="btn btn-secondary"
                        >
                            Apply Coupon
                        </button>

                    </div>


                    <p
                        id="couponMessage"
                        class="helper-message"
                    >
                        Coupon validation will occur during checkout.
                    </p>

                </section>


                <!-- Payment -->
                <section class="card">

                    <div class="card-header">
                        <div>
                            <span class="section-label">
                                Payment
                            </span>

                            <h3>Select Payment Method</h3>
                        </div>
                    </div>


                    <div class="payment-options">

                        <label class="payment-option">
                            <input
                                type="radio"
                                name="paymentMethod"
                                value="Credit Card"
                            >

                            <span>
                                <strong>Credit Card</strong>
                                <small>Visa, Mastercard and RuPay</small>
                            </span>
                        </label>


                        <label class="payment-option">
                            <input
                                type="radio"
                                name="paymentMethod"
                                value="Debit Card"
                            >

                            <span>
                                <strong>Debit Card</strong>
                                <small>All major banks supported</small>
                            </span>
                        </label>


                        <label class="payment-option">
                            <input
                                type="radio"
                                name="paymentMethod"
                                value="UPI"
                            >

                            <span>
                                <strong>UPI</strong>
                                <small>Google Pay, PhonePe and BHIM</small>
                            </span>
                        </label>


                        <label class="payment-option">
                            <input
                                type="radio"
                                name="paymentMethod"
                                value="Cash on Delivery"
                            >

                            <span>
                                <strong>Cash on Delivery</strong>
                                <small>Pay when the order arrives</small>
                            </span>
                        </label>

                    </div>


                    <small
                        id="paymentMethodError"
                        class="error-message"
                    ></small>

                </section>


                <!-- Failure Simulation -->
                <section class="card simulation-card">

                    <div class="card-header">
                        <div>
                            <span class="section-label">
                                Training Control
                            </span>

                            <h3>Simulate Workflow Failure</h3>
                        </div>
                    </div>


                    <div class="form-group">
                        <label for="failureStage">
                            Failure Stage
                        </label>

                        <select id="failureStage">

                            <option value="none">
                                No Failure
                            </option>

                            <option value="product-api">
                                Product API Failure
                            </option>

                            <option value="inventory">
                                Inventory Failure
                            </option>

                            <option value="coupon">
                                Coupon Failure
                            </option>

                            <option value="reservation">
                                Inventory Reservation Failure
                            </option>

                            <option value="payment">
                                Payment Failure
                            </option>

                            <option value="payment-timeout">
                                Payment Timeout
                            </option>

                            <option value="order">
                                Order Creation Failure
                            </option>

                            <option value="invoice">
                                Invoice Failure
                            </option>

                            <option value="shipping">
                                Shipping Failure
                            </option>

                            <option value="email">
                                Email Failure
                            </option>

                            <option value="sms">
                                SMS Failure
                            </option>

                        </select>
                    </div>

                </section>

            </div>


            <aside class="checkout-sidebar">

                <!-- Order Summary -->
                <section class="card summary-card">

                    <div class="card-header">
                        <div>
                            <span class="section-label">
                                Payment Summary
                            </span>

                            <h3>Order Summary</h3>
                        </div>
                    </div>


                    <div class="summary-row">
                        <span>Subtotal</span>
                        <strong id="subtotalAmount">₹0</strong>
                    </div>

                    <div class="summary-row discount-row">
                        <span>Discount</span>
                        <strong id="discountAmount">- ₹0</strong>
                    </div>

                    <div class="summary-row">
                        <span>Tax</span>
                        <strong id="taxAmount">₹0</strong>
                    </div>

                    <div class="summary-row">
                        <span>Delivery</span>
                        <strong id="deliveryAmount">₹0</strong>
                    </div>

                    <div class="summary-divider"></div>

                    <div class="summary-row total-row">
                        <span>Total</span>
                        <strong id="totalAmount">₹0</strong>
                    </div>


                    <button
                        type="button"
                        id="placeOrderButton"
                        class="btn btn-primary place-order-button"
                    >
                        Place Order
                    </button>


                    <p class="secure-note">
                        🔒 Your payment information is processed securely.
                    </p>

                </section>


                <!-- Checkout Progress -->
                <section class="card progress-card">

                    <div class="card-header">
                        <div>
                            <span class="section-label">
                                Promise Execution
                            </span>

                            <h3>Checkout Progress</h3>
                        </div>
                    </div>


                    <div id="checkoutProgress" class="progress-list">

                        <div
                            class="progress-item"
                            data-stage="customer-validation"
                        >
                            <span class="progress-marker">1</span>
                            <span>Validate customer</span>
                            <span class="progress-status">Waiting</span>
                        </div>

                        <div
                            class="progress-item"
                            data-stage="cart-validation"
                        >
                            <span class="progress-marker">2</span>
                            <span>Validate cart</span>
                            <span class="progress-status">Waiting</span>
                        </div>

                        <div
                            class="progress-item"
                            data-stage="products"
                        >
                            <span class="progress-marker">3</span>
                            <span>Fetch products</span>
                            <span class="progress-status">Waiting</span>
                        </div>

                        <div
                            class="progress-item"
                            data-stage="inventory"
                        >
                            <span class="progress-marker">4</span>
                            <span>Check inventory</span>
                            <span class="progress-status">Waiting</span>
                        </div>

                        <div
                            class="progress-item"
                            data-stage="coupon"
                        >
                            <span class="progress-marker">5</span>
                            <span>Validate coupon</span>
                            <span class="progress-status">Waiting</span>
                        </div>

                        <div
                            class="progress-item"
                            data-stage="calculation"
                        >
                            <span class="progress-marker">6</span>
                            <span>Calculate total</span>
                            <span class="progress-status">Waiting</span>
                        </div>

                        <div
                            class="progress-item"
                            data-stage="reservation"
                        >
                            <span class="progress-marker">7</span>
                            <span>Reserve inventory</span>
                            <span class="progress-status">Waiting</span>
                        </div>

                        <div
                            class="progress-item"
                            data-stage="payment"
                        >
                            <span class="progress-marker">8</span>
                            <span>Process payment</span>
                            <span class="progress-status">Waiting</span>
                        </div>

                        <div
                            class="progress-item"
                            data-stage="order"
                        >
                            <span class="progress-marker">9</span>
                            <span>Create order</span>
                            <span class="progress-status">Waiting</span>
                        </div>

                        <div
                            class="progress-item"
                            data-stage="post-order"
                        >
                            <span class="progress-marker">10</span>
                            <span>Post-order services</span>
                            <span class="progress-status">Waiting</span>
                        </div>

                    </div>

                </section>

            </aside>

        </div>


        <!-- Result Section -->
        <section
            id="checkoutResult"
            class="card result-card hidden"
        >

            <div id="resultIcon" class="result-icon">
                ✓
            </div>

            <div>
                <span class="section-label">
                    Checkout Result
                </span>

                <h3 id="resultTitle">
                    Order Completed
                </h3>

                <p id="resultMessage">
                    Your order has been processed.
                </p>
            </div>

        </section>

    </main>


    <footer class="main-footer">
        <div class="container">
            <p>
                E-Commerce Promise Case Study using JavaScript and JSON Server
            </p>
        </div>
    </footer>


    <script src="js/app.js"></script>

</body>
</html>
```

---

# 17. Starter `css/style.css`

```css
:root {
    --primary: #4f46e5;
    --primary-dark: #3730a3;
    --primary-light: #eef2ff;

    --success: #16a34a;
    --success-light: #dcfce7;

    --warning: #d97706;
    --warning-light: #fef3c7;

    --danger: #dc2626;
    --danger-light: #fee2e2;

    --info: #0284c7;
    --info-light: #e0f2fe;

    --purple: #7c3aed;
    --purple-light: #ede9fe;

    --text-primary: #111827;
    --text-secondary: #6b7280;
    --text-muted: #9ca3af;

    --border: #e5e7eb;
    --background: #f5f7fb;
    --white: #ffffff;

    --shadow-sm:
        0 1px 3px rgba(15, 23, 42, 0.06);

    --shadow-md:
        0 10px 30px rgba(15, 23, 42, 0.09);

    --shadow-lg:
        0 20px 45px rgba(15, 23, 42, 0.16);

    --radius-sm: 8px;
    --radius-md: 14px;
    --radius-lg: 20px;

    --transition: 0.25s ease;
}


* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}


html {
    scroll-behavior: smooth;
}


body {
    min-height: 100vh;

    background:
        radial-gradient(
            circle at top left,
            rgba(79, 70, 229, 0.09),
            transparent 28%
        ),
        radial-gradient(
            circle at bottom right,
            rgba(124, 58, 237, 0.06),
            transparent 25%
        ),
        var(--background);

    color: var(--text-primary);

    font-family:
        "Inter",
        Arial,
        sans-serif;

    line-height: 1.6;
}


button,
input,
select {
    font: inherit;
}


button {
    border: none;
    cursor: pointer;
}


.container {
    width: min(1450px, calc(100% - 40px));
    margin-inline: auto;
}


.hidden {
    display: none !important;
}


.main-header {
    position: sticky;
    top: 0;
    z-index: 100;

    padding: 20px 0;

    background: rgba(255, 255, 255, 0.94);
    border-bottom: 1px solid var(--border);
    box-shadow: var(--shadow-sm);

    backdrop-filter: blur(12px);
}


.header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;
}


.brand {
    display: flex;
    align-items: center;

    gap: 14px;
}


.brand-logo {
    width: 52px;
    height: 52px;

    display: grid;
    place-items: center;

    background:
        linear-gradient(
            135deg,
            var(--primary),
            var(--purple)
        );

    color: var(--white);
    border-radius: 15px;

    font-size: 17px;
    font-weight: 700;

    box-shadow:
        0 9px 20px rgba(79, 70, 229, 0.24);
}


.brand h1 {
    font-size: 21px;
    line-height: 1.3;
}


.brand p {
    color: var(--text-secondary);
    font-size: 13px;
}


.secure-badge {
    padding: 9px 14px;

    background: var(--success-light);
    color: #166534;

    border: 1px solid #86efac;
    border-radius: 999px;

    font-size: 12px;
    font-weight: 600;
}


.main-content {
    padding-top: 32px;
    padding-bottom: 55px;
}


.page-heading {
    margin-bottom: 25px;
}


.page-heading h2 {
    margin-bottom: 5px;
    font-size: 29px;
}


.page-heading p {
    max-width: 760px;

    color: var(--text-secondary);
    font-size: 14px;
}


.section-label {
    display: block;

    margin-bottom: 4px;

    color: var(--primary);

    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.1px;

    text-transform: uppercase;
}


.checkout-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 370px;

    gap: 24px;
    align-items: start;
}


.checkout-main {
    display: grid;
    gap: 22px;
}


.checkout-sidebar {
    display: grid;
    gap: 22px;

    position: sticky;
    top: 115px;
}


.card {
    padding: 24px;

    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);

    box-shadow: var(--shadow-sm);
}


.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;
    margin-bottom: 20px;
}


.card-header h3 {
    font-size: 19px;
}


.count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    min-width: 27px;
    height: 27px;
    padding: 0 8px;

    margin-left: 7px;

    background: var(--primary-light);
    color: var(--primary-dark);

    border-radius: 999px;

    font-size: 12px;
    font-weight: 700;
}


.cart-items {
    display: grid;
    gap: 14px;
}


.cart-item {
    display: grid;
    grid-template-columns: 70px minmax(0, 1fr) 110px 110px 40px;
    align-items: center;

    gap: 16px;
    padding: 15px;

    background: #fafafa;
    border: 1px solid var(--border);
    border-radius: 12px;
}


.cart-item-image {
    width: 70px;
    height: 70px;

    object-fit: cover;

    background: var(--primary-light);
    border-radius: 10px;
}


.cart-item-details h4 {
    margin-bottom: 3px;
    font-size: 14px;
}


.cart-item-details p {
    color: var(--text-secondary);
    font-size: 12px;
}


.quantity-control {
    display: flex;
    align-items: center;
}


.quantity-control input {
    width: 70px;
    text-align: center;
}


.item-total {
    font-size: 14px;
    font-weight: 700;
    text-align: right;
}


.remove-item-button {
    width: 34px;
    height: 34px;

    display: grid;
    place-items: center;

    background: var(--danger-light);
    color: var(--danger);

    border-radius: 8px;
}


.remove-item-button:hover {
    background: #fecaca;
}


.form-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);

    gap: 16px;
}


.form-group {
    margin-bottom: 18px;
}


label {
    display: block;

    margin-bottom: 7px;

    color: #374151;

    font-size: 13px;
    font-weight: 600;
}


.required {
    color: var(--danger);
}


input,
select {
    width: 100%;
    height: 45px;

    padding: 0 13px;

    background: #fafafa;
    color: var(--text-primary);

    border: 1px solid #d1d5db;
    border-radius: var(--radius-sm);

    outline: none;

    transition:
        border-color var(--transition),
        box-shadow var(--transition),
        background-color var(--transition);
}


input::placeholder {
    color: var(--text-muted);
}


input:hover,
select:hover {
    border-color: #9ca3af;
}


input:focus,
select:focus {
    background: var(--white);
    border-color: var(--primary);

    box-shadow:
        0 0 0 4px rgba(79, 70, 229, 0.11);
}


input.input-error,
select.input-error {
    border-color: var(--danger);

    box-shadow:
        0 0 0 3px rgba(220, 38, 38, 0.1);
}


.error-message {
    display: block;

    min-height: 17px;
    margin-top: 4px;

    color: var(--danger);

    font-size: 11px;
}


.coupon-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;

    gap: 10px;
}


.helper-message {
    display: block;

    margin-top: 8px;

    color: var(--text-secondary);
    font-size: 12px;
}


.payment-options {
    display: grid;
    grid-template-columns: repeat(2, 1fr);

    gap: 12px;
}


.payment-option {
    display: flex;
    align-items: flex-start;

    gap: 10px;
    padding: 15px;

    background: #fafafa;
    border: 1px solid var(--border);
    border-radius: 10px;

    cursor: pointer;

    transition:
        border-color var(--transition),
        background-color var(--transition);
}


.payment-option:hover {
    background: var(--primary-light);
    border-color: #c7d2fe;
}


.payment-option input {
    width: auto;
    height: auto;

    margin-top: 4px;
}


.payment-option span {
    display: grid;
}


.payment-option strong {
    font-size: 13px;
}


.payment-option small {
    color: var(--text-secondary);
    font-size: 11px;
}


.simulation-card {
    border-color: #fcd34d;
    background: #fffbeb;
}


.btn {
    min-height: 42px;
    padding: 10px 17px;

    border-radius: var(--radius-sm);

    font-size: 13px;
    font-weight: 600;

    transition:
        transform var(--transition),
        background-color var(--transition),
        box-shadow var(--transition);
}


.btn:hover {
    transform: translateY(-1px);
}


.btn:disabled {
    cursor: not-allowed;
    opacity: 0.65;
    transform: none;
}


.btn-primary {
    background: var(--primary);
    color: var(--white);

    box-shadow:
        0 5px 13px rgba(79, 70, 229, 0.24);
}


.btn-primary:hover {
    background: var(--primary-dark);
}


.btn-secondary {
    background: #e5e7eb;
    color: #374151;
}


.btn-secondary:hover {
    background: #d1d5db;
}


.summary-card {
    padding: 24px;
}


.summary-row {
    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 15px;
    padding: 10px 0;

    color: var(--text-secondary);
    font-size: 13px;
}


.summary-row strong {
    color: var(--text-primary);
}


.discount-row strong {
    color: var(--success);
}


.summary-divider {
    height: 1px;
    margin: 6px 0;

    background: var(--border);
}


.total-row {
    color: var(--text-primary);
    font-size: 16px;
}


.total-row strong {
    color: var(--primary);
    font-size: 21px;
}


.place-order-button {
    width: 100%;
    margin-top: 16px;
}


.secure-note {
    margin-top: 12px;

    color: var(--text-secondary);

    font-size: 11px;
    text-align: center;
}


.progress-list {
    display: grid;
    gap: 10px;
}


.progress-item {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) auto;
    align-items: center;

    gap: 10px;
    padding: 10px;

    background: #fafafa;
    border: 1px solid var(--border);
    border-radius: 9px;

    font-size: 12px;
}


.progress-marker {
    width: 27px;
    height: 27px;

    display: grid;
    place-items: center;

    background: #e5e7eb;
    color: #4b5563;

    border-radius: 50%;

    font-size: 11px;
    font-weight: 700;
}


.progress-status {
    color: var(--text-muted);
    font-size: 10px;
    font-weight: 600;

    text-transform: uppercase;
}


.progress-item.running {
    background: var(--info-light);
    border-color: #7dd3fc;
}


.progress-item.running .progress-marker {
    background: var(--info);
    color: var(--white);
}


.progress-item.success {
    background: var(--success-light);
    border-color: #86efac;
}


.progress-item.success .progress-marker {
    background: var(--success);
    color: var(--white);
}


.progress-item.failed {
    background: var(--danger-light);
    border-color: #fca5a5;
}


.progress-item.failed .progress-marker {
    background: var(--danger);
    color: var(--white);
}


.progress-item.warning {
    background: var(--warning-light);
    border-color: #fcd34d;
}


.progress-item.warning .progress-marker {
    background: var(--warning);
    color: var(--white);
}


.empty-state {
    padding: 45px 20px;
    text-align: center;
}


.empty-icon {
    width: 66px;
    height: 66px;

    display: grid;
    place-items: center;

    margin: 0 auto 14px;

    background: var(--primary-light);
    border-radius: 50%;

    font-size: 28px;
}


.empty-state h4 {
    margin-bottom: 4px;
    font-size: 16px;
}


.empty-state p {
    color: var(--text-secondary);
    font-size: 12px;
}


.result-card {
    display: flex;
    align-items: center;

    gap: 18px;
    margin-top: 24px;

    border-left: 5px solid var(--success);
}


.result-icon {
    width: 54px;
    height: 54px;

    display: grid;
    place-items: center;
    flex-shrink: 0;

    background: var(--success-light);
    color: var(--success);

    border-radius: 50%;

    font-size: 25px;
    font-weight: 700;
}


.result-card h3 {
    margin-bottom: 3px;
    font-size: 19px;
}


.result-card p {
    color: var(--text-secondary);
    font-size: 13px;
}


.result-card.error {
    border-left-color: var(--danger);
}


.result-card.error .result-icon {
    background: var(--danger-light);
    color: var(--danger);
}


.main-footer {
    padding: 20px 0;

    background: var(--white);
    border-top: 1px solid var(--border);

    text-align: center;
}


.main-footer p {
    color: var(--text-secondary);
    font-size: 12px;
}


@media (max-width: 1150px) {

    .checkout-layout {
        grid-template-columns: 1fr;
    }

    .checkout-sidebar {
        position: static;
        grid-template-columns: repeat(2, 1fr);
    }
}


@media (max-width: 800px) {

    .container {
        width: min(100% - 24px, 1450px);
    }

    .form-row,
    .payment-options,
    .checkout-sidebar {
        grid-template-columns: 1fr;
    }

    .cart-item {
        grid-template-columns: 60px minmax(0, 1fr);
    }

    .cart-item-image {
        width: 60px;
        height: 60px;
    }

    .quantity-control,
    .item-total,
    .remove-item-button {
        grid-column: 2;
    }

    .item-total {
        text-align: left;
    }

    .secure-badge {
        display: none;
    }
}


@media (max-width: 600px) {

    .main-header {
        padding: 15px 0;
    }

    .brand-logo {
        width: 45px;
        height: 45px;

        border-radius: 12px;
    }

    .brand h1 {
        font-size: 17px;
    }

    .brand p {
        display: none;
    }

    .main-content {
        padding-top: 20px;
    }

    .page-heading h2 {
        font-size: 24px;
    }

    .card {
        padding: 20px;
    }

    .coupon-row {
        grid-template-columns: 1fr;
    }

    .coupon-row .btn {
        width: 100%;
    }
}
```

---

# 18. Recommended Implementation Sequence

Participants should implement the case study in this order:

1. Create project folders and files.
2. Add the supplied HTML.
3. Add the supplied CSS.
4. Create `db.json`.
5. Add sample products.
6. Add sample coupons.
7. Start JSON Server.
8. Verify product endpoints using Postman.
9. Create `app.js`.
10. Select required DOM elements.
11. Create cart state.
12. Render cart items.
13. Add quantity-change logic.
14. Add remove-item logic.
15. Calculate summary values.
16. Add form-validation functions.
17. Create customer-validation Promise.
18. Create cart-validation Promise.
19. Fetch products using `Promise.all()`.
20. Add inventory validation.
21. Add coupon validation.
22. Add total calculation.
23. Add inventory reservation.
24. Add payment Promise.
25. Add payment timeout using `Promise.race()`.
26. Add rollback logic.
27. Add order-creation API call.
28. Add invoice Promise.
29. Add shipping Promise.
30. Add email Promise.
31. Add SMS Promise.
32. Run post-order tasks using `Promise.allSettled()`.
33. Update progress indicators.
34. Display the final result.
35. Add `.catch()` error handling.
36. Add `.finally()` cleanup.
37. Convert the final chain to `async/await`.
38. Test all failure scenarios.
39. Verify responsive behaviour.
40. Document observations.

---

# 19. Testing Scenarios

## Scenario 1: Successful Checkout

Expected result:

```text
All required operations succeed.
Order is created.
Invoice is generated.
Shipping is allocated.
Email and SMS are sent.
```

---

## Scenario 2: Invalid Customer Data

Expected result:

```text
Customer validation rejects.
No API requests are made.
Checkout stops.
```

---

## Scenario 3: One Product Is Out of Stock

Expected result:

```text
Product fetch succeeds.
Inventory validation rejects.
Payment does not run.
Order is not created.
```

---

## Scenario 4: Invalid Coupon

Expected result:

```text
Coupon validation rejects.
Checkout stops before inventory reservation.
```

An alternative design may allow checkout without the coupon, but participants must document the selected behaviour.

---

## Scenario 5: Payment Failure

Expected result:

```text
Inventory is reserved.
Payment rejects.
Inventory rollback runs.
Order is not created.
```

---

## Scenario 6: Payment Timeout

Expected result:

```text
Payment Promise does not finish within the limit.
Timeout Promise wins Promise.race().
Inventory rollback runs.
Order is not created.
```

---

## Scenario 7: Invoice Failure

Expected result:

```text
Order remains confirmed.
Shipping, email and SMS continue.
Invoice is marked failed.
```

---

## Scenario 8: Email Failure

Expected result:

```text
Order remains confirmed.
Invoice, shipping and SMS continue.
Email is marked failed.
```

---

## Scenario 9: Shipping Failure

Expected result:

```text
Order remains confirmed.
Invoice and notifications continue.
Shipping status is marked failed.
Manual action warning is shown.
```

---

# 20. Acceptance Criteria

The application is complete when:

1. Cart items render correctly.
2. Quantity changes update totals.
3. Cart items can be removed.
4. Customer fields are validated.
5. Cart data is validated.
6. Current product data is fetched from JSON Server.
7. Inventory is checked for every item.
8. Coupon validation works.
9. Subtotal, discount, tax, delivery and total are calculated.
10. Inventory is reserved before payment.
11. Payment timeout is implemented.
12. Inventory rollback works after payment failure.
13. Orders are saved to JSON Server.
14. Post-order operations run in parallel.
15. Individual post-order failures do not cancel a confirmed order.
16. Progress stages update dynamically.
17. Errors are displayed clearly.
18. The Place Order button is disabled during processing.
19. Cleanup runs after success and failure.
20. The page works on desktop, tablet and mobile screens.

---

# 21. Participant Deliverables

Participants must submit:

1. `index.html`
2. `css/style.css`
3. `js/app.js`
4. `db.json`
5. Postman collection
6. Screenshots of:
   - Successful checkout
   - Inventory failure
   - Payment failure with rollback
   - Email or invoice failure
7. A short explanation of:
   - Sequential Promises
   - Parallel Promises
   - `Promise.all()`
   - `Promise.allSettled()`
   - `Promise.race()`
   - Error propagation
   - Inventory rollback

---

# 22. Review Questions

1. Which checkout operations must run sequentially?
2. Which operations can run in parallel?
3. Why should product fetch requests use `Promise.all()`?
4. Why should post-order operations use `Promise.allSettled()`?
5. What happens if one Promise in `Promise.all()` rejects?
6. Why is inventory reservation required before payment?
7. Why is rollback needed after payment failure?
8. How can `Promise.race()` implement a timeout?
9. What happens when a Promise is not returned from `.then()`?
10. How does a thrown error move through the Promise chain?
11. Why should HTTP response status be checked before `response.json()`?
12. What does an `async` function return?
13. What happens when an awaited Promise rejects?
14. Why should the Place Order button be disabled?
15. Which failures should stop checkout completely?
16. Which failures should only generate warnings?
17. How would the design change with a real payment gateway?
18. How would duplicate order creation be prevented?
19. What is an idempotency key?
20. How would failed post-order services be retried?

---

# 23. Advanced Extension Requirements

After completing the main assignment, participants may add:

- Product search page
- Local storage cart persistence
- Multiple delivery addresses
- Address selection
- Payment retry
- Coupon removal
- Order cancellation
- Refund workflow
- Inventory compensation
- Retry with exponential backoff
- Idempotency keys
- Delivery-slot selection
- Order history
- Invoice download
- Product recommendations
- Multiple warehouse inventory
- Fastest shipping provider using `Promise.any()`
- Fastest product server using `Promise.race()`

---

# 24. Final Workflow Summary

```text
Validate customer
        ↓
Validate cart
        ↓
Fetch products in parallel
        ↓
Check inventory
        ↓
Validate coupon
        ↓
Calculate total
        ↓
Reserve inventory in parallel
        ↓
Process payment with timeout
        ↓
Create order
        ↓
Run invoice, shipping, email and SMS in parallel
        ↓
Update final order status
        ↓
Display checkout result
```

The assignment is intentionally designed without a JavaScript solution so participants can design and implement a complete Promise-based e-commerce checkout workflow.
