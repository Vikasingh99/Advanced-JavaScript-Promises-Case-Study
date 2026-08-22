/**
 * ============================================================
 * app.js
 * Advanced JavaScript Promises Case Study
 * E-Commerce Checkout and Order Fulfilment System
 *
 * Concepts demonstrated:
 *   - Promise constructor (resolve / reject)
 *   - Promise chaining (.then / .catch / .finally)
 *   - Promise.all()        – parallel product fetch & inventory reservation
 *   - Promise.allSettled() – parallel post-order services
 *   - Promise.race()       – payment timeout guard
 *   - async / await        – main checkout orchestration
 *   - Fetch API            – all JSON-Server REST calls
 *   - Error propagation    – errors bubble from inner Promises to outer catch
 *   - Inventory rollback   – PATCH stock back on payment failure
 * ============================================================
 */

"use strict";

/* ============================================================
 * SECTION 1 – CONSTANTS
 * These values are referenced throughout the application.
 * Centralising them makes changes easy and prevents "magic numbers".
 * ============================================================ */

/** Base URL of the JSON Server REST API */
const BASE_URL = "http://localhost:3000";

/**
 * Tax rate applied to the taxable amount (subtotal minus discount).
 * Expressed as a decimal fraction (0.18 = 18 %).
 */
const TAX_RATE = 0.18;

/**
 * Orders above this amount qualify for free delivery.
 * Unit: Indian Rupees.
 */
const FREE_DELIVERY_LIMIT = 2000;

/**
 * Flat delivery charge applied when the taxable amount is below
 * FREE_DELIVERY_LIMIT.
 */
const DELIVERY_CHARGE = 100;

/**
 * Maximum number of milliseconds allowed for a payment response.
 * If payment takes longer, Promise.race() lets the timeout win.
 * 8 seconds for online payments; COD is exempt.
 */
const PAYMENT_TIMEOUT = 8000;

/**
 * Maximum total number of items (sum of all quantities) permitted
 * in the cart before checkout.
 */
const MAX_CART_ITEMS = 20;


/* ============================================================
 * SECTION 2 – APPLICATION STATE
 * A single plain object holds all mutable runtime data.
 * Keeping state in one place makes it easy to inspect in DevTools.
 * ============================================================ */

const state = {
  /**
   * cartItems – Array of cart item objects.
   * Each object: { productId, name, price, quantity, image }
   * Pre-populated with realistic demo data so the UI renders on load.
   */
  cartItems: [
    {
      productId: 1,
      name: "Sony WH-1000XM5 Headphones",
      price: 24990,
      quantity: 1,
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&h=120&fit=crop"
    },
    {
      productId: 3,
      name: "Nike Air Max 270",
      price: 8995,
      quantity: 2,
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&h=120&fit=crop"
    },
    {
      productId: 7,
      name: "Stainless Steel Water Bottle 1L",
      price: 899,
      quantity: 1,
      image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=120&h=120&fit=crop"
    }
  ],

  /** selectedCoupon – The coupon object returned by the server, or null. */
  selectedCoupon: null,

  /**
   * checkoutInProgress – Boolean guard that prevents a second
   * Place-Order click while checkout is already running.
   */
  checkoutInProgress: false,

  /**
   * reservedProducts – Snapshot of products BEFORE their stock is
   * reduced during reservation.  Used by rollbackInventory() to
   * restore stock when payment fails.
   * Shape: [ { id, originalStock } ]
   */
  reservedProducts: [],

  /**
   * currentOrder – The order object returned by POST /orders.
   * Stored here so updateOrder() can PATCH the correct record.
   */
  currentOrder: null
};


/* ============================================================
 * SECTION 3 – DOM ELEMENT SELECTION
 * All element references are resolved once at startup.
 * Never call getElementById repeatedly inside render loops.
 * ============================================================ */

const dom = {
  /* Cart */
  cartItems:      document.getElementById("cartItems"),
  emptyCart:      document.getElementById("emptyCart"),
  cartItemCount:  document.getElementById("cartItemCount"),

  /* Summary */
  subtotalAmount: document.getElementById("subtotalAmount"),
  discountAmount: document.getElementById("discountAmount"),
  taxAmount:      document.getElementById("taxAmount"),
  deliveryAmount: document.getElementById("deliveryAmount"),
  totalAmount:    document.getElementById("totalAmount"),

  /* Customer form */
  fullName:           document.getElementById("fullName"),
  email:              document.getElementById("email"),
  mobile:             document.getElementById("mobile"),
  addressLine1:       document.getElementById("addressLine1"),
  addressLine2:       document.getElementById("addressLine2"),
  city:               document.getElementById("city"),
  state:              document.getElementById("state"),
  postalCode:         document.getElementById("postalCode"),

  /* Inline error spans */
  fullNameError:      document.getElementById("fullNameError"),
  emailError:         document.getElementById("emailError"),
  mobileError:        document.getElementById("mobileError"),
  addressLine1Error:  document.getElementById("addressLine1Error"),
  cityError:          document.getElementById("cityError"),
  stateError:         document.getElementById("stateError"),
  postalCodeError:    document.getElementById("postalCodeError"),
  paymentMethodError: document.getElementById("paymentMethodError"),

  /* Coupon */
  couponCode:         document.getElementById("couponCode"),
  applyCouponButton:  document.getElementById("applyCouponButton"),
  couponMessage:      document.getElementById("couponMessage"),

  /* Failure simulation */
  failureStage:   document.getElementById("failureStage"),

  /* Place Order */
  placeOrderButton: document.getElementById("placeOrderButton"),

  /* Progress panel */
  checkoutProgress: document.getElementById("checkoutProgress"),

  /* Result section */
  checkoutResult: document.getElementById("checkoutResult"),
  resultIcon:     document.getElementById("resultIcon"),
  resultTitle:    document.getElementById("resultTitle"),
  resultMessage:  document.getElementById("resultMessage")
};


/* ============================================================
 * SECTION 4 – HELPER UTILITIES
 * Small, pure functions that have no side-effects on state.
 * ============================================================ */

/**
 * delay
 * Returns a Promise that resolves after `ms` milliseconds.
 * Used inside async functions to simulate network latency.
 *
 * @param {number} ms – Milliseconds to wait.
 * @returns {Promise<void>}
 *
 * Promise behaviour:
 *   Always resolves (never rejects).
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * generateOrderId
 * Creates a short, human-readable order identifier.
 *
 * @returns {string}  e.g. "ORD-1720001234567"
 */
const generateOrderId = () => `ORD-${Date.now()}`;

/**
 * generateInvoiceNumber
 * Creates a sequential-looking invoice number using the current year
 * and a padded random suffix.
 *
 * @returns {string}  e.g. "INV-2026-000101"
 */
const generateInvoiceNumber = () => {
  const year = new Date().getFullYear();
  const seq  = String(Math.floor(Math.random() * 999999) + 1).padStart(6, "0");
  return `INV-${year}-${seq}`;
};

/**
 * generateTrackingId
 * Creates a courier tracking reference.
 *
 * @returns {string}  e.g. "TRK-BD-20241234"
 */
const generateTrackingId = () => {
  const suffix = String(Math.floor(Math.random() * 99999999) + 10000000);
  const carrier = ["BD", "DL", "EX", "XB"][Math.floor(Math.random() * 4)];
  return `TRK-${carrier}-${suffix}`;
};

/**
 * formatCurrency
 * Formats a number as Indian Rupees with the ₹ symbol.
 *
 * @param {number} amount – Numeric amount.
 * @returns {string}        e.g. "₹24,990"
 */
const formatCurrency = (amount) =>
  `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;

/**
 * showError
 * Displays an inline validation error below a form field.
 *
 * @param {HTMLElement} el      – The <small> error element.
 * @param {string}      message – Error text to display.
 */
const showError = (el, message) => {
  if (!el) return;
  el.textContent = message;
  el.style.display = "block";
};

/**
 * clearError
 * Removes the text and hides an inline validation error element.
 *
 * @param {HTMLElement} el – The <small> error element.
 */
const clearError = (el) => {
  if (!el) return;
  el.textContent = "";
  el.style.display = "none";
};

/**
 * clearAllErrors
 * Clears every inline error element in the form.
 * Called at the start of each checkout attempt.
 */
const clearAllErrors = () => {
  [
    dom.fullNameError, dom.emailError, dom.mobileError,
    dom.addressLine1Error, dom.cityError, dom.stateError,
    dom.postalCodeError, dom.paymentMethodError
  ].forEach(clearError);
};

/**
 * showSuccess
 * Logs a styled success line to the browser console.
 * (The UI uses displayResult() for the user-visible banner.)
 *
 * @param {string} message
 */
const showSuccess = (message) => {
  console.log(`%c✔ ${message}`, "color: #16a34a; font-weight: bold;");
};

/**
 * setButtonLoading
 * Toggles the Place Order button between its normal and loading states.
 *
 * @param {boolean} loading – true → show spinner; false → restore label.
 */
const setButtonLoading = (loading) => {
  const btn = dom.placeOrderButton;
  if (loading) {
    btn.disabled    = true;
    btn.textContent = "⏳ Processing…";
    btn.classList.add("loading");
  } else {
    btn.disabled    = false;
    btn.textContent = "Place Order";
    btn.classList.remove("loading");
  }
};

/**
 * getSelectedPaymentMethod
 * Reads the currently checked radio button in the payment section.
 *
 * @returns {string|null} Payment method value or null if none selected.
 */
const getSelectedPaymentMethod = () => {
  const checked = document.querySelector('input[name="paymentMethod"]:checked');
  return checked ? checked.value : null;
};

/**
 * getFailureStage
 * Returns the value chosen in the failure-simulation dropdown.
 *
 * @returns {string}  e.g. "none", "payment", "inventory", …
 */
const getFailureStage = () => dom.failureStage.value;

/**
 * addEstimatedDays
 * Returns a new Date that is `days` calendar days after today.
 *
 * @param {number} days
 * @returns {string}  ISO date string e.g. "2026-09-01"
 */
const addEstimatedDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};


/* ============================================================
 * SECTION 5 – PROGRESS PANEL HELPERS
 * The progress panel in the sidebar shows each checkout stage
 * with a status badge.  These helpers update individual items.
 * ============================================================ */

/**
 * updateProgress
 * Sets the status text and CSS class on a progress-panel item.
 *
 * @param {string} stage  – The data-stage attribute value of the target div.
 * @param {string} status – "running" | "success" | "failed" | "warning" | "skipped"
 * @param {string} [label] – Optional override for the status text.
 *
 * Status → CSS class mapping:
 *   running  → progress-running  (pulsing blue)
 *   success  → progress-success  (green)
 *   failed   → progress-failed   (red)
 *   warning  → progress-warning  (amber)
 *   skipped  → progress-skipped  (grey)
 */
const updateProgress = (stage, status, label) => {
  const item = dom.checkoutProgress.querySelector(`[data-stage="${stage}"]`);
  if (!item) return;

  const statusEl = item.querySelector(".progress-status");
  const markerEl = item.querySelector(".progress-marker");

  /* Remove any previous status classes */
  item.classList.remove(
    "progress-running",
    "progress-success",
    "progress-failed",
    "progress-warning",
    "progress-skipped"
  );

  item.classList.add(`progress-${status}`);

  const statusLabels = {
    running : "Running…",
    success : "✔ Done",
    failed  : "✘ Failed",
    warning : "⚠ Warning",
    skipped : "— Skipped"
  };

  if (statusEl) {
    statusEl.textContent = label || statusLabels[status] || status;
  }

  /* Replace the number marker with an icon on terminal states */
  if (markerEl) {
    const icons = {
      success : "✔",
      failed  : "✘",
      warning : "⚠",
      skipped : "—"
    };
    if (icons[status]) markerEl.textContent = icons[status];
  }
};

/**
 * resetProgress
 * Restores every progress-panel item to its initial "Waiting" state.
 * Called at the start of each checkout attempt.
 */
const resetProgress = () => {
  const items = dom.checkoutProgress.querySelectorAll(".progress-item");
  items.forEach((item, index) => {
    item.classList.remove(
      "progress-running",
      "progress-success",
      "progress-failed",
      "progress-warning",
      "progress-skipped"
    );

    const statusEl = item.querySelector(".progress-status");
    const markerEl = item.querySelector(".progress-marker");

    if (statusEl) statusEl.textContent = "Waiting";
    if (markerEl) markerEl.textContent = String(index + 1);
  });
};


/* ============================================================
 * SECTION 6 – CART RENDERING
 * renderCart()     – Rebuilds the entire cart HTML from state.cartItems.
 * calculateSummary() – Recomputes subtotal, discount, tax, delivery, total.
 * ============================================================ */

/**
 * renderCart
 * Reads state.cartItems and inserts one HTML row per item into the DOM.
 * Attaches quantity-change and remove-item event listeners to each row.
 * Also toggles the empty-cart message and updates the count badge.
 *
 * @returns {void}
 *
 * Promise behaviour: synchronous – no Promises involved here.
 */
const renderCart = () => {
  const items = state.cartItems;

  /* Show / hide the empty-cart placeholder */
  if (items.length === 0) {
    dom.cartItems.innerHTML = "";
    dom.emptyCart.classList.remove("hidden");
    dom.placeOrderButton.disabled = true;
    dom.cartItemCount.textContent = "0";
    calculateSummary();
    return;
  }

  dom.emptyCart.classList.add("hidden");
  dom.placeOrderButton.disabled = false;

  /* Update the badge showing total number of distinct products */
  dom.cartItemCount.textContent = String(items.length);

  /* Build HTML for every cart item */
  dom.cartItems.innerHTML = items
    .map(
      (item) => `
      <div class="cart-item" data-product-id="${item.productId}">

        <img
          class="cart-item-image"
          src="${item.image}"
          alt="${item.name}"
          onerror="this.src='https://via.placeholder.com/80x80?text=IMG'"
        >

        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${formatCurrency(item.price)} each</div>
        </div>

        <div class="quantity-control">
          <button
            class="quantity-btn decrease-btn"
            data-product-id="${item.productId}"
            aria-label="Decrease quantity"
          >−</button>

          <input
            type="number"
            class="quantity-input"
            data-product-id="${item.productId}"
            value="${item.quantity}"
            min="1"
            max="10"
            aria-label="Quantity for ${item.name}"
          >

          <button
            class="quantity-btn increase-btn"
            data-product-id="${item.productId}"
            aria-label="Increase quantity"
          >+</button>
        </div>

        <div class="item-total">
          ${formatCurrency(item.price * item.quantity)}
        </div>

        <button
          class="remove-item-button"
          data-product-id="${item.productId}"
          aria-label="Remove ${item.name}"
        >
          Remove
        </button>

      </div>
    `
    )
    .join("");

  /* Attach event listeners AFTER injecting HTML */
  attachCartListeners();

  /* Recompute order summary whenever the cart changes */
  calculateSummary();
};

/**
 * attachCartListeners
 * Delegates click and change events on the newly rendered cart rows.
 * Uses event delegation on the cart container to keep code lean.
 *
 * @returns {void}
 */
const attachCartListeners = () => {
  /* Quantity − button */
  dom.cartItems.querySelectorAll(".decrease-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id   = Number(btn.dataset.productId);
      const item = state.cartItems.find((c) => c.productId === id);
      if (item && item.quantity > 1) {
        item.quantity -= 1;
        renderCart();
      }
    });
  });

  /* Quantity + button */
  dom.cartItems.querySelectorAll(".increase-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id   = Number(btn.dataset.productId);
      const item = state.cartItems.find((c) => c.productId === id);
      if (item && item.quantity < 10) {
        item.quantity += 1;
        renderCart();
      }
    });
  });

  /* Quantity input typed directly */
  dom.cartItems.querySelectorAll(".quantity-input").forEach((input) => {
    input.addEventListener("change", () => {
      const id    = Number(input.dataset.productId);
      const item  = state.cartItems.find((c) => c.productId === id);
      const value = parseInt(input.value, 10);

      if (item) {
        if (!Number.isFinite(value) || value < 1) {
          input.value    = item.quantity; /* revert */
          return;
        }
        item.quantity = Math.min(value, 10); /* cap at 10 */
        renderCart();
      }
    });
  });

  /* Remove button */
  dom.cartItems.querySelectorAll(".remove-item-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.productId);
      removeItem(id);
    });
  });
};

/**
 * removeItem
 * Filters a product out of state.cartItems and re-renders.
 *
 * @param {number} productId – The product to remove.
 * @returns {void}
 */
const removeItem = (productId) => {
  state.cartItems = state.cartItems.filter((c) => c.productId !== productId);
  renderCart();
};

/**
 * calculateSummary
 * Computes and displays the order summary using state.cartItems
 * and state.selectedCoupon.
 *
 * Formula:
 *   subtotal      = Σ (price × quantity)
 *   discount      = coupon discount (0 if no coupon)
 *   taxableAmount = subtotal - discount
 *   tax           = taxableAmount × TAX_RATE
 *   delivery      = 0 if taxableAmount >= FREE_DELIVERY_LIMIT, else DELIVERY_CHARGE
 *   total         = taxableAmount + tax + delivery
 *
 * @returns {{ subtotal, discount, taxableAmount, tax, delivery, total }}
 */
const calculateSummary = () => {
  const subtotal = state.cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  /* Apply coupon discount when a valid coupon is stored in state */
  let discount = 0;
  if (state.selectedCoupon) {
    const c = state.selectedCoupon;
    if (c.discountType === "percentage") {
      discount = (subtotal * c.discountValue) / 100;
      if (c.maximumDiscount) discount = Math.min(discount, c.maximumDiscount);
    } else {
      discount = Math.min(c.discountValue, subtotal);
    }
  }

  const taxableAmount = Math.max(subtotal - discount, 0);
  const tax           = taxableAmount * TAX_RATE;
  const delivery      = taxableAmount >= FREE_DELIVERY_LIMIT ? 0 : DELIVERY_CHARGE;
  const total         = Math.max(taxableAmount + tax + delivery, 0);

  /* Update the DOM */
  dom.subtotalAmount.textContent = formatCurrency(subtotal);
  dom.discountAmount.textContent = `- ${formatCurrency(discount)}`;
  dom.taxAmount.textContent      = formatCurrency(tax);
  dom.deliveryAmount.textContent = delivery === 0 ? "Free" : formatCurrency(delivery);
  dom.totalAmount.textContent    = formatCurrency(total);

  return { subtotal, discount, taxableAmount, tax, delivery, total };
};


/* ============================================================
 * SECTION 7 – RESULT DISPLAY
 * displayResult() renders the success or error banner at the
 * bottom of the page and scrolls it into view.
 * ============================================================ */

/**
 * displayResult
 * Shows the checkout result banner (success or error).
 *
 * @param {"success"|"error"} type    – Controls colour and icon.
 * @param {string}            title   – Bold heading text.
 * @param {string}            message – HTML body content (supports tags).
 */
const displayResult = (type, title, message) => {
  dom.checkoutResult.classList.remove("hidden", "result-success", "result-error");
  dom.checkoutResult.classList.add(`result-${type}`);

  dom.resultIcon.textContent    = type === "success" ? "✓" : "✕";
  dom.resultTitle.textContent   = title;
  dom.resultMessage.innerHTML   = message;

  /* Smooth-scroll the result into view */
  dom.checkoutResult.scrollIntoView({ behavior: "smooth", block: "start" });
};


/* ============================================================
 * SECTION 8 – PROMISE-BASED VALIDATION
 * Both functions return Promises so they plug directly into
 * the async/await checkout chain.
 * ============================================================ */

/**
 * validateCustomer
 * Reads the customer form, validates every field and resolves with
 * a structured customer data object if everything passes.
 *
 * @returns {Promise<object>}
 *   Resolves with: { fullName, email, mobile, addressLine1,
 *                    addressLine2, city, state, postalCode, paymentMethod }
 *   Rejects  with: Error whose message names the first invalid field.
 *
 * Promise behaviour:
 *   Uses the Promise constructor so we can call reject() without throwing.
 *   A single rejected field stops validation immediately (fail-fast).
 */
const validateCustomer = () => {
  return new Promise((resolve, reject) => {
    clearAllErrors();

    const fullName    = dom.fullName.value.trim();
    const email       = dom.email.value.trim();
    const mobile      = dom.mobile.value.trim();
    const addressLine1 = dom.addressLine1.value.trim();
    const addressLine2 = dom.addressLine2.value.trim();
    const city        = dom.city.value.trim();
    const stateVal    = dom.state.value;
    const postalCode  = dom.postalCode.value.trim();
    const paymentMethod = getSelectedPaymentMethod();

    /* Full Name */
    if (!fullName) {
      showError(dom.fullNameError, "Full name is required.");
      return reject(new Error("Full name is required."));
    }
    if (fullName.length < 3) {
      showError(dom.fullNameError, "Name must be at least 3 characters.");
      return reject(new Error("Full name must be at least 3 characters."));
    }
    if (fullName.length > 80) {
      showError(dom.fullNameError, "Name must not exceed 80 characters.");
      return reject(new Error("Full name must not exceed 80 characters."));
    }

    /* Email */
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      showError(dom.emailError, "Email address is required.");
      return reject(new Error("Email address is required."));
    }
    if (!emailRegex.test(email)) {
      showError(dom.emailError, "Enter a valid email address.");
      return reject(new Error("Enter a valid email address."));
    }

    /* Mobile */
    const mobileRegex = /^\d{10}$/;
    if (!mobile) {
      showError(dom.mobileError, "Mobile number is required.");
      return reject(new Error("Mobile number is required."));
    }
    if (!mobileRegex.test(mobile)) {
      showError(dom.mobileError, "Enter a valid 10-digit mobile number.");
      return reject(new Error("Mobile number must be exactly 10 digits."));
    }

    /* Address Line 1 */
    if (!addressLine1) {
      showError(dom.addressLine1Error, "Address is required.");
      return reject(new Error("Delivery address is required."));
    }
    if (addressLine1.length < 10) {
      showError(dom.addressLine1Error, "Address must be at least 10 characters.");
      return reject(new Error("Address must be at least 10 characters."));
    }

    /* City */
    if (!city) {
      showError(dom.cityError, "City is required.");
      return reject(new Error("City is required."));
    }
    if (city.length < 2) {
      showError(dom.cityError, "City name must be at least 2 characters.");
      return reject(new Error("City name must be at least 2 characters."));
    }

    /* State */
    if (!stateVal) {
      showError(dom.stateError, "Please select a state.");
      return reject(new Error("State is required."));
    }

    /* Postal Code */
    const postalRegex = /^\d{6}$/;
    if (!postalCode) {
      showError(dom.postalCodeError, "Postal code is required.");
      return reject(new Error("Postal code is required."));
    }
    if (!postalRegex.test(postalCode)) {
      showError(dom.postalCodeError, "Enter a valid 6-digit postal code.");
      return reject(new Error("Postal code must be exactly 6 digits."));
    }

    /* Payment method */
    if (!paymentMethod) {
      showError(dom.paymentMethodError, "Please select a payment method.");
      return reject(new Error("Payment method is required."));
    }

    /* All validations passed – resolve with the collected customer data */
    resolve({
      fullName,
      email,
      mobile,
      addressLine1,
      addressLine2,
      city,
      state: stateVal,
      postalCode,
      paymentMethod
    });
  });
};

/**
 * validateCart
 * Ensures the cart meets every business rule before any API calls.
 *
 * Checks:
 *   1. Cart has at least one item.
 *   2. Every item has a valid productId (number > 0).
 *   3. Every item has a valid price (number > 0).
 *   4. Every item has quantity >= 1.
 *   5. No duplicate productIds.
 *   6. Total quantity does not exceed MAX_CART_ITEMS.
 *
 * @returns {Promise<Array>}
 *   Resolves with the cartItems array.
 *   Rejects  with an Error describing the first violation.
 *
 * Promise behaviour:
 *   Uses the Promise constructor with explicit resolve/reject calls.
 */
const validateCart = () => {
  return new Promise((resolve, reject) => {
    const items = state.cartItems;

    if (items.length === 0) {
      return reject(new Error("Your cart is empty. Add at least one product."));
    }

    const seenIds = new Set();
    let   totalQty = 0;

    for (const item of items) {
      if (!item.productId || item.productId <= 0) {
        return reject(new Error(`Cart contains an item with an invalid product ID.`));
      }
      if (!item.price || item.price <= 0) {
        return reject(new Error(`"${item.name}" has an invalid price.`));
      }
      if (!item.quantity || item.quantity < 1) {
        return reject(new Error(`Quantity for "${item.name}" must be at least 1.`));
      }
      if (seenIds.has(item.productId)) {
        return reject(new Error(`"${item.name}" appears more than once in the cart.`));
      }
      seenIds.add(item.productId);
      totalQty += item.quantity;
    }

    if (totalQty > MAX_CART_ITEMS) {
      return reject(
        new Error(
          `Total cart quantity (${totalQty}) exceeds the limit of ${MAX_CART_ITEMS} items.`
        )
      );
    }

    resolve(items);
  });
};


/* ============================================================
 * SECTION 9 – FETCH PRODUCT DETAILS (Promise.all)
 * Each product is fetched independently so requests run in
 * parallel. Promise.all() waits for ALL to complete.
 * If any single fetch fails, the whole checkout stops.
 * ============================================================ */

/**
 * fetchSingleProduct
 * Fetches one product from GET /products/{id}.
 *
 * @param {object} cartItem – { productId, name, quantity, … }
 * @returns {Promise<object>} The server product merged with cart quantity.
 *
 * Promise behaviour:
 *   Rejects if the HTTP status is not OK (product not found or server error).
 *   Rejects if the product has active: false (unavailable).
 *   Resolves with { ...serverProduct, orderedQty } on success.
 */
const fetchSingleProduct = (cartItem) => {
  /* If failure simulation targets the product API, simulate a 404 */
  if (getFailureStage() === "product-api") {
    return Promise.reject(
      new Error(
        `Product API Failure: Could not fetch "${cartItem.name}" (simulated 404).`
      )
    );
  }

  return fetch(`${BASE_URL}/products/${cartItem.productId}`)
    .then((response) => {
      /* Always check response.ok before calling .json() */
      if (!response.ok) {
        throw new Error(
          `Product API error for "${cartItem.name}": HTTP ${response.status} ${response.statusText}`
        );
      }
      return response.json();
    })
    .then((product) => {
      /* Business rule: the product must be marked active on the server */
      if (!product.active) {
        throw new Error(
          `"${product.name}" is currently unavailable. Please remove it from your cart.`
        );
      }

      /* Return the server product combined with the quantity from the cart */
      return {
        ...product,
        orderedQty: cartItem.quantity
      };
    });
};

/**
 * fetchProducts
 * Fetches ALL cart products in parallel using Promise.all().
 *
 * @param {Array} cartItems – Current cart items array.
 * @returns {Promise<Array>} Array of server product objects (with orderedQty).
 *
 * Promise behaviour:
 *   Promise.all() rejects as soon as ANY one fetch rejects.
 *   This correctly prevents checkout from continuing with stale data.
 */
const fetchProducts = (cartItems) => {
  /* Map each cart item to a fetch Promise, then wait for all */
  const fetchPromises = cartItems.map((item) => fetchSingleProduct(item));
  return Promise.all(fetchPromises);
};


/* ============================================================
 * SECTION 10 – INVENTORY VALIDATION
 * After fetching fresh server data, compare each product's
 * available stock against the quantity the customer wants.
 * ============================================================ */

/**
 * checkInventory
 * Validates that every product has sufficient stock for the ordered quantity.
 * Updates cart prices to match server prices (price correction).
 *
 * @param {Array} serverProducts – Products returned by fetchProducts().
 * @returns {Promise<Array>} The same serverProducts array if all pass.
 *
 * Promise behaviour:
 *   Rejects immediately with a human-readable message on the first
 *   insufficient-stock violation.
 *   Resolves with confirmed products when all quantities are satisfiable.
 */
const checkInventory = (serverProducts) => {
  return new Promise((resolve, reject) => {
    if (getFailureStage() === "inventory") {
      return reject(
        new Error(
          `Inventory Failure: "${serverProducts[0].name}" is out of stock (simulated).`
        )
      );
    }

    for (const product of serverProducts) {
      if (product.orderedQty > product.stock) {
        return reject(
          new Error(
            `"${product.name}" requested quantity is ${product.orderedQty}, ` +
            `but only ${product.stock} unit${product.stock !== 1 ? "s are" : " is"} available.`
          )
        );
      }

      /* Sync cart price with latest server price */
      const cartItem = state.cartItems.find((c) => c.productId === product.id);
      if (cartItem) cartItem.price = product.price;
    }

    resolve(serverProducts);
  });
};


/* ============================================================
 * SECTION 11 – COUPON VALIDATION
 * Coupon is optional.  If the input is blank, the Promise
 * resolves with { discount: 0 } immediately.
 * ============================================================ */

/**
 * validateCoupon
 * Validates the coupon code entered by the user.
 *
 * Steps (when a code is entered):
 *   1. GET /coupons?code=<code>
 *   2. Check the coupon exists.
 *   3. Check active flag.
 *   4. Check expiry date.
 *   5. Check minimum order amount.
 *   6. Calculate discount (percentage or fixed).
 *   7. Apply maximumDiscount cap.
 *
 * @param {number} subtotal – Current cart subtotal (used for minimum check).
 * @returns {Promise<object>}
 *   Resolves with: { coupon|null, discount, discountType, discountLabel }
 *   Rejects  with: Error describing why the coupon is invalid.
 *
 * Promise behaviour:
 *   Uses fetch() which itself returns a Promise.
 *   Returns a rejected Promise via throw inside .then() for business-rule failures.
 */
const validateCoupon = (subtotal) => {
  const code = dom.couponCode.value.trim().toUpperCase();

  /* No coupon entered – resolve with zero discount immediately */
  if (!code) {
    state.selectedCoupon = null;
    return Promise.resolve({
      coupon       : null,
      discount     : 0,
      discountType : null,
      discountLabel: "No coupon applied"
    });
  }

  /* Simulated coupon failure for training purposes */
  if (getFailureStage() === "coupon") {
    return Promise.reject(
      new Error(`Coupon Failure: Code "${code}" could not be validated (simulated).`)
    );
  }

  /* Query JSON Server for a coupon matching the entered code */
  return fetch(`${BASE_URL}/coupons?code=${encodeURIComponent(code)}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Coupon service error: HTTP ${response.status}`);
      }
      return response.json();
    })
    .then((coupons) => {
      /* json-server returns an array even for a single match */
      if (!coupons || coupons.length === 0) {
        throw new Error(`Coupon code "${code}" does not exist.`);
      }

      const coupon = coupons[0];

      /* Active check */
      if (!coupon.active) {
        throw new Error(`Coupon "${code}" is currently inactive.`);
      }

      /* Expiry check */
      const today      = new Date().toISOString().split("T")[0];
      if (coupon.expiryDate < today) {
        throw new Error(
          `Coupon "${code}" expired on ${coupon.expiryDate}. Please use a valid coupon.`
        );
      }

      /* Minimum order amount */
      if (subtotal < coupon.minimumAmount) {
        throw new Error(
          `Coupon "${code}" requires a minimum order of ${formatCurrency(coupon.minimumAmount)}. ` +
          `Your subtotal is ${formatCurrency(subtotal)}.`
        );
      }

      /* Calculate discount amount */
      let discount = 0;
      let discountLabel = "";

      if (coupon.discountType === "percentage") {
        discount     = (subtotal * coupon.discountValue) / 100;
        discountLabel = `${coupon.discountValue}% off`;
      } else {
        discount     = coupon.discountValue;
        discountLabel = `${formatCurrency(coupon.discountValue)} flat off`;
      }

      /* Cap at maximum discount */
      if (coupon.maximumDiscount) {
        discount = Math.min(discount, coupon.maximumDiscount);
      }

      /* Store for later use in calculateSummary */
      state.selectedCoupon = coupon;

      return {
        coupon,
        discount,
        discountType : coupon.discountType,
        discountLabel
      };
    });
};


/* ============================================================
 * SECTION 12 – TOTAL CALCULATION
 * Wraps the synchronous calculateSummary() in a resolved Promise
 * so it slots cleanly into the async checkout chain.
 * ============================================================ */

/**
 * calculateTotals
 * Computes the complete order amount breakdown.
 *
 * @param {object} couponResult – { discount, coupon, … } from validateCoupon().
 * @returns {Promise<object>}
 *   Resolves with: { subtotal, discount, taxableAmount, tax, delivery, total }
 *
 * Promise behaviour:
 *   Always resolves (calculation is deterministic).
 *   Wrapped in Promise.resolve() so it chains naturally with await.
 */
const calculateTotals = (couponResult) => {
  /* calculateSummary() is synchronous but updates the DOM as a side-effect */
  const totals = calculateSummary();

  /* Override discount with the validated coupon discount */
  const discount     = couponResult.discount || 0;
  const subtotal     = totals.subtotal;
  const taxableAmount = Math.max(subtotal - discount, 0);
  const tax          = taxableAmount * TAX_RATE;
  const delivery     = taxableAmount >= FREE_DELIVERY_LIMIT ? 0 : DELIVERY_CHARGE;
  const total        = Math.max(taxableAmount + tax + delivery, 0);

  /* Update DOM with corrected values */
  dom.discountAmount.textContent = `- ${formatCurrency(discount)}`;
  dom.taxAmount.textContent      = formatCurrency(tax);
  dom.deliveryAmount.textContent = delivery === 0 ? "Free" : formatCurrency(delivery);
  dom.totalAmount.textContent    = formatCurrency(total);

  return Promise.resolve({
    subtotal,
    discount,
    taxableAmount,
    tax,
    delivery,
    total
  });
};


/* ============================================================
 * SECTION 13 – INVENTORY RESERVATION (Promise.all)
 * Each product stock is reduced via PATCH /products/{id}.
 * All updates must succeed or checkout aborts.
 * Original stocks are saved for rollback.
 * ============================================================ */

/**
 * reserveSingleProduct
 * PATCHes one product's stock on the server to reflect the reservation.
 *
 * @param {object} product – Server product object with orderedQty.
 * @returns {Promise<object>} The updated product returned by the server.
 *
 * Promise behaviour:
 *   Rejects if the HTTP PATCH call fails.
 */
const reserveSingleProduct = (product) => {
  const newStock = product.stock - product.orderedQty;

  return fetch(`${BASE_URL}/products/${product.id}`, {
    method : "PATCH",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify({ stock: newStock })
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to reserve inventory for "${product.name}": HTTP ${response.status}`
        );
      }
      return response.json();
    });
};

/**
 * reserveInventory
 * Saves original stock values and reserves inventory for all products
 * in parallel using Promise.all().
 *
 * @param {Array} serverProducts – Products from checkInventory().
 * @returns {Promise<Array>}
 *   Resolves with the array of updated product objects.
 *   Rejects if ANY single PATCH fails (Promise.all short-circuits).
 *
 * Promise behaviour:
 *   Promise.all() – all reservations must succeed.
 *   Saves original stock into state.reservedProducts for rollback.
 */
const reserveInventory = (serverProducts) => {
  /* Simulated reservation failure */
  if (getFailureStage() === "reservation") {
    return Promise.reject(
      new Error(
        `Reservation Failure: Could not reserve stock for "${serverProducts[0].name}" (simulated).`
      )
    );
  }

  /* Snapshot original stock values BEFORE reducing them */
  state.reservedProducts = serverProducts.map((p) => ({
    id           : p.id,
    name         : p.name,
    originalStock: p.stock,
    orderedQty   : p.orderedQty
  }));

  const reservePromises = serverProducts.map((p) => reserveSingleProduct(p));
  return Promise.all(reservePromises);
};

/**
 * rollbackInventory
 * Restores product stock to its pre-reservation value after payment failure.
 * Runs all PATCH requests in parallel using Promise.all().
 *
 * @returns {Promise<void>}
 *   Always resolves (rollback errors are logged but do not re-throw).
 *
 * Promise behaviour:
 *   Uses Promise.allSettled() internally so a partial rollback failure
 *   does not mask the original payment error.
 */
const rollbackInventory = async () => {
  if (state.reservedProducts.length === 0) return;

  updateProgress("reservation", "warning", "⚠ Rolling back…");

  const rollbackPromises = state.reservedProducts.map((saved) =>
    fetch(`${BASE_URL}/products/${saved.id}`, {
      method : "PATCH",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ stock: saved.originalStock })
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Rollback failed for "${saved.name}": HTTP ${response.status}`);
        }
        return response.json();
      })
  );

  /* allSettled so we see every result even if some fail */
  const results = await Promise.allSettled(rollbackPromises);

  const allRolledBack = results.every((r) => r.status === "fulfilled");
  if (allRolledBack) {
    console.log("✔ Inventory rollback successful for all products.");
    updateProgress("reservation", "warning", "⚠ Stock restored");
  } else {
    console.error("⚠ Some inventory rollback operations failed:", results);
    updateProgress("reservation", "warning", "⚠ Partial rollback");
  }

  /* Clear the snapshot after rollback */
  state.reservedProducts = [];
};


/* ============================================================
 * SECTION 14 – PAYMENT PROCESSING (Promise.race)
 * The payment Promise races against a timeout Promise.
 * Whichever resolves / rejects first wins.
 * Cash on Delivery is exempt from the timeout requirement.
 * ============================================================ */

/**
 * paymentPromise
 * Simulates a payment gateway call.
 *
 * @param {object} totals    – { total, … } from calculateTotals().
 * @param {string} method    – Selected payment method.
 * @returns {Promise<object>}
 *   Resolves with: { paymentId, paymentStatus, paymentMethod, amount, paidAt }
 *   Rejects  with: Error on simulated failure.
 *
 * Promise behaviour:
 *   Wraps setTimeout in a Promise constructor.
 *   delay() simulates network round-trip time.
 */
const paymentPromise = (totals, method) =>
  new Promise(async (resolve, reject) => {
    /* Simulate gateway network delay (2–3 s) */
    await delay(2000 + Math.random() * 1000);

    if (getFailureStage() === "payment") {
      return reject(
        new Error(
          `Payment Failure: Transaction declined by ${method} gateway (simulated).`
        )
      );
    }

    /* POST the payment record to JSON Server */
    const paymentData = {
      paymentId    : `PAY-${Date.now()}`,
      orderId      : generateOrderId(),
      paymentMethod: method,
      amount       : totals.total,
      status       : "Success",
      paidAt       : new Date().toISOString()
    };

    try {
      const response = await fetch(`${BASE_URL}/payments`, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify(paymentData)
      });

      if (!response.ok) {
        throw new Error(`Payment record save failed: HTTP ${response.status}`);
      }

      const savedPayment = await response.json();
      resolve({
        paymentId    : savedPayment.paymentId || paymentData.paymentId,
        paymentStatus: "Success",
        paymentMethod: method,
        amount       : totals.total,
        paidAt       : paymentData.paidAt
      });
    } catch (err) {
      reject(err);
    }
  });

/**
 * timeoutPromise
 * Rejects after PAYMENT_TIMEOUT milliseconds.
 * Used as the "competitor" in Promise.race().
 *
 * @returns {Promise<never>} Always rejects after the configured timeout.
 */
const timeoutPromise = () =>
  new Promise((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            `Payment Timeout: Payment did not complete within ${PAYMENT_TIMEOUT / 1000} seconds. ` +
            "Please try again."
          )
        ),
      PAYMENT_TIMEOUT
    )
  );

/**
 * processPayment
 * Runs the payment with a timeout guard using Promise.race().
 *
 * For Cash on Delivery: no timeout is needed (resolve immediately).
 * For all online methods: race payment against the timeout.
 *
 * @param {object} totals  – Amount details.
 * @param {string} method  – Payment method string.
 * @returns {Promise<object>} Payment result object.
 *
 * Promise behaviour:
 *   Promise.race([paymentPromise, timeoutPromise])
 *   → whichever settles first wins.
 *   If timeoutPromise wins: rejects with timeout error.
 *   If paymentPromise wins:  resolves with payment result.
 */
const processPayment = (totals, method) => {
  if (getFailureStage() === "payment-timeout") {
    /*
     * Simulate timeout: paymentPromise takes longer than PAYMENT_TIMEOUT.
     * We create a very slow payment so the timeout wins the race.
     */
    const slowPayment = new Promise((resolve) =>
      setTimeout(resolve, PAYMENT_TIMEOUT + 5000)
    );
    return Promise.race([slowPayment, timeoutPromise()]);
  }

  /* Cash on Delivery – no online gateway, resolve immediately */
  if (method === "Cash on Delivery") {
    return Promise.resolve({
      paymentId    : `COD-${Date.now()}`,
      paymentStatus: "Pending (COD)",
      paymentMethod: method,
      amount       : totals.total,
      paidAt       : new Date().toISOString()
    });
  }

  /* Online payment – race with timeout */
  return Promise.race([paymentPromise(totals, method), timeoutPromise()]);
};


/* ============================================================
 * SECTION 15 – ORDER CREATION
 * After successful payment, persist the order to JSON Server.
 * ============================================================ */

/**
 * createOrder
 * Builds and POSTs the order object to POST /orders.
 *
 * @param {object} customer      – Validated customer data.
 * @param {object} totals        – Amount breakdown.
 * @param {object} paymentResult – Result from processPayment().
 * @param {object} couponResult  – Result from validateCoupon().
 * @returns {Promise<object>}
 *   Resolves with the order object returned by JSON Server.
 *   Rejects on HTTP error or simulated failure.
 *
 * Promise behaviour:
 *   Uses fetch() → Promise chain internally.
 */
const createOrder = (customer, totals, paymentResult, couponResult) => {
  if (getFailureStage() === "order") {
    return Promise.reject(
      new Error(
        "Order Creation Failure: Could not save order to database (simulated). " +
        "NOTE: Payment was already collected. Please contact support with your payment reference."
      )
    );
  }

  const order = {
    id             : generateOrderId(),
    customer,
    items          : state.cartItems.map((item) => ({
      productId  : item.productId,
      name       : item.name,
      price      : item.price,
      quantity   : item.quantity,
      itemTotal  : item.price * item.quantity
    })),
    subtotal       : totals.subtotal,
    discount       : totals.discount,
    couponCode     : couponResult.coupon ? couponResult.coupon.code : null,
    tax            : totals.tax,
    deliveryCharge : totals.delivery,
    totalAmount    : totals.total,
    paymentMethod  : paymentResult.paymentMethod,
    paymentStatus  : paymentResult.paymentStatus,
    paymentId      : paymentResult.paymentId,
    orderStatus    : "Confirmed",
    invoiceStatus  : "Pending",
    shippingStatus : "Pending",
    emailStatus    : "Pending",
    smsStatus      : "Pending",
    createdAt      : new Date().toISOString()
  };

  return fetch(`${BASE_URL}/orders`, {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify(order)
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Order creation failed: HTTP ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then((savedOrder) => {
      /* Store the saved order so updateOrder() can PATCH it later */
      state.currentOrder = savedOrder;
      return savedOrder;
    });
};


/* ============================================================
 * SECTION 16 – POST-ORDER SERVICES
 * These four operations run in parallel using Promise.allSettled().
 * Each is independent; a failure in one does NOT cancel the others.
 * ============================================================ */

/**
 * generateInvoice
 * Simulates invoice generation for the confirmed order.
 *
 * @param {object} order – The saved order from createOrder().
 * @returns {Promise<object>}
 *   Resolves with: { invoiceNumber, amount, generatedAt }
 *   Rejects  with: Error on simulated failure.
 */
const generateInvoice = async (order) => {
  await delay(800 + Math.random() * 500);

  if (getFailureStage() === "invoice") {
    throw new Error(
      `Invoice Failure: Could not generate invoice for order ${order.id} (simulated).`
    );
  }

  return {
    invoiceNumber: generateInvoiceNumber(),
    orderId      : order.id,
    amount       : order.totalAmount,
    generatedAt  : new Date().toISOString()
  };
};

/**
 * allocateShipping
 * Selects a shipping partner, calculates delivery date, and POSTs
 * shipment details to POST /shipments.
 *
 * @param {object} order – The saved order from createOrder().
 * @returns {Promise<object>}
 *   Resolves with: { partner, trackingId, estimatedDelivery }
 *   Rejects  with: Error on simulated failure.
 */
const allocateShipping = async (order) => {
  await delay(600 + Math.random() * 400);

  if (getFailureStage() === "shipping") {
    throw new Error(
      `Shipping Failure: No shipping partner available for postal code ${order.customer.postalCode} (simulated).`
    );
  }

  const partners   = ["BlueDart", "Delhivery", "Ecom Express", "Xpressbees"];
  const partner    = partners[Math.floor(Math.random() * partners.length)];
  const trackingId = generateTrackingId();
  const deliveryDays = partner === "BlueDart" ? 2 : partner === "Delhivery" ? 3 : 4;
  const estimatedDelivery = addEstimatedDays(deliveryDays);

  const shipment = {
    orderId          : order.id,
    partner,
    trackingId,
    estimatedDelivery,
    postalCode       : order.customer.postalCode,
    status           : "Dispatched",
    createdAt        : new Date().toISOString()
  };

  const response = await fetch(`${BASE_URL}/shipments`, {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify(shipment)
  });

  if (!response.ok) {
    throw new Error(`Shipment creation failed: HTTP ${response.status}`);
  }

  return { partner, trackingId, estimatedDelivery };
};

/**
 * sendEmail
 * Simulates sending an order-confirmation email and saves the
 * notification record to POST /notifications.
 *
 * @param {object} order – The saved order.
 * @returns {Promise<object>}
 *   Resolves with: { channel, recipient, sentAt }
 *   Rejects  with: Error on simulated failure.
 */
const sendEmail = async (order) => {
  await delay(700 + Math.random() * 300);

  if (getFailureStage() === "email") {
    throw new Error(
      `Email Failure: Could not send confirmation email to ${order.customer.email} (simulated).`
    );
  }

  const notification = {
    orderId  : order.id,
    channel  : "Email",
    recipient: order.customer.email,
    subject  : `Order Confirmed – ${order.id}`,
    body     : `Hi ${order.customer.fullName}, your order ${order.id} worth ${formatCurrency(order.totalAmount)} has been confirmed.`,
    status   : "Sent",
    sentAt   : new Date().toISOString()
  };

  const response = await fetch(`${BASE_URL}/notifications`, {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify(notification)
  });

  if (!response.ok) {
    throw new Error(`Email notification save failed: HTTP ${response.status}`);
  }

  return { channel: "Email", recipient: order.customer.email, sentAt: notification.sentAt };
};

/**
 * sendSMS
 * Simulates sending an order-confirmation SMS.
 *
 * @param {object} order – The saved order.
 * @returns {Promise<object>}
 *   Resolves with: { channel, recipient, sentAt }
 *   Rejects  with: Error on simulated failure.
 */
const sendSMS = async (order) => {
  await delay(500 + Math.random() * 300);

  if (getFailureStage() === "sms") {
    throw new Error(
      `SMS Failure: Could not send SMS to ${order.customer.mobile} (simulated).`
    );
  }

  const notification = {
    orderId  : order.id,
    channel  : "SMS",
    recipient: order.customer.mobile,
    body     : `PromiseCart: Order ${order.id} confirmed. Amount: ${formatCurrency(order.totalAmount)}. Thank you!`,
    status   : "Sent",
    sentAt   : new Date().toISOString()
  };

  const response = await fetch(`${BASE_URL}/notifications`, {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify(notification)
  });

  if (!response.ok) {
    throw new Error(`SMS notification save failed: HTTP ${response.status}`);
  }

  return { channel: "SMS", recipient: order.customer.mobile, sentAt: notification.sentAt };
};


/* ============================================================
 * SECTION 17 – ORDER UPDATE (PATCH)
 * After post-order services complete (allSettled), patch the
 * order record with invoice/shipping/notification statuses.
 * ============================================================ */

/**
 * updateOrder
 * PATCHes the saved order with results from post-order operations.
 *
 * @param {object} order             – The original saved order.
 * @param {object} postOrderSummary  – { invoiceStatus, shippingStatus, emailStatus, smsStatus, … }
 * @returns {Promise<void>}
 *   Resolves when PATCH succeeds.
 *   Rejects silently (caller should handle as a warning, not a fatal error).
 */
const updateOrder = async (order, postOrderSummary) => {
  if (!order || !order.id) {
    console.warn("updateOrder: no order ID available – skipping PATCH.");
    return;
  }

  const patch = {
    invoiceStatus : postOrderSummary.invoiceStatus,
    shippingStatus: postOrderSummary.shippingStatus,
    emailStatus   : postOrderSummary.emailStatus,
    smsStatus     : postOrderSummary.smsStatus,
    trackingId    : postOrderSummary.trackingId   || null,
    invoiceNumber : postOrderSummary.invoiceNumber || null,
    estimatedDelivery: postOrderSummary.estimatedDelivery || null,
    updatedAt     : new Date().toISOString()
  };

  const response = await fetch(`${BASE_URL}/orders/${order.id}`, {
    method : "PATCH",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify(patch)
  });

  if (!response.ok) {
    throw new Error(`Order status update failed: HTTP ${response.status}`);
  }

  return response.json();
};


/* ============================================================
 * SECTION 18 – CLEANUP
 * Runs in the finally block regardless of success or failure.
 * ============================================================ */

/**
 * cleanup
 * Restores the UI to a usable state after checkout completes or fails.
 *
 * @returns {void}
 *
 * Promise behaviour: synchronous – no Promises involved.
 */
const cleanup = () => {
  /* Re-enable the Place Order button */
  setButtonLoading(false);

  /* Release the checkout-in-progress guard */
  state.checkoutInProgress = false;

  /* Clear the temporary reservation snapshot (rollback handled it already) */
  /* state.reservedProducts is cleared in rollbackInventory; leave it here too */
  /* in case checkout succeeded (no rollback was called). */
  state.reservedProducts = [];

  console.log(
    "%cCheckout workflow complete.",
    "color: #4f46e5; font-weight: bold;"
  );
};


/* ============================================================
 * SECTION 19 – MAIN CHECKOUT WORKFLOW (async / await)
 * The entire 14-step checkout is orchestrated here using
 * async/await for readability while individual steps still
 * return Promises (demonstrating both async patterns).
 * ============================================================ */

/**
 * startCheckout
 * Orchestrates the complete checkout workflow.
 * Each await corresponds to one Promise-based step.
 * The finally block always runs cleanup().
 *
 * @returns {Promise<void>}
 *
 * Workflow order:
 *  1.  validateCustomer()       – Promise constructor
 *  2.  validateCart()           – Promise constructor
 *  3.  fetchProducts()          – Promise.all (parallel fetches)
 *  4.  checkInventory()         – Promise constructor
 *  5.  validateCoupon()         – fetch chain (.then)
 *  6.  calculateTotals()        – Promise.resolve
 *  7.  reserveInventory()       – Promise.all (parallel PATCHes)
 *  8.  processPayment()         – Promise.race (payment vs timeout)
 *  9.  createOrder()            – fetch chain (.then)
 *  10. Promise.allSettled()     – [invoice, shipping, email, SMS]
 *  11. updateOrder()            – fetch (PATCH)
 *  12. displayResult()          – synchronous DOM update
 *  13. finally → cleanup()      – always runs
 */
const startCheckout = async () => {
  /* Guard: prevent double submission */
  if (state.checkoutInProgress) return;
  state.checkoutInProgress = true;

  /* Visual feedback */
  setButtonLoading(true);
  resetProgress();
  dom.checkoutResult.classList.add("hidden");

  /* Reset state for a fresh checkout */
  state.currentOrder     = null;
  state.reservedProducts = [];

  try {

    /* ---- STEP 1: Validate Customer ---- */
    updateProgress("customer-validation", "running");
    const customer = await validateCustomer();
    updateProgress("customer-validation", "success");
    showSuccess(`Customer validated: ${customer.fullName}`);


    /* ---- STEP 2: Validate Cart ---- */
    updateProgress("cart-validation", "running");
    const cartItems = await validateCart();
    updateProgress("cart-validation", "success");
    showSuccess(`Cart validated: ${cartItems.length} item(s)`);


    /* ---- STEP 3: Fetch Products (Promise.all) ---- */
    updateProgress("products", "running");
    const serverProducts = await fetchProducts(cartItems);
    updateProgress("products", "success", `✔ ${serverProducts.length} fetched`);
    showSuccess(`Fetched ${serverProducts.length} product(s) from server`);


    /* ---- STEP 4: Check Inventory ---- */
    updateProgress("inventory", "running");
    const confirmedProducts = await checkInventory(serverProducts);
    updateProgress("inventory", "success");
    showSuccess("Inventory check passed");


    /* ---- STEP 5: Validate Coupon ---- */
    updateProgress("coupon", "running");
    const subtotalForCoupon = state.cartItems.reduce(
      (s, i) => s + i.price * i.quantity, 0
    );
    const couponResult = await validateCoupon(subtotalForCoupon);
    if (couponResult.coupon) {
      dom.couponMessage.textContent = `✔ Coupon "${couponResult.coupon.code}" applied — ${couponResult.discountLabel}`;
      dom.couponMessage.style.color = "var(--success)";
      updateProgress("coupon", "success", `✔ ${couponResult.discountLabel}`);
      showSuccess(`Coupon applied: ${couponResult.discountLabel}`);
    } else {
      dom.couponMessage.textContent = "No coupon applied.";
      dom.couponMessage.style.color = "";
      updateProgress("coupon", "skipped", "— No coupon");
    }


    /* ---- STEP 6: Calculate Totals ---- */
    updateProgress("calculation", "running");
    const totals = await calculateTotals(couponResult);
    updateProgress("calculation", "success", `✔ ${formatCurrency(totals.total)}`);
    showSuccess(`Total calculated: ${formatCurrency(totals.total)}`);


    /* ---- STEP 7: Reserve Inventory (Promise.all) ---- */
    updateProgress("reservation", "running");
    await reserveInventory(confirmedProducts);
    updateProgress("reservation", "success");
    showSuccess("Inventory reserved");


    /* ---- STEP 8: Process Payment (Promise.race with timeout) ---- */
    updateProgress("payment", "running");
    let paymentResult;
    try {
      paymentResult = await processPayment(totals, customer.paymentMethod);
      updateProgress("payment", "success", `✔ ${paymentResult.paymentStatus}`);
      showSuccess(`Payment successful: ${paymentResult.paymentId}`);
    } catch (paymentError) {
      updateProgress("payment", "failed");
      /* CRITICAL: roll back reserved inventory before propagating error */
      await rollbackInventory();
      throw paymentError; /* re-throw so the outer catch picks it up */
    }


    /* ---- STEP 9: Create Order ---- */
    updateProgress("order", "running");
    const savedOrder = await createOrder(customer, totals, paymentResult, couponResult);
    updateProgress("order", "success", `✔ ${savedOrder.id}`);
    showSuccess(`Order created: ${savedOrder.id}`);


    /* ---- STEP 10: Post-Order Services (Promise.allSettled) ---- */
    updateProgress("post-order", "running");

    /**
     * Promise.allSettled() runs all four operations in parallel.
     * Unlike Promise.all(), it does NOT short-circuit on rejection.
     * Every result — whether fulfilled or rejected — is captured.
     * This is the correct choice because the order is already confirmed;
     * a notification failure must not cancel the order.
     */
    const [invoiceResult, shippingResult, emailResult, smsResult] =
      await Promise.allSettled([
        generateInvoice(savedOrder),
        allocateShipping(savedOrder),
        sendEmail(savedOrder),
        sendSMS(savedOrder)
      ]);

    /* Extract values or mark as failed for each post-order operation */
    const invoiceStatus  = invoiceResult.status  === "fulfilled" ? "Generated"  : "Failed";
    const shippingStatus = shippingResult.status === "fulfilled" ? "Allocated"  : "Failed";
    const emailStatus    = emailResult.status    === "fulfilled" ? "Sent"       : "Failed";
    const smsStatus      = smsResult.status      === "fulfilled" ? "Sent"       : "Failed";

    const trackingId         = shippingResult.value?.trackingId        || null;
    const estimatedDelivery  = shippingResult.value?.estimatedDelivery || null;
    const shippingPartner    = shippingResult.value?.partner            || "N/A";
    const invoiceNumber      = invoiceResult.value?.invoiceNumber       || null;

    /* Log post-order warnings */
    if (invoiceResult.status  === "rejected") console.warn("Invoice failed:", invoiceResult.reason?.message);
    if (shippingResult.status === "rejected") console.warn("Shipping failed:", shippingResult.reason?.message);
    if (emailResult.status    === "rejected") console.warn("Email failed:", emailResult.reason?.message);
    if (smsResult.status      === "rejected") console.warn("SMS failed:", smsResult.reason?.message);

    /* Decide overall post-order status for the progress badge */
    const allPostSucceeded =
      invoiceStatus === "Generated" &&
      shippingStatus === "Allocated" &&
      emailStatus === "Sent" &&
      smsStatus === "Sent";

    updateProgress(
      "post-order",
      allPostSucceeded ? "success" : "warning",
      allPostSucceeded ? "✔ All complete" : "⚠ Partial"
    );

    /* Summary object passed to updateOrder */
    const postOrderSummary = {
      invoiceStatus,
      shippingStatus,
      emailStatus,
      smsStatus,
      trackingId,
      estimatedDelivery,
      shippingPartner,
      invoiceNumber
    };


    /* ---- STEP 11: PATCH Order with Post-Order Results ---- */
    try {
      await updateOrder(savedOrder, postOrderSummary);
    } catch (patchError) {
      /* Non-fatal: the order is confirmed; only the metadata update failed */
      console.warn("Order status patch failed (non-fatal):", patchError.message);
    }


    /* ---- STEP 12: Display Final Confirmation ---- */
    const postOrderRows = [
      { label: "Invoice",  status: invoiceStatus,  detail: invoiceNumber || "—" },
      { label: "Shipping", status: shippingStatus, detail: shippingPartner },
      { label: "Email",    status: emailStatus,    detail: customer.email },
      { label: "SMS",      status: smsStatus,      detail: customer.mobile }
    ]
      .map(
        (row) =>
          `<div class="confirmation-row">
            <span>${row.label}</span>
            <span class="${row.status === "Generated" || row.status === "Allocated" || row.status === "Sent" ? "status-success" : "status-failed"}">
              ${row.status}
            </span>
            <span class="detail-text">${row.detail}</span>
          </div>`
      )
      .join("");

    const confirmationHTML = `
      <div class="confirmation-grid">
        <div class="confirmation-row header-row">
          <span>Order ID</span>
          <strong>${savedOrder.id}</strong>
        </div>
        <div class="confirmation-row">
          <span>Customer</span>
          <span>${customer.fullName}</span>
        </div>
        <div class="confirmation-row">
          <span>Items</span>
          <span>${state.cartItems.length} product(s)</span>
        </div>
        <div class="confirmation-row">
          <span>Total Paid</span>
          <strong>${formatCurrency(totals.total)}</strong>
        </div>
        <div class="confirmation-row">
          <span>Payment</span>
          <span>${paymentResult.paymentStatus} (${paymentResult.paymentMethod})</span>
        </div>
        <div class="confirmation-row">
          <span>Order Status</span>
          <span class="status-success">Confirmed ✔</span>
        </div>
        ${invoiceNumber ? `<div class="confirmation-row">
          <span>Invoice No.</span>
          <span>${invoiceNumber}</span>
        </div>` : ""}
        ${trackingId ? `<div class="confirmation-row">
          <span>Tracking ID</span>
          <span>${trackingId}</span>
        </div>` : ""}
        ${estimatedDelivery ? `<div class="confirmation-row">
          <span>Est. Delivery</span>
          <span>${estimatedDelivery}</span>
        </div>` : ""}
      </div>
      <hr style="margin:12px 0; border-color: var(--border);">
      <p style="font-weight:600; margin-bottom:8px;">Post-Order Services</p>
      <div class="post-order-results">${postOrderRows}</div>
      ${!allPostSucceeded ? '<p class="warning-note">⚠ Some post-order services encountered issues. Your order is confirmed and safe.</p>' : ""}
    `;

    displayResult(
      "success",
      allPostSucceeded ? "🎉 Order Placed Successfully!" : "✔ Order Confirmed (with warnings)",
      confirmationHTML
    );

  } catch (error) {
    /* ---- CATCH: Handle any checkout failure ---- */
    console.error("Checkout failed:", error);
    displayResult(
      "error",
      "Checkout Failed",
      `<p>${error.message}</p><p style="margin-top:8px; font-size:13px; color: var(--text-secondary);">
        Please fix the issue above and try placing your order again.
      </p>`
    );
  } finally {
    /* ---- FINALLY: Always runs — success OR failure ---- */
    cleanup();
  }
};


/* ============================================================
 * SECTION 20 – COUPON BUTTON (inline validation preview)
 * When the user clicks "Apply Coupon" before checkout,
 * we give immediate feedback without running checkout.
 * ============================================================ */

/**
 * handleApplyCoupon
 * Triggered when the Apply Coupon button is clicked.
 * Runs a standalone coupon validation using the current subtotal.
 * Sets state.selectedCoupon for use in calculateSummary().
 *
 * @returns {Promise<void>}
 */
const handleApplyCoupon = async () => {
  const code = dom.couponCode.value.trim();
  if (!code) {
    dom.couponMessage.textContent = "Please enter a coupon code first.";
    dom.couponMessage.style.color = "var(--warning)";
    return;
  }

  dom.couponMessage.textContent = "Validating coupon…";
  dom.couponMessage.style.color = "var(--text-secondary)";
  dom.applyCouponButton.disabled = true;

  try {
    const subtotal = state.cartItems.reduce(
      (s, i) => s + i.price * i.quantity, 0
    );
    const result = await validateCoupon(subtotal);

    if (result.coupon) {
      dom.couponMessage.textContent = `✔ Coupon applied: ${result.discountLabel} (saves ${formatCurrency(result.discount)})`;
      dom.couponMessage.style.color = "var(--success)";
      state.selectedCoupon = result.coupon;
      calculateSummary(); /* Refresh totals in the summary panel */
    } else {
      dom.couponMessage.textContent = "No coupon entered.";
      dom.couponMessage.style.color = "";
    }
  } catch (err) {
    state.selectedCoupon = null;
    dom.couponMessage.textContent = `✘ ${err.message}`;
    dom.couponMessage.style.color = "var(--danger)";
    calculateSummary();
  } finally {
    dom.applyCouponButton.disabled = false;
  }
};


/* ============================================================
 * SECTION 21 – INITIALISATION
 * Runs once when the DOM is ready.
 * Wires up all event listeners and renders the initial cart.
 * ============================================================ */

/**
 * init
 * Entry point for the application.
 * Called after the DOM has fully loaded.
 *
 * @returns {void}
 */
const init = () => {
  console.log(
    "%cPromiseCart Checkout — JavaScript Promises Case Study",
    "color: #4f46e5; font-size: 14px; font-weight: bold;"
  );

  /* Render the pre-populated demo cart */
  renderCart();

  /* Attach Place Order button */
  dom.placeOrderButton.addEventListener("click", startCheckout);

  /* Attach Apply Coupon button */
  dom.applyCouponButton.addEventListener("click", handleApplyCoupon);

  /* Clear result panel when failure stage changes, so the tester can re-run */
  dom.failureStage.addEventListener("change", () => {
    dom.checkoutResult.classList.add("hidden");
    dom.couponMessage.textContent = "Coupon validation will occur during checkout.";
    dom.couponMessage.style.color = "";
    state.selectedCoupon = null;
    resetProgress();
    calculateSummary();
  });

  /* Clear coupon state when code input is manually cleared */
  dom.couponCode.addEventListener("input", () => {
    if (!dom.couponCode.value.trim()) {
      state.selectedCoupon = null;
      dom.couponMessage.textContent = "Coupon validation will occur during checkout.";
      dom.couponMessage.style.color = "";
      calculateSummary();
    }
  });

  console.log("Application initialised. JSON Server must be running on port 3000.");
};

/* Start the application when the page has fully loaded */
document.addEventListener("DOMContentLoaded", init);
