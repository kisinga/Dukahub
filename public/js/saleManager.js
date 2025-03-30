/**
 * Manages the state of the current sale (items, totals) and updates the UI table.
 */
class SaleManager {
  constructor(config) {
    this.config = {
      tableBodySelector: config.tableBodySelector || "#sale-items",
      noItemsRowSelector: config.noItemsRowSelector || "#no-items-row",
      itemCountSelector: config.itemCountSelector || "#item-count",
      subtotalSelector: config.subtotalSelector || "#subtotal",
      taxSelector: config.taxSelector || "#tax",
      totalSelector: config.totalSelector || "#total",
      checkoutButtonSelector: config.checkoutButtonSelector || "#checkout-btn",
      taxRate: config.taxRate || 0.1, // 10%
      currencyFormat:
        config.currencyFormat ||
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "Ksh",
        }),
    };

    this.elements = {
      tableBody: document.querySelector(this.config.tableBodySelector),
      noItemsRow: document.querySelector(this.config.noItemsRowSelector),
      itemCount: document.querySelector(this.config.itemCountSelector),
      subtotal: document.querySelector(this.config.subtotalSelector),
      tax: document.querySelector(this.config.taxSelector),
      total: document.querySelector(this.config.totalSelector),
      checkoutButton: document.querySelector(
        this.config.checkoutButtonSelector
      ),
    };

    this.items = []; // Array to hold { product: {...}, quantity: N, price: M }

    if (!this.elements.tableBody) {
      console.error("SaleManager: Table body element not found!");
    }

    this._bindEvents();
    this.renderTable(); // Initial render (shows "No items")
  }

  _bindEvents() {
    // Use event delegation for dynamically added elements
    this.elements.tableBody?.addEventListener("click", (event) => {
      const removeButton = event.target.closest(".remove-item-btn");
      if (removeButton) {
        const productId = removeButton.dataset.productId;
        this.removeItem(productId);
      }
    });

    this.elements.tableBody?.addEventListener("change", (event) => {
      const quantityInput = event.target.closest(".quantity-input");
      if (quantityInput) {
        const productId = quantityInput.dataset.productId;
        const newQuantity = parseInt(quantityInput.value, 10);
        // Find the current price from the item data (don't rely on DOM)
        const item = this.items.find((i) => i.product.id === productId);
        if (item) {
          this.updateItem(productId, newQuantity, item.price); // Keep original price
        }
      }
    });
  }

  /**
   * Adds a product to the sale or increments its quantity.
   * @param {object} product - The product object (must have id, name, price)
   * @param {number} quantity - The quantity to add.
   * @param {number} price - The unit price to use for this item.
   */
  addItem(product, quantity = 1, price) {
    if (
      !product ||
      !product.id ||
      typeof quantity !== "number" ||
      quantity <= 0
    ) {
      console.error("SaleManager: Invalid data for addItem", {
        product,
        quantity,
        price,
      });
      return;
    }

    const unitPrice = typeof price === "number" ? price : product.price; // Use provided price or product default
    const existingItem = this.items.find(
      (item) => item.product.id === product.id && item.price === unitPrice
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.items.push({
        product: { ...product }, // Store a copy
        quantity: quantity,
        price: unitPrice,
      });
    }
    this.renderTable();
  }

  /**
   * Removes an item completely from the sale.
   * @param {string} productId - The ID of the product to remove.
   */
  removeItem(productId) {
    this.items = this.items.filter((item) => item.product.id !== productId);
    this.renderTable();
  }

  /**
   * Updates the quantity or price of an existing item.
   * @param {string} productId - The ID of the product to update.
   * @param {number} newQuantity - The new quantity.
   * @param {number} newPrice - The new unit price.
   */
  updateItem(productId, newQuantity, newPrice) {
    const item = this.items.find((i) => i.product.id === productId);
    if (item) {
      if (newQuantity > 0) {
        item.quantity = newQuantity;
        item.price = newPrice; // Allow price updates if needed
      } else {
        // If quantity becomes 0 or less, remove the item
        this.removeItem(productId);
        return; // Avoid re-rendering twice
      }
    }
    this.renderTable(); // Re-render to reflect changes
  }

  /**
   * Clears all items from the sale.
   */
  clearSale() {
    this.items = [];
    this.renderTable();
  }

  /**
   * Renders the items array into the sales table body.
   */
  renderTable() {
    if (!this.elements.tableBody) return;

    // Clear current content
    this.elements.tableBody.innerHTML = "";

    if (this.items.length === 0) {
      if (this.elements.noItemsRow) {
        this.elements.tableBody.appendChild(
          this.elements.noItemsRow.cloneNode(true)
        );
      }
    } else {
      this.items.forEach((item) => {
        const row = document.createElement("tr");
        const lineTotal = item.quantity * item.price;
        row.dataset.productId = item.product.id; // Add for potential future use

        row.innerHTML = `
            <td>${item.product.name || "N/A"}</td>
            <td class="text-end">${this.config.currencyFormat.format(
              item.price
            )}</td>
            <td class="text-center">
              <input
                type="number"
                class="form-control form-control-sm quantity-input text-center mx-auto"
                value="${item.quantity}"
                min="1"
                step="1"
                data-product-id="${item.product.id}"
                style="max-width: 80px;"
                aria-label="Quantity for ${item.product.name}"
              />
            </td>
            <td class="text-end fw-medium">${this.config.currencyFormat.format(
              lineTotal
            )}</td>
            <td class="text-center">
              <button
                class="btn btn-sm btn-outline-danger remove-item-btn border-0"
                data-product-id="${item.product.id}"
                title="Remove ${item.product.name}"
              >
                <i class="bi bi-trash"></i>
              </button>
            </td>
          `;
        this.elements.tableBody.appendChild(row);
      });
    }
    this._updateTotals();
  }

  /**
   * Calculates and updates the total fields (subtotal, tax, total).
   * @private
   */
  _updateTotals() {
    let subTotal = 0;
    this.items.forEach((item) => {
      subTotal += item.quantity * item.price;
    });

    const taxAmount = subTotal * this.config.taxRate;
    const totalAmount = subTotal + taxAmount;

    if (this.elements.itemCount) {
      this.elements.itemCount.textContent = this.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      ); // Sum of quantities
    }
    if (this.elements.subtotal) {
      this.elements.subtotal.textContent =
        this.config.currencyFormat.format(subTotal);
    }
    if (this.elements.tax) {
      this.elements.tax.textContent =
        this.config.currencyFormat.format(taxAmount);
    }
    if (this.elements.total) {
      this.elements.total.textContent =
        this.config.currencyFormat.format(totalAmount);
    }
    if (this.elements.checkoutButton) {
      this.elements.checkoutButton.disabled = this.items.length === 0;
    }
  }

  /**
   * Returns the current sale data suitable for sending to a server.
   * @returns {object} Sale data including items and totals.
   */
  getSaleData() {
    let subTotal = 0;
    this.items.forEach((item) => {
      subTotal += item.quantity * item.price;
    });
    const taxAmount = subTotal * this.config.taxRate;
    const totalAmount = subTotal + taxAmount;

    return {
      items: this.items.map((item) => ({
        productId: item.product.id,
        name: item.product.name, // Include name for reference on backend
        quantity: item.quantity,
        unitPrice: item.price,
        lineTotal: item.quantity * item.price,
      })),
      subtotal: subTotal,
      tax: taxAmount,
      total: totalAmount,
      taxRate: this.config.taxRate,
      itemCount: this.items.reduce((sum, item) => sum + item.quantity, 0),
      timestamp: new Date().toISOString(),
    };
  }
}

export { SaleManager }; // Export the class
