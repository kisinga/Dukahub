// Sale Store: Manages items in the current sale and totals
const saleStoreLogic = {
  items: [],
  taxRate: 0,

  // Computed properties using getters
  get subtotal() {
    return this.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  },
  get tax() {
    // Calculate tax for each item based on its stored rate and sum them up
    return this.items.reduce((sum, item) => {
      // --- Safeguard against NaN quantity or price ---
      const quantity = isNaN(item.quantity) ? 0 : item.quantity;
      const price = isNaN(item.price) ? 0 : item.price;
      const lineSubtotal = quantity * price;
      // --- End Safeguard ---

      // Use item's tax rate, fallback to default (0) if null/undefined/NaN
      // Added isNaN check here too for extra safety, though addItem should prevent it
      const itemTaxRate =
        typeof item.taxRate === 'number' && !isNaN(item.taxRate)
          ? item.taxRate
          : this.defaultTaxRate;
      const itemTax = lineSubtotal * itemTaxRate;

      // --- Ensure itemTax is not NaN before adding ---
      return sum + (isNaN(itemTax) ? 0 : itemTax);
      // --- End Ensure ---
    }, 0);
  },
  get total() {
    return this.subtotal + this.tax;
  },
  get itemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  },

  // Methods
  addItem(product, quantity, price) {
    if (!product?.id || quantity <= 0 || price < 0) {
      console.error('SaleStore: Invalid item data received', {
        product,
        quantity,
        price,
      });
      return;
    }
    console.log('SaleStore: Adding item:', Alpine.raw(product), quantity, price);

    // --- Determine and store item-specific tax rate ---
    // Use product.taxRate if it's a number, otherwise use defaultTaxRate
    const itemTaxRate = typeof product.taxRate === 'number' ? product.taxRate : this.defaultTaxRate; // defaultTaxRate is now 0
    console.log(`Using tax rate for ${product.name}: ${itemTaxRate}`);

    // --- End Determine tax rate ---

    // Unique key might need refinement if price varies for SAME product+SKU combo later
    const uniqueItemId = product.selectedSkuId
      ? `${product.id}-${product.selectedSkuId}`
      : product.id;
    // Find existing based on product ID AND potentially selected SKU ID AND price
    const existingItem = this.items.find(
      i =>
        i.product.id === product.id &&
        i.product.selectedSkuId === product.selectedSkuId && // Match SKU ID (or undefined vs undefined)
        i.price === price
      // Note: We don't check taxRate here; if the same item is added again,
      // we assume the tax rate from the *first* add applies, or we could update it.
      // For simplicity, let's keep the rate from the first time it was added.
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.items.push({
        product: { ...product },
        quantity,
        price,
        taxRate: itemTaxRate, // Store the determined tax rate (could be 0)
      });
    }
  },
  removeItem(productId, selectedSkuId = null, price = null) {
    // Added params for unique removal
    // Filter based on a unique combination
    this.items = this.items.filter(
      item =>
        !(
          item.product.id === productId &&
          item.product.selectedSkuId === selectedSkuId && // Compare SKU IDs
          item.price === price
        ) // Compare price
    );
  },
  updateItemQuantity(productId, newQuantity, selectedSkuId = null, price = null) {
    // Added params
    const quantity = parseInt(newQuantity, 10);
    // Find based on unique combination
    const item = this.items.find(
      i =>
        i.product.id === productId && i.product.selectedSkuId === selectedSkuId && i.price === price
    );
    if (item) {
      if (!isNaN(quantity) && quantity > 0) {
        item.quantity = quantity;
      } else {
        // Remove item if quantity is invalid or zero
        this.removeItem(productId, selectedSkuId, price);
      }
    }
  },
  clearSale() {
    this.items = [];
  },
  getSaleDataForCheckout() {
    // Getters ensure totals are current
    return {
      items: this.items.map(item => {
        const lineSubtotal = item.quantity * item.price;
        // Use item's stored tax rate, fallback to default if somehow missing (shouldn't happen)
        const itemTaxRate = item.taxRate != null ? item.taxRate : this.defaultTaxRate;
        const itemTax = lineSubtotal * itemTaxRate;
        return {
          productId: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: item.price,
          lineTotal: lineSubtotal, // Line total before tax
          taxRate: itemTaxRate, // The specific rate applied to this item
          taxAmount: itemTax, // The calculated tax amount for this line item
          selectedSkuId: item.product.selectedSkuId || null,
          selectedSkuName: item.product.selectedSkuName || null, // Include SKU name if available
        };
      }),
      subtotal: this.subtotal, // Overall subtotal (sum of lineTotals before tax)
      tax: this.tax, // Overall tax (sum of itemTax amounts)
      total: this.total, // Overall total (subtotal + tax)
      itemCount: this.itemCount,
      timestamp: new Date().toISOString(),
      // Removed global taxRate
    };
  },
};

// Export the logic object
export default saleStoreLogic;
