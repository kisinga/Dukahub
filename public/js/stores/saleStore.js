// Sale Store: Manages items in the current sale and totals
const saleStoreLogic = {
  items: [],
  taxRate: 0.1,

  // Computed properties using getters
  get subtotal() {
    return this.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );
  },
  get tax() {
    return this.subtotal * this.taxRate;
  },
  get total() {
    return this.subtotal + this.tax;
  },
  get itemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  },

  // Methods
  addItem(product, quantity, price) {
    if (!product?.id || quantity <= 0 || price < 0) return;
    const existingItem = this.items.find(
      (i) => i.product.id === product.id && i.price === price
    );
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      const itemProduct = { ...product, name: product.name || "Unknown Item" };
      this.items.push({ product: itemProduct, quantity, price });
    }
  },
  removeItem(productId) {
    this.items = this.items.filter((item) => item.product.id !== productId);
  },
  updateItemQuantity(productId, newQuantity) {
    const quantity = parseInt(newQuantity, 10);
    const item = this.items.find((i) => i.product.id === productId);
    if (item) {
      if (!isNaN(quantity) && quantity > 0) item.quantity = quantity;
      else this.removeItem(productId);
    }
  },
  clearSale() {
    this.items = [];
  },
  getSaleDataForCheckout() {
    return {
      items: this.items.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.price,
        lineTotal: item.quantity * item.price,
        selectedSkuId: item.product.selectedSkuId || null,
      })),
      subtotal: this.subtotal,
      tax: this.tax,
      total: this.total,
      taxRate: this.taxRate,
      itemCount: this.itemCount,
      timestamp: new Date().toISOString(),
    };
  },
};

// Export the logic object
export default saleStoreLogic;
