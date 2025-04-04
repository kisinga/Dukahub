import { DbService } from "/public/js/pb.js";

// --- Utilities ---
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// --- SaleManager Class (Simplified) ---
class SaleManager {
  constructor(uiElements, config) {
    this.ui = uiElements; // Use shared UI elements cache
    this.config = {
      taxRate: config.taxRate || 0.1, // Default 10%
    };
    this.items = []; // Array of { product: {...}, quantity: N, price: M }

    this._bindTableEvents();
    this.renderTable(); // Initial render
  }

  _bindTableEvents() {
    this.ui.saleItemsTableBody?.addEventListener("click", (event) => {
      const removeButton = event.target.closest(".remove-item-btn");
      if (removeButton) {
        const productId = removeButton.dataset.productId;
        this.removeItem(productId);
      }
    });

    this.ui.saleItemsTableBody?.addEventListener("change", (event) => {
      const quantityInput = event.target.closest(".quantity-input");
      if (quantityInput) {
        const productId = quantityInput.dataset.productId;
        const newQuantity = parseInt(quantityInput.value, 10);
        const item = this.items.find((i) => i.product.id === productId);
        if (item) {
          this.updateItem(productId, newQuantity, item.price); // Keep original price on quantity change
        }
      }
    });
  }

  addItem(product, quantity = 1, price) {
    if (!product?.id || typeof quantity !== "number" || quantity <= 0) {
      console.error("SaleManager: Invalid data for addItem", {
        product,
        quantity,
        price,
      });
      return;
    }

    const unitPrice = typeof price === "number" ? price : product.price ?? 0;
    // Use product.id AND unitPrice to differentiate items (e.g., same product added via modal with different price)
    // If SKU is selected, product.id might include SKU identifier or be different. Assume product.id is unique identifier for the line item.
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

  removeItem(productId) {
    this.items = this.items.filter((item) => item.product.id !== productId);
    this.renderTable();
  }

  updateItem(productId, newQuantity, newPrice) {
    const item = this.items.find((i) => i.product.id === productId);
    if (item) {
      if (newQuantity > 0) {
        item.quantity = newQuantity;
        item.price = newPrice; // Allow price updates
      } else {
        this.removeItem(productId); // Remove if quantity is zero or less
        return;
      }
    }
    this.renderTable();
  }

  clearSale() {
    this.items = [];
    this.renderTable();
  }

  renderTable() {
    if (!this.ui.saleItemsTableBody) return;

    this.ui.saleItemsTableBody.innerHTML = ""; // Clear current content

    if (this.items.length === 0) {
      if (this.ui.noItemsRow) {
        // Show the "No items" row template content
        const template = document.getElementById("no-items-row-template");
        if (template) {
          this.ui.saleItemsTableBody.innerHTML = template.innerHTML;
        } else {
          // Fallback if template is missing
          this.ui.saleItemsTableBody.innerHTML = `
            <tr class="text-center text-muted">
              <td colspan="5" class="py-5">
                <i class="bi bi-cart-x fs-1"></i>
                <p class="mt-2 mb-0">No items added yet</p>
              </td>
            </tr>`;
        }
      }
    } else {
      this.items.forEach((item) => {
        const row = document.createElement("tr");
        const lineTotal = item.quantity * item.price;
        row.dataset.productId = item.product.id;

        // Simplified rendering without currency formatting
        row.innerHTML = `
          <td>${item.product.name || "N/A"}</td>
          <td class="text-end">${item.price.toFixed(2)}</td>
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
          <td class="text-end fw-medium">${lineTotal.toFixed(2)}</td>
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
        this.ui.saleItemsTableBody.appendChild(row);
      });
    }
    this._updateTotals();
  }

  _updateTotals() {
    let subTotal = 0;
    let totalQuantity = 0;
    this.items.forEach((item) => {
      subTotal += item.quantity * item.price;
      totalQuantity += item.quantity;
    });

    const taxAmount = subTotal * this.config.taxRate;
    const totalAmount = subTotal + taxAmount;

    // Update UI elements (plain numbers)
    if (this.ui.itemCount) this.ui.itemCount.textContent = totalQuantity;
    if (this.ui.subtotal) this.ui.subtotal.textContent = subTotal.toFixed(2);
    if (this.ui.tax) this.ui.tax.textContent = taxAmount.toFixed(2);
    if (this.ui.total) this.ui.total.textContent = totalAmount.toFixed(2);
    if (this.ui.checkoutButton)
      this.ui.checkoutButton.disabled = this.items.length === 0;
  }

  getSaleData() {
    let subTotal = 0;
    this.items.forEach((item) => {
      subTotal += item.quantity * item.price;
    });
    const taxAmount = subTotal * this.config.taxRate;
    const totalAmount = subTotal + taxAmount;

    return {
      items: this.items.map((item) => ({
        productId: item.product.id, // Ensure this ID is correct (might include SKU info if needed)
        name: item.product.name,
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

// --- ScannerService Class (Simplified) ---
class ScannerService {
  constructor(config) {
    this.config = {
      modelUrl: config.modelUrl,
      metadataUrl: config.metadataUrl,
      confidenceThreshold: config.confidenceThreshold || 0.9,
      detectionIntervalMs: config.detectionIntervalMs || 1200,
      videoElement: config.videoElement, // Expect video element directly
      predictionsElement: config.predictionsElement, // Optional element for debug
      callbacks: {
        onDetect: config.callbacks?.onDetect || (() => {}),
        onError: config.callbacks?.onError || (() => {}),
        onStatusChange: config.callbacks?.onStatusChange || (() => {}),
      },
    };
    this.model = null;
    this.stream = null;
    this.isInitialized = false;
    this.isScanning = false;
    this.detectionTimerId = null;
  }

  async _loadModel() {
    this._updateStatus("loading_model");
    try {
      this.model = await tmImage.load(
        this.config.modelUrl,
        this.config.metadataUrl
      );
      this._updateStatus("model_loaded");
      return true;
    } catch (error) {
      console.error("Error loading Teachable Machine model:", error);
      this._handleError("Failed to load the detection model.");
      return false;
    }
  }

  async initialize() {
    if (this.isInitialized) return true;
    if (!this.config.modelUrl || !this.config.metadataUrl) {
      this._handleError("Scanner configuration missing (model/metadata URL).");
      return false;
    }
    if (!this.config.videoElement) {
      this._handleError(
        "Scanner initialization failed: Video element missing."
      );
      return false;
    }

    this._updateStatus("initializing");
    const modelLoaded = await this._loadModel();
    if (!modelLoaded) return false;

    this.isInitialized = true;
    this._updateStatus("ready");
    console.log("Scanner initialized.");
    return true;
  }

  async start() {
    if (!this.isInitialized) {
      console.warn("Scanner not initialized. Call initialize() first.");
      const success = await this.initialize();
      if (!success) return;
    }
    if (this.isScanning) return;

    this._updateStatus("starting_camera");
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      this.config.videoElement.srcObject = this.stream;
      await new Promise((resolve) => {
        this.config.videoElement.onloadedmetadata = resolve;
      });

      if (this.config.predictionsElement)
        this.config.predictionsElement.innerHTML = "";

      this.detectionTimerId = setInterval(
        () => this._detectLoop(),
        this.config.detectionIntervalMs
      );
      this.isScanning = true;
      this._updateStatus("scanning");
      console.log("Camera started and scanning.");
    } catch (error) {
      console.error("Error starting camera:", error);
      this._handleError(
        "Could not access camera. Check permissions/availability."
      );
      this.stop(); // Clean up
    }
  }

  stop() {
    if (!this.isScanning && !this.stream) return;

    this._updateStatus("stopping");
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.config.videoElement) this.config.videoElement.srcObject = null;
    if (this.detectionTimerId) {
      clearInterval(this.detectionTimerId);
      this.detectionTimerId = null;
    }
    if (this.config.predictionsElement)
      this.config.predictionsElement.innerHTML = "";

    this.isScanning = false;
    this._updateStatus("stopped");
    console.log("Scanner stopped.");
  }

  toggle() {
    if (this.isScanning) this.stop();
    else this.start();
  }

  async _detectLoop() {
    if (
      !this.isScanning ||
      !this.model ||
      !this.config.videoElement?.srcObject ||
      this.config.videoElement.paused ||
      this.config.videoElement.ended ||
      !this.config.videoElement.videoWidth
    ) {
      return; // Not ready or stopped
    }

    try {
      const predictions = await this.model.predict(this.config.videoElement);
      this._displayPredictions(predictions); // Optional debug display

      const bestPrediction = predictions.reduce(
        (best, current) =>
          current.probability > best.probability ? current : best,
        { probability: 0 }
      );

      if (
        bestPrediction &&
        bestPrediction.probability >= this.config.confidenceThreshold
      ) {
        console.log(
          `Potential detection: ${bestPrediction.className} (${bestPrediction.probability})`
        );
        this.stop(); // Stop scanning to process detection
        // Use the detected class name (assumed to be product ID/code)
        await this._handleDetection(bestPrediction.className);
      }
    } catch (error) {
      console.error("Error during prediction:", error);
      // Optional: Add logic to stop after multiple consecutive errors
    }
  }

  async _handleDetection(detectedLabel) {
    this._updateStatus("verifying_detection");
    try {
      // --- Fetch product using the detected label (assumed ID/Code) ---
      // Adjust filter if label is not the ID:
      // const filter = `code = '${detectedLabel.replace(/'/g, "''")}'`;
      // const products = await DbService.getList("products", { filter });
      // if (products.length !== 1) throw new Error("Product not found or ambiguous");
      // const product = products[0];

      // Assuming label IS the PocketBase record ID:
      const product = await DbService.getOne("products", detectedLabel);

      console.log("Product found in DB:", product);
      this._updateStatus("product_found");
      this.config.callbacks.onDetect(product); // Pass product to main controller
    } catch (error) {
      console.error(
        `Error fetching product with ID/Label "${detectedLabel}":`,
        error
      );
      const message =
        error.status === 404
          ? `Item "${detectedLabel}" not found in database.`
          : `Error verifying item "${detectedLabel}".`;
      this._handleError(message);
      // Scanner is already stopped. Callback onError signals failure.
      // Consider restarting scanner automatically after a short delay? Or require manual restart.
      // For simplicity, require manual restart via toggle button.
    }
  }

  _displayPredictions(predictions) {
    if (!this.config.predictionsElement) return;
    this.config.predictionsElement.innerHTML = predictions
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 3) // Show top 3 for debugging
      .map(
        (p) => `<div>${p.className}: ${(p.probability * 100).toFixed(1)}%</div>`
      )
      .join("");
  }

  _handleError(errorMessage) {
    this._updateStatus("error");
    this.config.callbacks.onError(errorMessage);
  }

  _updateStatus(status) {
    // status: 'initializing', 'loading_model', 'model_loaded', 'ready', 'starting_camera', 'scanning', 'stopping', 'stopped', 'verifying_detection', 'product_found', 'error'
    this.config.callbacks.onStatusChange(status, this.isScanning);
  }
}

// --- Main NewSale Application Logic ---
class NewSaleApp {
  constructor(pageData) {
    this.pageData = pageData;
    this.ui = {}; // Cache for UI elements
    this.saleManager = null;
    this.scannerService = null;
    this.scanModal = null; // Bootstrap modal instance
    this.debouncedSearch = debounce(this._performProductSearch.bind(this), 350);
  }

  // --- Initialization ---
  initialize() {
    if (!this._getDOMElements()) {
      console.error(
        "Initialization failed: Could not find essential UI elements."
      );
      alert("Error initializing page. Please refresh.");
      return;
    }

    this._setupModal();
    this._setupSaleManager();
    this._setupScannerService();
    this._attachEventListeners();

    // Initial UI state
    this._updateScannerVisuals("initializing", false); // Start in non-scanning state visually
    if (!this.pageData.companyId) {
      this._disableSearch("Company ID missing");
    }

    // Initialize scanner (async)
    if (this.scannerService) {
      this.scannerService.initialize().then((success) => {
        if (success) {
          this.ui.scanToggleButton.disabled = false;
        } else {
          this.ui.scanToggleButton.disabled = true;
          // Error message handled by scanner's onError callback
        }
      });
    } else {
      // Scanner cannot be initialized (missing config)
      this.ui.scanToggleButton.disabled = true;
    }
  }

  _getDOMElements() {
    this.ui = {
      // Search
      searchInput: document.getElementById("product-search-input"),
      searchResults: document.getElementById("search-results"),
      searchIndicator: document.getElementById("search-indicator"),
      // Scanner
      scanToggleButton: document.getElementById("scan-toggle"),
      scanToggleText: document.getElementById("scan-toggle-text"),
      cameraSection: document.getElementById("camera-section"),
      cameraContainer: document.getElementById("camera-container"),
      cameraView: document.getElementById("camera-view"),
      scannerStatus: document.getElementById("scanner-status"),
      predictions: document.getElementById("predictions"), // Optional debug display
      // Sale Table
      saleItemsTableBody: document.getElementById("sale-items"),
      noItemsRow: document.getElementById("no-items-row"), // Reference to the template row if needed
      itemCount: document.getElementById("item-count"),
      subtotal: document.getElementById("subtotal"),
      tax: document.getElementById("tax"),
      total: document.getElementById("total"),
      checkoutButton: document.getElementById("checkout-btn"),
      checkoutStatus: document.getElementById("checkout-status"),
      // Modal
      scanModalElement: document.getElementById("scanModal"),
      scanModalLabel: document.getElementById("scanModalLabel"),
      modalProductName: document.getElementById("modal-product-name"),
      modalProductId: document.getElementById("modal-product-id"),
      modalQuantityInput: document.getElementById("modal-quantity"),
      modalPriceInput: document.getElementById("modal-price"),
      modalTotalPrice: document.getElementById("modal-total-price"),
      modalOriginalProductData: document.getElementById(
        "modal-original-product-data"
      ),
      modalSkuSection: document.getElementById("modal-sku-section"),
      modalSkuSelect: document.getElementById("modal-sku-select"),
      modalErrorMessage: document.getElementById("modal-error-message"),
      decreaseQtyButton: document.getElementById("decrease-qty"),
      increaseQtyButton: document.getElementById("increase-qty"),
      modalAddButton: document.getElementById("modal-add-product-btn"),
      modalAddAndKeepScanningButton: document.getElementById(
        "modal-add-and-scan-btn"
      ),
    };

    // Check for essential elements
    const essentials = [
      this.ui.searchInput,
      this.ui.scanToggleButton,
      this.ui.cameraView,
      this.ui.saleItemsTableBody,
      this.ui.checkoutButton,
      this.ui.scanModalElement,
    ];
    return essentials.every((el) => el !== null);
  }

  _setupModal() {
    if (this.ui.scanModalElement) {
      this.scanModal = new bootstrap.Modal(this.ui.scanModalElement);
    }
  }

  _setupSaleManager() {
    this.saleManager = new SaleManager(this.ui, { taxRate: 0.1 }); // Pass UI cache and config
  }

  _setupScannerService() {
    const canScan =
      this.pageData.modelInfo?.model && this.pageData.modelInfo?.metadata;
    if (!canScan) {
      this._updateScannerStatus("Scanner disabled: Missing configuration.");
      return; // Don't instantiate if config is missing
    }

    this.scannerService = new ScannerService({
      modelUrl: this.pageData.modelInfo.model,
      metadataUrl: this.pageData.modelInfo.metadata,
      confidenceThreshold: 0.9,
      detectionIntervalMs: 1200,
      videoElement: this.ui.cameraView,
      predictionsElement: this.ui.predictions, // Pass prediction element
      callbacks: {
        onDetect: this._handleProductDetected.bind(this),
        onError: this._handleScannerError.bind(this),
        onStatusChange: this._handleScannerStatusChange.bind(this),
      },
    });
  }

  // --- Event Listeners ---
  _attachEventListeners() {
    // Search
    if (this.ui.searchInput && this.pageData.companyId) {
      this.ui.searchInput.addEventListener("input", (event) => {
        this.debouncedSearch(event.target.value);
      });
      this.ui.searchInput.addEventListener("search", (event) => {
        if (!event.target.value) this._clearSearchResults();
      });
      // Hide search results on click outside
      document.addEventListener("click", (event) => {
        if (
          this.ui.searchResults &&
          this.ui.searchInput &&
          !this.ui.searchInput.contains(event.target) &&
          !this.ui.searchResults.contains(event.target)
        ) {
          this._clearSearchResults();
        }
      });
    }

    // Scan Toggle
    this.ui.scanToggleButton?.addEventListener("click", () => {
      if (this.scannerService && this.scannerService.isInitialized) {
        this.scannerService.toggle();
      } else if (this.scannerService) {
        console.warn("Scanner not ready yet.");
      } else {
        console.warn("Scanner is not configured or failed to initialize.");
      }
    });

    // Modal Interactions
    this.ui.decreaseQtyButton?.addEventListener("click", () =>
      this._adjustModalQuantity(-1)
    );
    this.ui.increaseQtyButton?.addEventListener("click", () =>
      this._adjustModalQuantity(1)
    );
    this.ui.modalQuantityInput?.addEventListener("input", () =>
      this._updateModalTotal()
    );
    this.ui.modalPriceInput?.addEventListener("input", () =>
      this._updateModalTotal()
    );
    this.ui.modalSkuSelect?.addEventListener("change", (event) =>
      this._handleModalSkuChange(event)
    );
    this.ui.modalAddButton?.addEventListener("click", () =>
      this._processModalAdd(false)
    );
    this.ui.modalAddAndKeepScanningButton?.addEventListener("click", () =>
      this._processModalAdd(true)
    );
    this.ui.scanModalElement?.addEventListener(
      "hidden.bs.modal",
      this._resetModal.bind(this)
    );

    // Checkout
    this.ui.checkoutButton?.addEventListener(
      "click",
      this._handleCheckout.bind(this)
    );

    // Note: Sale table listeners are handled by SaleManager via delegation
  }

  // --- UI Update Functions ---

  _updateScannerVisuals(status, isScanning) {
    if (!this.ui.scanToggleButton || !this.ui.cameraSection) return;

    const scanning = status === "scanning" || status === "verifying_detection";

    if (scanning) {
      this.ui.cameraSection.style.display = "block";
      this.ui.scanToggleText.textContent = "Stop Scanner";
      this.ui.scanToggleButton.classList.remove("btn-outline-primary");
      this.ui.scanToggleButton.classList.add("btn-danger");
      this.ui.scanToggleButton.title = "Stop the product scanner";
    } else {
      // Keep camera hidden unless actively scanning
      this.ui.cameraSection.style.display = "none";
      this.ui.scanToggleText.textContent = "Start Scanner";
      this.ui.scanToggleButton.classList.remove("btn-danger");
      this.ui.scanToggleButton.classList.add("btn-outline-primary");
      this.ui.scanToggleButton.title = "Start the product scanner";

      // Handle specific non-scanning states for button text
      if (status === "initializing" || status === "loading_model") {
        this.ui.scanToggleText.textContent = "Scanner Loading...";
        this.ui.scanToggleButton.disabled = true;
      } else if (status === "error") {
        this.ui.scanToggleText.textContent = "Scanner Error";
        this.ui.scanToggleButton.disabled = true; // Keep disabled on error until resolved? Or allow retry?
      } else if (status === "ready" || status === "stopped") {
        this.ui.scanToggleText.textContent = "Start Scanner";
        // Enable only if scanner is actually ready
        this.ui.scanToggleButton.disabled = !this.scannerService?.isInitialized;
      }
    }
  }

  _updateScannerStatus(message) {
    if (this.ui.scannerStatus) {
      this.ui.scannerStatus.textContent = message;
      this.ui.scannerStatus.classList.remove("text-danger", "text-success");
      if (message.toLowerCase().includes("error")) {
        this.ui.scannerStatus.classList.add("text-danger");
      } else if (
        message.toLowerCase().includes("ready") ||
        message.toLowerCase().includes("found")
      ) {
        this.ui.scannerStatus.classList.add("text-success");
      }
    }
  }

  _disableSearch(reason) {
    if (this.ui.searchInput) {
      this.ui.searchInput.disabled = true;
      this.ui.searchInput.placeholder = `Search disabled (${reason})`;
    }
    this._clearSearchResults();
  }

  _clearSearchResults() {
    if (this.ui.searchResults) {
      this.ui.searchResults.innerHTML = "";
      this.ui.searchResults.classList.remove("show");
    }
  }

  _showSearchSpinner(show) {
    if (this.ui.searchIndicator) {
      this.ui.searchIndicator.style.display = show ? "inline-block" : "none";
    }
  }

  // --- Search Logic ---
  async _performProductSearch(searchTerm) {
    if (!this.ui.searchResults || !this.pageData.companyId) {
      this._clearSearchResults();
      return;
    }

    const trimmedSearchTerm = searchTerm.trim();
    this._clearSearchResults();

    if (trimmedSearchTerm.length < 2) {
      this._showSearchSpinner(false);
      return;
    }

    this._showSearchSpinner(true);

    try {
      const filter = `(name ~ '${trimmedSearchTerm.replace(
        /'/g,
        "''"
      )}' || code ~ '${trimmedSearchTerm.replace(/'/g, "''")}') && company = '${
        this.pageData.companyId
      }'`;

      const products = await DbService.getList("products", {
        filter: filter,
        sort: "name",
        perPage: 10,
      });

      this._renderSearchResults(products);
    } catch (error) {
      console.error("Product search failed:", error);
      this.ui.searchResults.innerHTML =
        '<li class="list-group-item text-danger px-3 py-2">Search failed.</li>';
      this.ui.searchResults.classList.add("show");
    } finally {
      this._showSearchSpinner(false);
    }
  }

  _renderSearchResults(products) {
    this._clearSearchResults();
    if (!products || products.length === 0) {
      this.ui.searchResults.innerHTML =
        '<li class="list-group-item text-muted fst-italic px-3 py-2">No products found.</li>';
    } else {
      products.forEach((product) => {
        const li = document.createElement("li");
        li.classList.add(
          "list-group-item",
          "list-group-item-action",
          "px-3",
          "py-2"
        );
        li.style.cursor = "pointer";
        // Display price without currency symbol
        li.innerHTML = `
          <div>${product.name} ${
          product.code
            ? `<span class="text-muted small">(${product.code})</span>`
            : ""
        }</div>
          <div class="fw-bold small">${(product.price ?? 0).toFixed(2)}</div>
        `;
        li.dataset.productId = product.id;

        li.addEventListener("click", (e) => {
          e.preventDefault();
          console.log("Selected product from search:", product);
          this.saleManager.addItem(product, 1, product.price); // Add with default qty 1 and price
          this.ui.searchInput.value = ""; // Clear search input
          this._clearSearchResults();
          this.ui.searchInput.focus();
        });
        this.ui.searchResults.appendChild(li);
      });
    }
    if (this.ui.searchResults.hasChildNodes()) {
      this.ui.searchResults.classList.add("show");
    }
  }

  // --- Scanner Callbacks ---
  _handleScannerStatusChange(status, isScanning) {
    console.log("Scanner Status:", status);
    let message = "Scanner " + status.replace(/_/g, " ");
    switch (status) {
      case "initializing":
        message = "Scanner initializing...";
        break;
      case "loading_model":
        message = "Loading detection model...";
        break;
      case "ready":
        message = "Scanner ready.";
        break;
      case "scanning":
        message = "Scanning for products...";
        break;
      case "stopped":
        message = "Scanner stopped.";
        break;
      case "verifying_detection":
        message = "Detected item, verifying...";
        break;
      case "product_found":
        message = "Product identified.";
        break;
      case "error":
        message = "Scanner error occurred.";
        break; // Specific error handled by onError
    }
    this._updateScannerStatus(message);
    this._updateScannerVisuals(status, isScanning);
  }

  _handleScannerError(errorMessage) {
    console.error("Scanner Error!", errorMessage);
    // Scanner service automatically stops on most errors. Ensure UI reflects this.
    this._updateScannerVisuals("error", false);
    this._updateScannerStatus(`Error: ${errorMessage}`);
    // Optionally show a more prominent error message (e.g., alert or modal)
    // alert(`Scanner Error: ${errorMessage}`);
  }

  _handleProductDetected(product) {
    console.log("Callback: Product Detected!", product);
    if (!this.scanModal || !this.saleManager) {
      console.error(
        "Modal or SaleManager not initialized. Cannot process detection."
      );
      alert(`Product Found: ${product.name}. UI Error.`);
      return;
    }

    // --- Populate Modal ---
    this._resetModal(); // Clear previous state first
    this.ui.modalProductName.textContent = product.name || "Unknown Product";
    this.ui.modalProductId.textContent = product.id;
    this.ui.modalQuantityInput.value = 1;
    const basePrice = product.price ?? 0.01;
    this.ui.modalPriceInput.value = basePrice.toFixed(2);
    this.ui.modalOriginalProductData.value = JSON.stringify(product);

    // SKU Logic
    const skus = product.variants || product.skus; // Use common names
    if (skus && Array.isArray(skus) && skus.length > 0) {
      this.ui.modalSkuSelect.innerHTML =
        '<option selected disabled value="">Select variation...</option>'; // Reset options
      skus.forEach((sku) => {
        const option = document.createElement("option");
        option.value = sku.id; // Use SKU ID
        const skuPrice = sku.price ?? basePrice;
        option.textContent = `${sku.name || sku.id} (${skuPrice.toFixed(2)})`;
        option.dataset.price = skuPrice; // Store price on option
        this.ui.modalSkuSelect.appendChild(option);
      });
      this.ui.modalSkuSection.classList.remove("d-none");
    } else {
      this.ui.modalSkuSection.classList.add("d-none");
    }

    this.ui.scanModalLabel.textContent = "Product Found";
    this._updateModalTotal(); // Calculate initial total
    this.scanModal.show();
  }

  // --- Modal Logic ---
  _resetModal() {
    this._hideModalError();
    if (!this.ui.scanModalElement) return; // Exit if modal elements aren't cached

    this.ui.modalProductName.textContent = "Loading...";
    this.ui.modalProductId.textContent = "...";
    this.ui.modalQuantityInput.value = 1;
    this.ui.modalPriceInput.value = "0.00";
    this.ui.modalOriginalProductData.value = "";
    this.ui.modalSkuSelect.innerHTML =
      '<option selected disabled value="">Choose variation...</option>';
    this.ui.modalSkuSection.classList.add("d-none");
    this.ui.modalTotalPrice.textContent = "0.00";
  }

  _adjustModalQuantity(amount) {
    if (!this.ui.modalQuantityInput) return;
    let currentVal = parseInt(this.ui.modalQuantityInput.value, 10);
    const minVal = parseInt(this.ui.modalQuantityInput.min, 10) || 1;
    if (isNaN(currentVal)) currentVal = minVal;

    const newVal = currentVal + amount;
    if (newVal >= minVal) {
      this.ui.modalQuantityInput.value = newVal;
      this._updateModalTotal();
    }
  }

  _updateModalTotal() {
    if (
      !this.ui.modalQuantityInput ||
      !this.ui.modalPriceInput ||
      !this.ui.modalTotalPrice
    )
      return;

    const quantity = parseInt(this.ui.modalQuantityInput.value, 10) || 0;
    const price = parseFloat(this.ui.modalPriceInput.value) || 0.0;
    const total = quantity * price;
    this.ui.modalTotalPrice.textContent = total.toFixed(2); // Display plain number
  }

  _handleModalSkuChange(event) {
    this._hideModalError();
    if (!this.ui.modalPriceInput || !this.ui.modalOriginalProductData) return;

    const selectedOption = event.target.selectedOptions[0];
    let basePrice = 0;
    try {
      const product = JSON.parse(this.ui.modalOriginalProductData.value);
      basePrice = product.price ?? 0.01;
    } catch (e) {
      /* ignore */
    }

    if (selectedOption && selectedOption.dataset.price) {
      const newPrice = parseFloat(selectedOption.dataset.price);
      this.ui.modalPriceInput.value = newPrice.toFixed(2);
    } else {
      // Reset to base price if "Choose variation" or invalid option selected
      this.ui.modalPriceInput.value = basePrice.toFixed(2);
      if (event.target.value === "") {
        this._showModalError("Please select a product variation.");
      }
    }
    this._updateModalTotal();
  }

  _showModalError(message) {
    if (this.ui.modalErrorMessage) {
      this.ui.modalErrorMessage.textContent = message;
      this.ui.modalErrorMessage.classList.remove("d-none");
    } else {
      alert(message); // Fallback
    }
  }

  _hideModalError() {
    if (this.ui.modalErrorMessage) {
      this.ui.modalErrorMessage.textContent = "";
      this.ui.modalErrorMessage.classList.add("d-none");
    }
  }

  _processModalAdd(keepScanning) {
    this._hideModalError();

    try {
      const productJson = this.ui.modalOriginalProductData.value;
      if (!productJson) throw new Error("Original product data missing.");
      const product = JSON.parse(productJson);

      const quantity = parseInt(this.ui.modalQuantityInput.value, 10);
      const price = parseFloat(this.ui.modalPriceInput.value);
      const minQty = parseInt(this.ui.modalQuantityInput.min || "1", 10);

      // Validation
      if (isNaN(quantity) || quantity < minQty) {
        this._showModalError(`Enter a valid quantity (${minQty} or more).`);
        this.ui.modalQuantityInput.focus();
        return;
      }
      if (isNaN(price) || price < 0) {
        // Allow 0 price?
        this._showModalError("Enter a valid unit price (0 or more).");
        this.ui.modalPriceInput.focus();
        return;
      }

      // SKU Validation
      const skus = product.variants || product.skus;
      const skuRequired = skus && Array.isArray(skus) && skus.length > 0;
      const selectedSkuValue = this.ui.modalSkuSelect.value;

      if (skuRequired && !selectedSkuValue) {
        this._showModalError("Please select a product variation (SKU).");
        this.ui.modalSkuSelect.focus();
        return;
      }

      // Prepare item data
      let itemProductData = { ...product }; // Start with base product
      let itemNameToAdd = product.name;
      // If SKU selected, potentially modify the product data/name/ID for the sale item
      if (skuRequired && selectedSkuValue) {
        const selectedSkuData = skus.find((sku) => sku.id === selectedSkuValue);
        if (selectedSkuData) {
          itemNameToAdd = `${product.name} - ${
            selectedSkuData.name || selectedSkuValue
          }`;
          // IMPORTANT: Decide how to represent the SKU in the sale.
          // Option 1: Modify the product ID sent to saleManager
          // itemProductData.id = selectedSkuValue; // Or a composite ID like product.id + '_' + selectedSkuValue
          // Option 2: Add SKU info as properties
          itemProductData.selectedSkuId = selectedSkuValue;
          itemProductData.selectedSkuName = selectedSkuData.name;
          // Ensure the price from the modal (which reflects SKU price) is used
        }
      }
      itemProductData.name = itemNameToAdd; // Update name regardless

      console.log(
        `Adding from modal: Qty=${quantity}, Price=${price}`,
        itemProductData
      );

      // Add to sale using the potentially modified product data and the price from the modal input
      this.saleManager.addItem(itemProductData, quantity, price);
      this.scanModal.hide(); // Hide modal on success

      // Restart scanner if requested and possible
      if (
        keepScanning &&
        this.scannerService &&
        !this.scannerService.isScanning
      ) {
        console.log("Modal action complete, restarting scanner...");
        // Short delay to allow modal to fully hide?
        setTimeout(() => {
          if (this.scannerService && !this.scannerService.isScanning) {
            this.scannerService.start();
          }
        }, 300);
      }
    } catch (e) {
      console.error("Error processing modal data:", e);
      this._showModalError(`Error: ${e.message || "Could not add product."}`);
    }
  }

  // --- Checkout Logic ---
  async _handleCheckout() {
    if (!this.ui.checkoutButton || !this.ui.checkoutStatus || !this.saleManager)
      return;

    const saleData = this.saleManager.getSaleData();
    console.log("Preparing checkout:", saleData);

    if (!saleData || saleData.items.length === 0) {
      this._updateCheckoutStatus("Cannot checkout an empty sale.", "warning");
      return;
    }

    this.ui.checkoutButton.disabled = true;
    this._updateCheckoutStatus("Processing sale...", "info", true); // Show spinner

    try {
      // *** Replace with your actual backend endpoint ***
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData),
      });

      if (!response.ok) {
        let errorMsg = `HTTP error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorData.error || errorMsg;
        } catch (e) {
          /* Ignore JSON parsing error */
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      console.log("Checkout successful:", result);
      this._updateCheckoutStatus(
        `Sale completed! (ID: ${result.saleId || "N/A"})`,
        "success"
      );
      this.saleManager.clearSale(); // Clear the sale

      // Optionally clear status after delay
      setTimeout(() => this._updateCheckoutStatus(""), 5000);
    } catch (error) {
      console.error("Checkout failed:", error);
      this._updateCheckoutStatus(
        `Checkout failed: ${error.message}.`,
        "danger"
      );
      this.ui.checkoutButton.disabled = false; // Re-enable button
    }
  }

  _updateCheckoutStatus(message, type = "info", processing = false) {
    if (!this.ui.checkoutStatus) return;
    let content = "";
    if (processing) {
      content = `<div class="spinner-border spinner-border-sm text-primary" role="status"></div><span class="ms-2">${message}</span>`;
    } else if (message) {
      const textClass =
        {
          success: "text-success",
          warning: "text-warning",
          danger: "text-danger",
          info: "text-info",
        }[type] || "text-muted";
      content = `<span class="${textClass}">${message}</span>`;
    }
    this.ui.checkoutStatus.innerHTML = content;
  }
}

// --- Document Ready ---
document.addEventListener("DOMContentLoaded", () => {
  let pageData = {};
  try {
    const dataElement = document.getElementById("page-data");
    if (!dataElement) throw new Error("Page data script tag not found.");
    pageData = JSON.parse(dataElement.textContent);
  } catch (error) {
    console.error("Failed to read or parse page data:", error);
    alert("Error loading page configuration. Functionality may be limited.");
    return; // Stop execution if essential data is missing
  }

  const app = new NewSaleApp(pageData);
  app.initialize();

  // Make app instance accessible globally for debugging if needed
  // window.newSaleApp = app;
});
