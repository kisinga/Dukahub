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
    // --- Access expanded SKUs ---
    const skus = this.product?.expand?.skus;
    // --- End Access ---
    return skus && Array.isArray(skus) && skus.length > 0;
  },
  get lineTotal() {
    /* ... copy getter ... */
    return (this.quantity || 0) * (this.price || 0);
  },
  get isValidToAdd() {
    // --- Add isNaN checks ---
    if (
      !this.product ||
      isNaN(this.quantity) ||
      this.quantity < 1 ||
      isNaN(this.price) ||
      this.price < 0
    ) {
      return false;
    }
    // --- End Add isNaN checks ---
    if (this.hasVariations && !this.selectedSkuId) {
      return false; // SKU required but not selected
    }
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
    this.product = productData; // Product data now includes expand.skus
    this.quantity = 1;
    this.price = productData.price ?? 0.01; // Base price initially
    this.selectedSkuId = "";
    if (this.hasVariations) {
      // Use the getter to check if SKUs are present
      const skus = this.product.expand?.skus;
      // Check if the array exists, has items, and the first item has an ID
      if (skus && skus.length > 0 && skus[0] && skus[0].id) {
        const firstSkuId = skus[0].id;
        console.log(
          `Pre-selecting first SKU: ID=${firstSkuId}, Name=${
            skus[0].name || firstSkuId
          }`
        );
        this.selectedSkuId = firstSkuId; // Set the selectedSkuId store property
        this.updatePriceFromSku(firstSkuId); // Update the price based on this selection
      } else {
        console.warn(
          "Product has variations array, but first SKU is invalid or missing ID.",
          skus
        );
        // Optionally set an error message if selection is mandatory but first is invalid
        // this.errorMessage = "Could not automatically select a variation.";
      }
    }
    this.isOpen = true;
    this._modalInstance.show();
    console.log("Modal opened with product:", Alpine.raw(this.product)); // Log raw product data
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
    if (!this.product || !skuId) return this.product?.price ?? 0;
    const skus = this.product.expand?.skus;
    const selectedSkuData = skus?.find((sku) => sku.id === skuId);
    // get the related price from the inventory
    const inventory = this.product?.inventory;
    console.log(
      "Selected SKU data:",
      selectedSkuData,
      "Inventory:",
      inventory,
      "SKU ID:",
      skuId
    );
    if (inventory && inventory.length > 0) {
      //  loop through the inventory to find the related sku
      for (const item of inventory) {
        if (item.sku === skuId) {
          return item.retail_price ?? 0;
        }
      }
    }
    return selectedSkuData?.price ?? 0;
  },

  updatePriceFromSku(selectedSkuId) {
    this.errorMessage = "";
    if (selectedSkuId) {
      this.price = this.getSkuPrice(selectedSkuId);
    } else {
      this.price = this.product?.price ?? 0.01;
      this.errorMessage = "Please select a product variation.";
    }
  },
  addItemToSale(keepScanning = false) {
    this.errorMessage = "";
    if (!this.isValidToAdd) {
      if (isNaN(this.quantity) || this.quantity < 1)
        this.errorMessage = "Quantity must be a valid number (at least 1).";
      else if (isNaN(this.price) || this.price < 0)
        this.errorMessage = "Price must be a valid number (0 or more).";
      else if (this.hasVariations && !this.selectedSkuId)
        this.errorMessage = "Please select a product variation.";
      else this.errorMessage = "Cannot add item. Please check details.";
      return;
    }
    try {
      // --- Prepare item data using expanded SKUs ---
      let itemProductData = { ...Alpine.raw(this.product) }; // Use raw product data
      // Remove expand property before adding to sale items if not needed downstream
      delete itemProductData.expand;
      let itemNameToAdd = this.product.name;
      let selectedSkuName = null; // Store selected SKU name

      if (this.hasVariations && this.selectedSkuId) {
        const skus = this.product.expand?.skus; // Access expanded SKUs
        const selectedSkuData = skus?.find(
          (sku) => sku.id === this.selectedSkuId
        );
        if (selectedSkuData) {
          selectedSkuName = selectedSkuData.name || this.selectedSkuId; // Get SKU name
          itemNameToAdd = `${this.product.name} - ${selectedSkuName}`;
          itemProductData.selectedSkuId = this.selectedSkuId; // Keep SKU ID
          // --- Store selected SKU name on the item data ---
          itemProductData.selectedSkuName = selectedSkuName;
          // --- End Store SKU name ---
        }
      }
      itemProductData.name = itemNameToAdd; // Update name for display

      console.log(
        "Adding item from modal:",
        itemProductData,
        "Qty:",
        this.quantity,
        "Price:",
        this.price
      );

      // Add to sale using current modal price
      Alpine.store("sale").addItem(itemProductData, this.quantity, this.price);
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
