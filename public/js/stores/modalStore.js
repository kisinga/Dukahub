// Note: This store relies on the global 'Alpine' and 'bootstrap'
// It also calls methods on the globally registered 'sale' and 'scanner' stores.

const modalStoreLogic = {
  // --- State Properties ---
  isOpen: false,
  product: null,
  quantity: 1,
  price: 0.0,
  selectedSkuId: "",
  errorMessage: "",
  _modalInstance: null, // Bootstrap modal instance

  // --- Getters ---
  get hasVariations() {
    /* ... copy getter ... */
    const skus = this.product?.variants || this.product?.skus;
    return skus && Array.isArray(skus) && skus.length > 0;
  },
  get lineTotal() {
    /* ... copy getter ... */
    return (this.quantity || 0) * (this.price || 0);
  },
  get isValidToAdd() {
    /* ... copy getter ... */
    if (!this.product || this.quantity < 1 || this.price < 0) return false;
    if (this.hasVariations && !this.selectedSkuId) return false;
    return true;
  },

  // --- Methods ---
  initModal(modalElement) {
    if (modalElement && typeof bootstrap !== "undefined") {
      // Check bootstrap exists
      this._modalInstance = new bootstrap.Modal(modalElement);
    } else if (!modalElement) {
      console.error(
        "Modal Store: Scan modal element not found for initialization."
      );
    } else {
      console.error("Modal Store: Bootstrap not found for initialization.");
    }
  },
  open(productData) {
    if (!this._modalInstance) {
      console.error("Modal Store: Cannot open, instance not initialized.");
      return;
    }
    this.reset();
    this.product = productData;
    this.quantity = 1;
    this.price = productData.price ?? 0.01;
    this.selectedSkuId = "";
    this.isOpen = true;
    this._modalInstance.show();
  },
  close() {
    if (this._modalInstance) this._modalInstance.hide();
  },
  reset() {
    this.isOpen = false;
    this.product = null;
    this.quantity = 1;
    this.price = 0.0;
    this.selectedSkuId = "";
    this.errorMessage = "";
    console.log("Modal store reset");
  },
  adjustQuantity(amount) {
    /* ... copy method ... */
    const newVal = this.quantity + amount;
    if (newVal >= 1) this.quantity = newVal;
  },
  getSkuPrice(skuId) {
    /* ... copy method ... */
    if (!this.product || !skuId) return this.product?.price ?? 0;
    const skus = this.product.variants || this.product.skus;
    const selectedSkuData = skus?.find((sku) => sku.id === skuId);
    return selectedSkuData?.price ?? this.product.price ?? 0;
  },
  updatePriceFromSku(selectedSkuId) {
    /* ... copy method ... */
    this.errorMessage = "";
    if (selectedSkuId) this.price = this.getSkuPrice(selectedSkuId);
    else {
      this.price = this.product?.price ?? 0.01;
      this.errorMessage = "Please select a product variation.";
    }
  },
  addItemToSale(keepScanning = false) {
    this.errorMessage = "";
    if (!this.isValidToAdd) {
      /* ... copy validation error message logic ... */
      if (this.quantity < 1) this.errorMessage = "Quantity must be at least 1.";
      else if (this.price < 0) this.errorMessage = "Price cannot be negative.";
      else if (this.hasVariations && !this.selectedSkuId)
        this.errorMessage = "Please select a product variation.";
      else this.errorMessage = "Cannot add item. Please check details.";
      return;
    }
    try {
      /* ... copy try/catch block from previous addItemToSale ... */
      let itemProductData = { ...this.product };
      if (this.hasVariations && this.selectedSkuId) {
        const skus = this.product.variants || this.product.skus;
        const selectedSkuData = skus.find(
          (sku) => sku.id === this.selectedSkuId
        );
        itemProductData.name = `${this.product.name} - ${
          selectedSkuData?.name || this.selectedSkuId
        }`;
        itemProductData.selectedSkuId = this.selectedSkuId;
      }
      Alpine.store("sale").addItem(itemProductData, this.quantity, this.price); // Call sale store
      this.close();
      if (keepScanning) {
        const scanner = Alpine.store("scanner"); // Call scanner store
        if (scanner?.isConfigured && !scanner?.isScanning) {
          setTimeout(() => scanner.start(), 100);
        }
      }
    } catch (e) {
      /* ... copy error handling ... */
      console.error("Error adding item from modal:", e);
      this.errorMessage = `Error: ${e.message || "Could not add product."}`;
    }
  },
};

export default modalStoreLogic;
