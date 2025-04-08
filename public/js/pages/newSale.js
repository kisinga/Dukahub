import { DbService } from "/public/js/pb.js";

// --- Alpine Initialization ---
document.addEventListener("alpine:init", () => {
  console.log("Alpine initializing...");

  // --- Sale Store ---
  Alpine.store("sale", {
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
        const itemProduct = {
          ...product,
          name: product.name || "Unknown Item",
        };
        this.items.push({ product: itemProduct, quantity, price });
      }
      // No need to call calculateTotals - getters handle it
    },
    removeItem(productId) {
      this.items = this.items.filter((item) => item.product.id !== productId);
    },
    updateItemQuantity(productId, newQuantity) {
      const quantity = parseInt(newQuantity, 10);
      const item = this.items.find((i) => i.product.id === productId);
      if (item) {
        if (!isNaN(quantity) && quantity > 0) item.quantity = quantity;
        else this.removeItem(productId); // Remove if invalid/zero
      }
    },
    clearSale() {
      this.items = [];
    },
    getSaleDataForCheckout() {
      // Getters ensure totals are current
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
  });

  // --- Scanner Store ---
  // --- Scanner Store ---
  Alpine.store("scanner", {
    status: "idle",
    _errorMessage: "",
    isScanning: false,
    isInitialized: false,
    isConfigured: false,
    model: null,
    stream: null,
    detectionTimerId: null,
    config: {
      modelUrl: null,
      metadataUrl: null,
      confidenceThreshold: 0.9,
      detectionIntervalMs: 1200,
    },
    videoElement: null,
    predictions: [],

    // Computed Status Messages/Text (Getters remain the same)
    get message() {
      const messages = {
        /* ... messages ... */ idle: "Scanner inactive.",
        initializing: "Initializing scanner...",
        loading_model: "Loading detection model...",
        ready: "Scanner ready.",
        starting_camera: "Starting camera...",
        scanning: "Scanning for products...",
        stopping: "Stopping scanner...",
        stopped: "Scanner stopped.",
        verifying_detection: "Detected item, verifying...",
        product_found: "Product identified.",
        error: `Error: ${this._errorMessage || "Unknown scanner error."}`,
      };
      return messages[this.status] || "Scanner status unknown.";
    },
    get buttonText() {
      switch (this.status /* ... cases ... */) {
        case "error":
          return "Scanner Error";
        case "initializing":
        case "loading_model":
          return "Loading...";
        default:
          return this.isScanning ? "Stop Scanner" : "Start Scanner";
      }
    },

    // Methods
    initScanner(modelUrl, metadataUrl, videoEl) {
      console.log("Scanner Store: initScanner received videoEl:", videoEl); // Log what's passed in
      this.isConfigured = !!(modelUrl && metadataUrl);
      if (!this.isConfigured) {
        this.updateStatus("error", "Scanner disabled: Missing configuration.");
        return;
      }
      this.config.modelUrl = modelUrl;
      this.config.metadataUrl = metadataUrl;
      this.videoElement = videoEl;
      // Reset state if re-initializing
      this.isInitialized = false;
      this.model = null;
      this.updateStatus("idle"); // Ready to attempt start
    },

    // Renamed to emphasize it loads AND initializes the model instance
    async _loadAndInitializeModel() {
      // Don't reload if already initialized and model exists
      if (this.isInitialized && this.model) return true;

      this.updateStatus("loading_model");
      try {
        // --- Add TF Backend Check ---
        if (typeof tf === "undefined")
          throw new Error("TensorFlow.js (tf) not loaded.");
        // Try 'webgl', fallback to 'cpu' if needed/testing
        await tf.setBackend("webgl");
        await tf.ready();
        console.log(`TF.js backend ready: ${tf.getBackend()}`);
        // --- End Check ---

        if (typeof tmImage === "undefined")
          throw new Error("Teachable Machine library (tmImage) not loaded.");

        // --- Load the model ---
        const loadedModel = await tmImage.load(
          this.config.modelUrl,
          this.config.metadataUrl
        );
        // --- Check if loading returned a valid model ---
        if (!loadedModel) {
          throw new Error("tmImage.load() did not return a valid model.");
        }
        this.model = loadedModel; // Assign the successfully loaded model

        // --- Optional: Check model details AFTER successful load ---
        // let maxPredictions = this.model.getTotalClasses(); // Now safe to call
        // console.log(`Model loaded with ${maxPredictions} classes.`);

        this.isInitialized = true; // Mark as initialized *only* after success
        console.log("Scanner model loaded and initialized successfully.");
        // Don't change status here, let the calling function (start) do that
        return true; // Signal success
      } catch (error) {
        console.error(
          "Error loading/initializing Teachable Machine model:",
          error
        );
        this.model = null; // Ensure model is null on failure
        this.isInitialized = false;
        this.updateStatus(
          "error",
          `Failed to load detection model: ${error.message}`
        );
        return false; // Signal failure
      }
    },

    async start() {
      if (!this.isConfigured || this.isScanning) return;
      if (!this.isInitialized) {
        this.updateStatus("initializing");
        const modelReady = await this._loadAndInitializeModel();
        if (!modelReady) {
          console.error("Cannot start scanner: Model initialization failed.");
          return;
        }
      }
      if (!this.model) {
        console.error("Cannot start scanner: Model is not available.");
        this.updateStatus("error", "Model unavailable. Cannot start.");
        return;
      }

      this.updateStatus("starting_camera");
      try {
        if (!this.videoElement)
          throw new Error("Camera video element not found.");
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        this.videoElement.srcObject = this.stream;
        // Wait for metadata AND ensure it plays to potentially get dimensions
        await new Promise((resolve, reject) => {
          this.videoElement.onloadedmetadata = () => {
            this.videoElement.play().then(resolve).catch(reject); // Try playing after metadata loads
          };
          this.videoElement.onerror = reject;
        });

        this.predictions = [];
        // Clear any previous timer just in case
        if (this.detectionTimerId) clearInterval(this.detectionTimerId);
        this.detectionTimerId = setInterval(
          () => this._detectLoop(),
          this.config.detectionIntervalMs
        );
        this.isScanning = true;
        this.updateStatus("scanning");
      } catch (error) {
        console.error("Error starting camera:", error);
        this.updateStatus("error", `Could not access camera: ${error.message}`);
        this.stop();
      }
    },

    stop() {
      if (!this.isScanning && !this.stream && !this.detectionTimerId) return;
      const previousStatus = this.status;
      this.updateStatus("stopping");
      if (this.detectionTimerId) {
        clearInterval(this.detectionTimerId);
        this.detectionTimerId = null;
      }
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
      if (this.videoElement) {
        this.videoElement.srcObject = null;
        this.predictions = [];
      }
      this.isScanning = false;
      if (previousStatus === "error") {
        this.status = "error";
      } else {
        this.updateStatus(this.isInitialized ? "ready" : "idle");
      }
      console.log("Scanner stopped. Final status:", this.status);
    },

    toggle() {
      if (this.isScanning) this.stop();
      else this.start();
    },

    async _detectLoop() {
      // --- Log Entry and Core Objects ---
      // console.log("Scanner Store: _detectLoop Tick"); // Optional: uncomment for very verbose logging
      if (!this.model) {
        console.warn("Scanner Store: Model not loaded in _detectLoop");
        return;
      }
      if (!this.videoElement) {
        console.warn(
          "Scanner Store: VideoElement not available in _detectLoop"
        );
        return;
      }
      // --- End Log ---

      // --- Guard Clauses (Matching Original Structure) ---
      if (!this.isScanning || !this.videoElement.srcObject) {
        // console.log("Scanner Store: Not scanning or no srcObject"); // Optional
        return; // Not ready or stopped
      }

      // Check if video is playing and has dimensions (Matching Original Structure)
      if (
        this.videoElement.paused ||
        this.videoElement.ended ||
        !this.videoElement.videoWidth ||
        this.videoElement.readyState < 3
      ) {
        // console.log("Scanner Store: Video not ready for prediction.", `Paused: ${this.videoElement.paused}, Ended: ${this.videoElement.ended}, Width: ${this.videoElement.videoWidth}, ReadyState: ${this.videoElement.readyState}`); // Optional
        return;
      }
      // --- End Guard Clauses ---

      try {
        // --- Log State Immediately Before Predict ---

        // --- End Log ---
        const rawModel = Alpine.raw(this.model);
        if (!rawModel) {
          console.error(
            "Scanner Store: Could not get raw model object from proxy."
          );
          return;
        }
        // --- Predict Call (Using this.videoElement) ---
        const predictions = await rawModel.predict(this.videoElement);
        console.log(
          "Scanner Store: Prediction successful, result:",
          predictions
        );

        // --- Update Store State (Alpine way for display) ---
        this.predictions = predictions;

        // --- Find Best Prediction (Matching Original Logic - using loop for clarity) ---
        let bestPrediction = null;
        let maxConfidence = 0;

        if (predictions && predictions.length > 0) {
          for (const prediction of predictions) {
            if (prediction.probability > maxConfidence) {
              maxConfidence = prediction.probability;
              bestPrediction = prediction;
            }
          }
          // console.log("Scanner Store: Best prediction found:", bestPrediction); // Optional log
        } else {
          console.log("Scanner Store: No predictions returned from model.");
        }
        // --- End Find Best Prediction ---

        // --- Check Confidence Threshold (Matching Original Logic) ---
        if (
          bestPrediction &&
          maxConfidence >= this.config.confidenceThreshold
        ) {
          console.log(
            `Scanner Store: Potential detection above threshold: ${bestPrediction.className} (${maxConfidence})`
          );

          this.stop(); // Stop camera and detection loop
          // Pass only className to match current _handleDetection signature.
          await this._handleDetection(bestPrediction.className);
          // --- End Action on Detection ---
        } else {
          if (bestPrediction) {
            console.log(
              `Scanner Store: Best prediction below threshold: ${bestPrediction.className} (${maxConfidence})`
            );
          }
        }
        // --- End Check Confidence ---
      } catch (error) {
        // --- Error Handling (Matching Original Logic) ---
        console.error("Error during prediction:", error); // Log the specific error

        this.updateStatus("error", "Prediction failed."); // Optionally update status
        this.stop();
      }
    },

    toggle() {
      if (this.isScanning) this.stop();
      else this.start();
    },

    async _handleDetection(detectedLabel) {
      this.updateStatus("verifying_detection");
      try {
        const product = await DbService.getOne("products", detectedLabel);
        // Status is implicitly updated by modal opening / subsequent actions
        Alpine.store("modal").open(product);
      } catch (error) {
        console.error(`Error fetching product "${detectedLabel}":`, error);
        const message =
          error.status === 404
            ? `Item "${detectedLabel}" not found.`
            : `Error verifying item "${detectedLabel}".`;
        this.updateStatus("error", message);
        // Scanner is already stopped
      }
    },

    // Simplified status update (remains the same)
    updateStatus(newStatus, specificErrorMessage = "") {
      this.status = newStatus;
      if (newStatus === "error") {
        this._errorMessage = specificErrorMessage || "Unknown scanner error.";
      } else {
        this._errorMessage = "";
      }
    },

    // Simplified status update
    updateStatus(newStatus, specificErrorMessage = "") {
      this.status = newStatus;
      // Update error message only if the new status is 'error'
      if (newStatus === "error") {
        this._errorMessage = specificErrorMessage || "Unknown scanner error."; // Provide default
      } else {
        // Clear specific error message when status is not 'error'
        // This prevents stale error messages from showing in the 'message' getter
        this._errorMessage = "";
      }
      // Note: isScanning is now primarily managed in start/stop
      // console.log("Scanner status updated:", this.status, "Message:", this.message); // Debug log
    },
  });

  // --- Modal Store ---
  Alpine.store("modal", {
    isOpen: false,
    product: null,
    quantity: 1,
    price: 0.0,
    selectedSkuId: "",
    errorMessage: "",
    _modalInstance: null,

    // Getters
    get hasVariations() {
      const skus = this.product?.variants || this.product?.skus;
      return skus && Array.isArray(skus) && skus.length > 0;
    },
    get lineTotal() {
      return (this.quantity || 0) * (this.price || 0);
    },
    get isValidToAdd() {
      if (!this.product || this.quantity < 1 || this.price < 0) return false;
      if (this.hasVariations && !this.selectedSkuId) return false;
      return true;
    },

    // Methods
    initModal(modalElement) {
      if (modalElement) this._modalInstance = new bootstrap.Modal(modalElement);
      else console.error("Scan modal element not found for initialization.");
    },
    open(productData) {
      if (!this._modalInstance) return;
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
      const newVal = this.quantity + amount;
      if (newVal >= 1) this.quantity = newVal;
    },
    getSkuPrice(skuId) {
      // Helper kept for clarity in updatePriceFromSku
      if (!this.product || !skuId) return this.product?.price ?? 0;
      const skus = this.product.variants || this.product.skus;
      const selectedSkuData = skus?.find((sku) => sku.id === skuId);
      return selectedSkuData?.price ?? this.product.price ?? 0;
    },
    updatePriceFromSku(selectedSkuId) {
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
        if (this.quantity < 1)
          this.errorMessage = "Quantity must be at least 1.";
        else if (this.price < 0)
          this.errorMessage = "Price cannot be negative.";
        else if (this.hasVariations && !this.selectedSkuId)
          this.errorMessage = "Please select a product variation.";
        else this.errorMessage = "Cannot add item. Please check details.";
        return;
      }
      try {
        // Prepare item data (slightly condensed)
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
        // Add to sale using current modal price
        Alpine.store("sale").addItem(
          itemProductData,
          this.quantity,
          this.price
        );
        this.close();
        // Restart scanner if requested
        if (keepScanning) {
          const scanner = Alpine.store("scanner");
          if (scanner.isConfigured && !scanner.isScanning) {
            setTimeout(() => scanner.start(), 100);
          }
        }
      } catch (e) {
        console.error("Error adding item from modal:", e);
        this.errorMessage = `Error: ${e.message || "Could not add product."}`;
      }
    },
  });

  // --- Register Component Data ---
  Alpine.data("newSale", newSaleComponentLogic); // Use the function defined below

  console.log("Alpine stores and newSale component registered.");
});

// --- Component Logic Function ---
// (This function defines the object returned for x-data="newSale()")
function newSaleComponentLogic() {
  return {
    initialized: false, // Add this flag
    // Component State
    companyId: null,
    modelInfo: null,
    searchTerm: "",
    searchResults: [],
    isSearching: false,
    checkoutStatus: { message: "", type: "" }, // type: 'text-success', 'text-danger', etc.
    isCheckingOut: false,

    // Initialization (called by x-init in the template)
    init() {
      if (this.initialized) {
        console.warn("Duplicate init() call detected. Skipping.");
        return;
      }
      this.initialized = true;

      console.log("Initializing NewSale Alpine component...");
      this.loadPageData();

      // Initialize stores that need DOM elements passed from refs
      // Assumes stores are registered by alpine:init before this runs
      Alpine.store("scanner")?.initScanner(
        this.modelInfo?.model,
        this.modelInfo?.metadata,
        this.$refs.cameraView
      );
      Alpine.store("modal")?.initModal(this.$refs.scanModal);

      if (!this.companyId) {
        console.warn("Company ID missing. Search disabled.");
      }
    },

    loadPageData() {
      try {
        const dataElement = document.getElementById("page-data");
        if (!dataElement) throw new Error("Page data script tag not found.");
        const data = JSON.parse(dataElement.textContent);
        this.companyId = data.companyId;
        this.modelInfo = data.modelInfo;
      } catch (error) {
        console.error("Failed to read or parse page data:", error);
        alert(
          "Error loading page configuration. Functionality may be limited."
        );
        this.companyId = null;
        this.modelInfo = null;
      }
    },

    // Search Methods
    async searchProducts() {
      if (!this.companyId || this.searchTerm.trim().length < 2) {
        this.searchResults = [];
        this.isSearching = false;
        return;
      }
      this.isSearching = true;
      this.searchResults = [];
      try {
        const term = this.searchTerm.trim().replace(/'/g, "''");
        const filter = `(name ~ '${term}' || code ~ '${term}') && company = '${this.companyId}'`;
        const products = await DbService.getList("products", {
          filter,
          sort: "name",
          perPage: 10,
        });
        this.searchResults =
          products.length === 0
            ? [{ id: "not_found", name: "No products found." }]
            : products;
      } catch (error) {
        console.error("Product search failed:", error);
        this.searchResults = [{ id: "error", name: "Search failed." }];
      } finally {
        this.isSearching = false;
      }
    },
    handleSearchResultClick(product) {
      Alpine.store("sale").addItem(product, 1, product.price ?? 0);
      this.searchTerm = "";
      this.searchResults = [];
    },

    // Checkout Method
    async checkout() {
      const saleStore = Alpine.store("sale");
      if (saleStore.items.length === 0 || this.isCheckingOut) return;
      const saleData = saleStore.getSaleDataForCheckout();
      this.isCheckingOut = true;
      this.checkoutStatus = {
        message: "Processing sale...",
        type: "text-info",
      };
      try {
        const response = await fetch("/api/sales", {
          // Your endpoint
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(saleData),
        });
        if (!response.ok) {
          let errorMsg = `HTTP error ${response.status}`;
          try {
            errorMsg = (await response.json()).message || errorMsg;
          } catch (e) {
            /* Ignore */
          }
          throw new Error(errorMsg);
        }
        const result = await response.json();
        this.checkoutStatus = {
          message: `Sale completed! (ID: ${result.saleId || "N/A"})`,
          type: "text-success",
        };
        saleStore.clearSale();
        setTimeout(
          () => (this.checkoutStatus = { message: "", type: "" }),
          5000
        );
      } catch (error) {
        console.error("Checkout failed:", error);
        this.checkoutStatus = {
          message: `Checkout failed: ${error.message}.`,
          type: "text-danger",
        };
      } finally {
        this.isCheckingOut = false;
      }
    },
  };
}

// Optional: Make DbService global if needed elsewhere
// window.DbService = DbService;
