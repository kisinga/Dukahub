import { addProduct } from "/public/js/products.js";
import { ScannerService } from "/public/js/scanner.js";

// --- Read Dynamic Data from Go/Templ ---
let pageData = {};
try {
  const dataElement = document.getElementById("scanner-page-data");
  if (!dataElement) throw new Error("Scanner page data script tag not found.");
  pageData = JSON.parse(dataElement.textContent);
} catch (error) {
  console.error("Failed to read or parse page data:", error);
  // Handle error appropriately - maybe show a message to the user
  alert(
    "Error loading page configuration. Scanner functionality may be limited."
  );
}

// --- Configuration for ScannerService ---
// Use the data read from the JSON script tag
const scannerConfig = {
  modelUrl: pageData.model, // Use optional chaining for safety
  metadataUrl: pageData.metadata,
  confidenceThreshold: 0.9,
  detectionIntervalMs: 1200,
  selectors: {
    // Ensure these IDs match your @components.Scanner() HTML output
    container: "#camera-container",
    video: "#camera-view",
    predictions: "#predictions",
    scanLine: ".scanning-line",
  },
  callbacks: {
    onDetect: handleProductDetected, // Function defined below
    onError: handleScannerError, // Function defined below
    onStatusChange: updateScannerStatus, // Function defined below
  },
};

// --- Instantiate Services ---
const scanner = new ScannerService(scannerConfig);

// --- UI Elements Cache ---
// Get elements needed for UI updates once
const scanToggleButton = document.getElementById("scan-toggle"); // Make sure this ID exists in your Scanner component or elsewhere
const addProductButton = document.getElementById("add-product-btn"); // Make sure this ID exists
const scanModalElement = document.getElementById("scanModal");
const scanModalInstance = scanModalElement
  ? new bootstrap.Modal(scanModalElement)
  : null;
const scanModalLabel = document.getElementById("scanModalLabel");
const scanModalBody = scanModalElement?.querySelector(".modal-body");
const scanModalFooter = scanModalElement?.querySelector(".modal-footer");
const scannerStatusElement = document.getElementById("scanner-status");

// --- Callback Functions (UI Logic) ---
function handleProductDetected(product) {
  console.log("Callback: Product Detected!", product);
  if (
    !scanModalInstance ||
    !scanModalLabel ||
    !scanModalBody ||
    !scanModalFooter
  ) {
    console.error("Scan modal elements not found for displaying result.");
    alert(`Product Found: ${product.name}`); // Fallback
    return;
  }

  scanModalLabel.textContent = "Product Found";
  scanModalBody.innerHTML = `
        <p><strong>${product.name || "Unknown Product"}</strong></p>
        <p>Price: ${product.price ?? "N/A"}</p>
        <!-- Add other relevant product details -->
    `;
  scanModalFooter.innerHTML = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary" id="modal-add-product-btn">Add Product</button>
    `;

  // Add listener specifically for the modal's add button (ensure it's fresh)
  const modalAddBtn = document.getElementById("modal-add-product-btn");
  if (modalAddBtn) {
    modalAddBtn.replaceWith(modalAddBtn.cloneNode(true)); // Clear old listeners
    document
      .getElementById("modal-add-product-btn")
      .addEventListener("click", () => {
        console.log("Adding detected product:", product.id);
        addProduct(product.id); // Call your existing addProduct function
        scanModalInstance.hide();
      });
  }
  scanModalInstance.show();
}

function handleScannerError(errorMessage) {
  console.error("Callback: Scanner Error!", errorMessage);
  if (
    !scanModalInstance ||
    !scanModalLabel ||
    !scanModalBody ||
    !scanModalFooter
  ) {
    console.error("Scan modal elements not found for displaying error.");
    alert(`Scanner Error: ${errorMessage}`); // Fallback
    return;
  }

  scanModalLabel.textContent = "Scanner Error";
  scanModalBody.innerHTML = `<p class="text-danger">${errorMessage}</p>`;
  scanModalFooter.innerHTML = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
    `;
  scanModalInstance.show();
  // Ensure scanner is stopped if not already
  if (scanner.isScanning) {
    scanner.stop();
  }
}

function updateScannerStatus(statusMessage) {
  console.log("Callback: Scanner Status:", statusMessage);
  if (scannerStatusElement) {
    scannerStatusElement.textContent = statusMessage;
  }
}

// --- Initialization and Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  // Check if essential config is loaded
  if (!scannerConfig.modelUrl || !scannerConfig.metadataUrl) {
    handleScannerError(
      "Scanner configuration (model/metadata URL) is missing. Cannot initialize."
    );
    if (scanToggleButton) scanToggleButton.disabled = true;
    return; // Stop initialization
  }

  // Initialize the scanner (loads model etc.)
  scanner
    .initialize()
    .then((success) => {
      if (success && scanToggleButton) {
        scanToggleButton.disabled = false;
        updateScannerStatus("Scanner ready.");
      } else if (!success) {
        if (scanToggleButton) scanToggleButton.disabled = true;
        // Error already handled by callback via initialize() -> _loadModel()
      }
    })
    .catch((err) => {
      // Catch any unexpected error during async initialize
      handleScannerError(`Unexpected initialization error: ${err.message}`);
      if (scanToggleButton) scanToggleButton.disabled = true;
    });

  // Attach listener to the toggle button
  if (scanToggleButton) {
    scanToggleButton.addEventListener("click", () => {
      scanner.toggle();
    });
  } else {
    console.warn("Scan toggle button (#scan-toggle) not found.");
  }

  // Attach listener for the manual add button (if applicable)
  if (addProductButton) {
    addProductButton.addEventListener("click", () => {
      // Logic for manually adding product based on search input, etc.
      const searchInput = document.getElementById("product-search-input"); // Assuming this exists
      const productNameOrId = searchInput ? searchInput.value : null;
      console.log("Manual add button clicked for:", productNameOrId);
      // ... add product logic ...
    });
  }

  // Optional: Reset modal or scanner state when modal is closed
  scanModalElement?.addEventListener("hidden.bs.modal", () => {
    console.log("Scan modal closed.");
    // You might want to clear modal content or decide if scanner should restart
  });
});
