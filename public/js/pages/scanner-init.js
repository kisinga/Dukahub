// /public/js/pages/scanner-init.js

// --- Imports ---
import { DbService } from "/public/js/pb.js"; // Assuming DbService is correctly set up
import { SaleManager } from "/public/js/saleManager.js"; // Import SaleManager
import { ScannerService } from "/public/js/scanner.js";

// --- Utilities ---
/**
 * Debounce function
 * @param {Function} func The function to debounce.
 * @param {number} delay Delay in milliseconds.
 * @returns {Function} Debounced function.
 */
export function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// --- Read Dynamic Data from Go/Templ ---
let pageData = {};
try {
  const dataElement = document.getElementById("scanner-page-data");
  if (!dataElement) throw new Error("Scanner page data script tag not found.");
  pageData = JSON.parse(dataElement.textContent);
} catch (error) {
  console.error("Failed to read or parse page data:", error);
  alert(
    "Error loading page configuration. Scanner functionality may be limited."
  );
  // Prevent further execution if essential data is missing
  throw new Error("Cannot proceed without page data.");
}

const companyId = pageData.companyId;
if (!companyId) {
  console.error("Company ID is missing in the page data.");
  alert("Company ID is required for scanner functionality.");
  // Prevent further execution if essential data is missing
  throw new Error("Cannot proceed without company ID.");
}

// --- Configuration for ScannerService ---
const scannerConfig = {
  modelUrl: pageData.modelInfo?.model,
  metadataUrl: pageData.modelInfo?.metadata,
  confidenceThreshold: 0.9,
  detectionIntervalMs: 1200,
  selectors: {
    container: "#camera-container", // Container for video and scan line
    video: "#camera-view",
    predictions: "#predictions", // Element within the camera card
    scanLine: ".scanning-line", // Scan line element
  },
  callbacks: {
    onDetect: handleProductDetected,
    onError: handleScannerError,
    onStatusChange: updateScannerStatus, // This will now also update UI visuals
  },
};

const saleManagerConfig = {
  tableBodySelector: "#sale-items",
  noItemsRowSelector: "#no-items-row",
  itemCountSelector: "#item-count",
  subtotalSelector: "#subtotal",
  taxSelector: "#tax",
  totalSelector: "#total",
  checkoutButtonSelector: "#checkout-btn",
  taxRate: 0.1, // 10% Tax Rate - make configurable if needed
  // currencyFormat: new Intl.NumberFormat(...) // Optional: customize currency
};
// --- Instantiate Services ---
const scanner = new ScannerService(scannerConfig);
const saleManager = new SaleManager(saleManagerConfig); // Instantiate SaleManager

// --- UI Elements Cache ---
const searchInput = document.getElementById("product-search-input");
const searchResultsContainer = document.getElementById("search-results");
const searchIndicator = document.getElementById("search-indicator");
const cameraSection = document.getElementById("camera-section");
const cameraContainer = document.getElementById("camera-container");
const scanToggleButton = document.getElementById("scan-toggle");
const scanToggleText = document.getElementById("scan-toggle-text");
const scannerStatusElement = document.getElementById("scanner-status");
const checkoutButton = document.getElementById("checkout-btn");
const checkoutStatusElement = document.getElementById("checkout-status");

// Modal Elements
const scanModalElement = document.getElementById("scanModal");
const scanModalInstance = scanModalElement
  ? new bootstrap.Modal(scanModalElement)
  : null;
const scanModalLabel = document.getElementById("scanModalLabel");
const scanModalBody = scanModalElement?.querySelector("#scanModalBody");
const scanModalFooter = scanModalElement?.querySelector("#scanModalFooter");
const modalProductName = document.getElementById("modal-product-name");
const modalProductId = document.getElementById("modal-product-id");
const modalQuantityInput = document.getElementById("modal-quantity");
const modalPriceInput = document.getElementById("modal-price");
const modalAddButton = document.getElementById("modal-add-product-btn");
const modalAddAndKeepScanningButton = document.getElementById(
  "modal-add-and-scan-btn"
);
const modalOriginalProductData = document.getElementById(
  "modal-original-product-data"
);

const modalSkuSelect = document.getElementById("modal-sku-select"); // Added
const modalSkuSection = document.getElementById("modal-sku-section"); // Added
const modalErrorMessage = document.getElementById("modal-error-message"); // Added
const decreaseQtyButton = document.getElementById("decrease-qty");
const increaseQtyButton = document.getElementById("increase-qty");
const modalTotalPrice = document.getElementById("modal-total-price");
const formatCurrency = saleManager.config.currencyFormat.format;
// --- Search Functionality ---
/**
 * Performs product search using PocketBase.
 * @param {string} searchTerm The term to search for.
 */

// --- Search Functionality ---
/** Performs product search using PocketBase. */
async function performProductSearch(searchTerm) {
  if (!searchResultsContainer || !searchIndicator || !companyId) {
    if (!companyId) console.warn("Cannot search: Company ID is missing.");
    searchResultsContainer.innerHTML = ""; // Clear results if no company ID
    searchResultsContainer.classList.remove("show");
    return;
  }

  const trimmedSearchTerm = searchTerm.trim();
  searchResultsContainer.innerHTML = ""; // Clear previous results
  searchResultsContainer.classList.remove("show"); // Hide

  if (trimmedSearchTerm.length < 2) {
    // Minimum search term length
    searchIndicator.style.display = "none";
    return;
  }

  searchIndicator.style.display = "inline-block";

  try {
    // Search by name OR code (adjust field names if different)
    const filter = `name ~ '${trimmedSearchTerm.replace(
      /'/g,
      "''"
    )}' && company = '${companyId}'`;
    const products = await DbService.getList("products", {
      filter: filter,
      sort: "name",
      perPage: 10, // Limit results for dropdown
    });

    renderSearchResults(products, searchResultsContainer);
    if (products && products.length > 0) {
      searchResultsContainer.classList.add("show");
    } else {
      searchResultsContainer.innerHTML =
        '<li class="list-group-item text-muted fst-italic px-3 py-2">No products found.</li>';
      searchResultsContainer.classList.add("show");
    }
  } catch (error) {
    console.error("Product search failed:", error);
    searchResultsContainer.innerHTML =
      '<li class="list-group-item text-danger px-3 py-2">Search failed. Please try again.</li>';
    searchResultsContainer.classList.add("show");
  } finally {
    searchIndicator.style.display = "none";
  }
}

/** Renders search results. */
function renderSearchResults(products, container) {
  container.innerHTML = ""; // Clear previous
  products.forEach((product) => {
    const li = document.createElement("li");
    li.classList.add(
      "list-group-item",
      "list-group-item-action",
      "px-3",
      "py-2"
    );
    li.style.cursor = "pointer";
    li.innerHTML = `
        <div>${product.name} ${
      product.code
        ? `<span class="text-muted small">(${product.code})</span>`
        : ""
    }</div>
        <div class="fw-bold small">${formatCurrency(product.price ?? 0)}</div>
    `;
    li.dataset.productId = product.id;

    li.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Selected product from search:", product);
      // Add directly to sale with default quantity 1 and standard price
      saleManager.addItem(product, 1, product.price);
      searchInput.value = ""; // Clear search input
      container.classList.remove("show"); // Hide results
      searchInput.focus(); // Optional: focus back on input
    });
    container.appendChild(li);
  });
}
// --- Modal Helper Functions ---

/** Calculates and updates the total price displayed in the modal */
function updateModalTotal() {
  // Ensure all required elements are available
  if (!modalQuantityInput || !modalPriceInput || !modalTotalPrice) {
    console.warn("Modal total calculation skipped: Missing elements.");
    return;
  }
  // Use || 0 or || 0.00 to handle potential NaN values during initial load or invalid input
  const quantity = parseInt(modalQuantityInput.value, 10) || 0;
  const price = parseFloat(modalPriceInput.value) || 0.0;
  const total = quantity * price;

  // Use the existing currency formatter
  modalTotalPrice.textContent = formatCurrency(total);
}

/** Shows an error message within the modal */
function showModalError(message) {
  if (modalErrorMessage) {
    modalErrorMessage.textContent = message;
    modalErrorMessage.classList.remove("d-none"); // Make it visible
  } else {
    console.error("Modal error display failed: Element not found.");
    alert(message); // Fallback to alert
  }
}

/** Hides the error message within the modal */
function hideModalError() {
  if (modalErrorMessage) {
    modalErrorMessage.textContent = "";
    modalErrorMessage.classList.add("d-none"); // Hide it
  }
}
// Debounced search function
const debouncedSearch = debounce(performProductSearch, 350);

// --- Scanner UI Update Function ---
/** Updates scanner UI based on state. */
function updateScannerVisuals(isScanning) {
  if (!cameraSection || !scanToggleButton || !scanToggleText) return;

  if (isScanning) {
    cameraSection.style.display = "block"; // Show camera section
    scanToggleText.textContent = "Stop Scanner";
    scanToggleButton.classList.remove("btn-outline-primary");
    scanToggleButton.classList.add("btn-danger");
    scanToggleButton.title = "Stop the product scanner";
  } else {
    // Keep camera section hidden unless explicitly toggled on
    // cameraSection.style.display = "none"; // Hide when stopped
    scanToggleText.textContent = "Start Scanner";
    scanToggleButton.classList.remove("btn-danger");
    scanToggleButton.classList.add("btn-outline-primary");
    scanToggleButton.title = "Start the product scanner";
  }
}

// --- Callback Functions (UI Logic) ---
/** Handles successful product detection from ScannerService */
function handleProductDetected(product) {
  console.log("Callback: Product Detected!", product);

  if (
    !scanModalInstance ||
    !modalProductName ||
    !modalProductId ||
    !modalQuantityInput ||
    !modalPriceInput ||
    !modalOriginalProductData ||
    !modalSkuSelect || // Check new elements
    !modalSkuSection ||
    !modalErrorMessage
  ) {
    console.error(
      "Scan modal elements not found. Cannot display product details."
    );
    // Fallback: Maybe add directly or show an alert
    // saleManager.addItem(product, 1, product.price);
    alert(`Product Found: ${product.name}. Modal UI elements missing.`);
    return;
  }

  // Reset modal state
  modalProductName.textContent = product.name || "Unknown Product";
  modalProductId.textContent = product.id;
  modalQuantityInput.value = 1;
  modalPriceInput.value = (product.price ?? 0.01).toFixed(2); // Use base price initially
  modalOriginalProductData.value = JSON.stringify(product);
  modalErrorMessage.textContent = ""; // Clear previous errors
  modalSkuSelect.innerHTML =
    '<option selected disabled value="">Select variation...</option>'; // Reset options

  // --- SKU Logic ---
  // Assume product.skus is an array like [{ id: 'sku123', name: 'Red-L', price: 12.99 }, ...]
  // Adjust 'product.skus' and field names (id, name, price) if your data structure differs
  const skus = product.variants || product.skus; // Check common names for variations/skus array

  if (skus && Array.isArray(skus) && skus.length > 0) {
    // Populate SKU dropdown
    skus.forEach((sku) => {
      const option = document.createElement("option");
      option.value = sku.id; // Use SKU ID as value
      option.textContent = `${sku.name || sku.id} (${formatCurrency(
        sku.price ?? 0
      )})`;
      // Store price directly on the option for easy retrieval
      option.dataset.price = sku.price ?? product.price ?? 0;
      modalSkuSelect.appendChild(option);
    });

    // Show SKU section
    modalSkuSection.classList.remove("d-none");
  } else {
    // Hide SKU section if no SKUs
    modalSkuSection.classList.add("d-none");
  }

  scanModalLabel.textContent = "Product Found";
  scanModalInstance.show();
}

/** Handles errors from ScannerService */
function handleScannerError(errorMessage) {
  console.error("Callback: Scanner Error!", errorMessage);
  // Ensure scanner is stopped visually and functionally
  if (scanner.isScanning) {
    scanner.stop(); // Tell the service to stop if it hasn't already
  }
  updateScannerVisuals(false); // Ensure UI reflects stopped state

  // Display error in a generic way (could use the modal too)
  if (scannerStatusElement) {
    scannerStatusElement.innerHTML = `<span class="text-danger">Error: ${errorMessage}</span>`;
  } else {
    alert(`Scanner Error: ${errorMessage}`); // Fallback alert
  }
  // Optionally show the modal with the error
  // showModalMessage("Scanner Error", `<p class="text-danger">${errorMessage}</p>`, true);
}

/** Updates the status text and syncs UI visuals */
function updateScannerStatus(statusMessage) {
  console.log("Callback: Scanner Status:", statusMessage);
  if (scannerStatusElement) {
    scannerStatusElement.textContent = statusMessage;
  }
  // Update button text/style, camera visibility based on actual scanner state
  updateScannerVisuals(scanner.isScanning);
}

/** Generic function to show messages in the modal */
function showModalMessage(title, bodyHtml, isError = false) {
  if (
    !scanModalInstance ||
    !scanModalLabel ||
    !scanModalBody ||
    !scanModalFooter
  ) {
    console.error("Cannot show modal message: Modal elements missing.");
    alert(`${title}: ${bodyHtml.replace(/<[^>]*>/g, "")}`); // Fallback alert
    return;
  }
  scanModalLabel.textContent = title;
  scanModalBody.innerHTML = bodyHtml;
  scanModalFooter.innerHTML = `
        <button type="button" class="btn btn-${
          isError ? "danger" : "secondary"
        }" data-bs-dismiss="modal">Close</button>
    `;
  scanModalInstance.show();
}

// --- Checkout Functionality ---
async function handleCheckout() {
  if (!checkoutButton || !checkoutStatusElement) return;

  const saleData = saleManager.getSaleData();
  console.log("Preparing checkout:", saleData);

  if (!saleData || saleData.items.length === 0) {
    checkoutStatusElement.innerHTML = `<span class="text-warning">Cannot checkout an empty sale.</span>`;
    return;
  }

  checkoutButton.disabled = true;
  checkoutStatusElement.innerHTML = `<div class="spinner-border spinner-border-sm text-primary" role="status"></div><span class="ms-2">Processing sale...</span>`;

  try {
    // *** Replace with your actual backend endpoint ***
    const response = await fetch("/api/sales", {
      // EXAMPLE ENDPOINT
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add any necessary auth headers (e.g., JWT token)
        // 'Authorization': `Bearer ${your_token}`
      },
      body: JSON.stringify(saleData),
    });

    if (!response.ok) {
      // Try to get error message from backend response
      let errorMsg = `HTTP error ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorData.error || errorMsg;
      } catch (e) {
        /* Ignore JSON parsing error */
      }
      throw new Error(errorMsg);
    }

    const result = await response.json(); // Assuming backend returns { success: true, saleId: '...' }

    console.log("Checkout successful:", result);
    checkoutStatusElement.innerHTML = `<span class="text-success">Sale completed successfully! (ID: ${
      result.saleId || "N/A"
    })</span>`;

    // Clear the sale after successful checkout
    saleManager.clearSale();

    // Optional: Redirect or show a persistent success message
    // setTimeout(() => { window.location.href = '/sales/receipt/' + result.saleId; }, 2000);
    setTimeout(() => {
      checkoutStatusElement.innerHTML = "";
    }, 5000); // Clear status after 5s
  } catch (error) {
    console.error("Checkout failed:", error);
    checkoutStatusElement.innerHTML = `<span class="text-danger">Checkout failed: ${error.message}. Please try again.</span>`;
    checkoutButton.disabled = false; // Re-enable button on failure
  }
}

// --- Initialization and Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  // 1. Check essential config
  const canScan = scannerConfig.modelUrl && scannerConfig.metadataUrl;
  if (!canScan) {
    updateScannerStatus("Scanner disabled: Missing configuration.");
    if (scanToggleButton) scanToggleButton.disabled = true;
  } else {
    if (scanToggleButton) scanToggleButton.disabled = true; // Keep disabled until init finishes
  }

  if (!companyId) {
    console.warn("Company ID missing. Product search will be disabled.");
    if (searchInput) searchInput.disabled = true;
    if (searchInput)
      searchInput.placeholder = "Search disabled (missing company ID)";
  }

  // 2. Initialize Scanner (if configured)
  if (canScan) {
    scanner
      .initialize()
      .then((success) => {
        if (success) {
          if (scanToggleButton) scanToggleButton.disabled = false;
          updateScannerStatus("Scanner ready."); // Update status via callback
        } else {
          if (scanToggleButton) scanToggleButton.disabled = true;
          // Error handled by onError callback during init
        }
      })
      .catch((err) => {
        handleScannerError(`Unexpected initialization error: ${err.message}`);
        if (scanToggleButton) scanToggleButton.disabled = true;
      });
  }

  // 3. Attach Listener: Scan Toggle Button
  if (scanToggleButton) {
    scanToggleButton.addEventListener("click", () => {
      if (!scanner.isInitialized && canScan) {
        console.warn("Scanner not ready yet, please wait for initialization.");
        return;
      }
      if (!canScan) {
        console.warn("Scanner cannot be started due to missing configuration.");
        return;
      }
      scanner.toggle(); // Service handles state and callbacks update UI
      // Toggle camera section visibility based on the *intended* state
      if (!scanner.isScanning) {
        // If it *was* scanning, it's now stopping
        cameraSection.style.display = "none";
      } else {
        // If it *was not* scanning, it's now starting
        cameraSection.style.display = "block";
      }
    });
  }

  // 4. Attach Listener: Search Input
  if (searchInput && companyId) {
    // Only add listener if search is enabled
    searchInput.addEventListener("input", (event) => {
      debouncedSearch(event.target.value);
    });
    // Clear results if input is cleared manually (e.g., hitting 'x')
    searchInput.addEventListener("search", (event) => {
      if (!event.target.value) {
        searchResultsContainer.innerHTML = "";
        searchResultsContainer.classList.remove("show");
      }
    });
  }

  // 5. Attach Listener: Click Outside Search Results
  document.addEventListener("click", (event) => {
    if (
      searchResultsContainer &&
      searchInput &&
      !searchInput.contains(event.target) &&
      !searchResultsContainer.contains(event.target)
    ) {
      searchResultsContainer.classList.remove("show"); // Hide results
    }
  });

  // Add listener for SKU selection change
  if (modalSkuSelect && modalPriceInput) {
    modalSkuSelect.addEventListener("change", (event) => {
      const selectedOption = event.target.selectedOptions[0];
      if (selectedOption && selectedOption.dataset.price) {
        const newPrice = parseFloat(selectedOption.dataset.price);
        modalPriceInput.value = newPrice.toFixed(2);
        modalErrorMessage.textContent = ""; // Clear error on valid selection
      } else if (event.target.value === "") {
        // Handle "Select variation..." being re-selected
        // Reset to base product price? Or show error?
        try {
          const product = JSON.parse(modalOriginalProductData.value);
          modalPriceInput.value = (product.price ?? 0.01).toFixed(2);
        } catch (e) {
          modalPriceInput.value = "0.00"; // Fallback
        }
        modalErrorMessage.textContent = "Please select a product variation.";
      }
    });
  }
  // --- Attach Listeners for Modal Quantity Buttons ---
  if (decreaseQtyButton && modalQuantityInput) {
    decreaseQtyButton.addEventListener("click", () => {
      let currentVal = parseInt(modalQuantityInput.value, 10);
      // Use min value from input attribute if available, otherwise default to 1
      const minVal = parseInt(modalQuantityInput.min, 10) || 1;
      if (isNaN(currentVal)) currentVal = minVal; // Handle NaN

      if (currentVal > minVal) {
        modalQuantityInput.value = currentVal - 1;
        updateModalTotal(); // Update total display
        // Manually trigger an 'input' event so other listeners react if needed
        modalQuantityInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  }

  if (increaseQtyButton && modalQuantityInput) {
    increaseQtyButton.addEventListener("click", () => {
      let currentVal = parseInt(modalQuantityInput.value, 10);
      if (isNaN(currentVal)) currentVal = 0; // Handle NaN

      modalQuantityInput.value = currentVal + 1;
      updateModalTotal(); // Update total display
      // Manually trigger an 'input' event
      modalQuantityInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  // --- Attach Listeners for Direct Input Changes ---
  if (modalQuantityInput) {
    modalQuantityInput.addEventListener("input", () => {
      // Optional: Add validation here if needed (e.g., prevent negative numbers if min isn't enough)
      updateModalTotal();
    });
  }

  if (modalPriceInput) {
    modalPriceInput.addEventListener("input", () => {
      // Optional: Add validation here if needed
      updateModalTotal();
    });
  }

  // --- Update SKU Change Listener ---
  if (modalSkuSelect && modalPriceInput) {
    modalSkuSelect.addEventListener("change", (event) => {
      hideModalError(); // Clear any previous errors on change
      const selectedOption = event.target.selectedOptions[0];
      let basePrice = 0;
      // Get base price safely
      try {
        const product = JSON.parse(modalOriginalProductData.value);
        basePrice = product.price ?? 0.01;
      } catch (e) {
        /* ignore */
      }

      if (selectedOption && selectedOption.dataset.price) {
        const newPrice = parseFloat(selectedOption.dataset.price);
        modalPriceInput.value = newPrice.toFixed(2);
      } else if (event.target.value === "") {
        // Handle "Choose variation..." being re-selected
        modalPriceInput.value = basePrice.toFixed(2); // Reset to base price
        showModalError("Please select a product variation.");
      } else {
        // Fallback if dataset.price is missing for some reason
        modalPriceInput.value = basePrice.toFixed(2);
      }
      updateModalTotal(); // Update total whenever SKU changes price
    });
  }

  // --- Update Modal Add Button Listeners ---
  if (
    modalAddButton &&
    modalAddAndKeepScanningButton &&
    modalOriginalProductData &&
    modalQuantityInput &&
    modalPriceInput &&
    modalSkuSelect && // Still need this for validation logic
    modalErrorMessage && // Used by helper functions now
    scanModalInstance &&
    saleManager
  ) {
    // Define the core action function separately
    const processModalAdd = (keepScanning) => {
      hideModalError(); // Clear previous errors first

      try {
        const productJson = modalOriginalProductData.value;
        if (!productJson) throw new Error("Original product data missing.");
        const product = JSON.parse(productJson);

        const quantity = parseInt(modalQuantityInput.value, 10);
        const price = parseFloat(modalPriceInput.value);

        // --- Validation ---
        if (
          isNaN(quantity) ||
          quantity < parseInt(modalQuantityInput.min || "1", 10)
        ) {
          showModalError(
            `Please enter a valid quantity (${
              modalQuantityInput.min || 1
            } or more).`
          );
          modalQuantityInput.focus();
          modalQuantityInput.select();
          return; // Stop processing
        }
        if (isNaN(price) || price <= 0) {
          // Allow 0 price? Assuming > 0 needed based on min="0.01"
          showModalError("Please enter a valid unit price (greater than 0).");
          modalPriceInput.focus();
          modalPriceInput.select();
          return; // Stop processing
        }

        // SKU Validation (if applicable)
        const skus = product.variants || product.skus;
        const skuRequired = skus && Array.isArray(skus) && skus.length > 0;
        const selectedSkuValue = modalSkuSelect.value;

        if (skuRequired && !selectedSkuValue) {
          showModalError("Please select a product variation (SKU).");
          modalSkuSelect.focus();
          return; // Stop processing
        }

        // --- Prepare item data (same as before) ---
        let itemNameToAdd = product.name;
        let itemProductData = { ...product };
        if (skuRequired && selectedSkuValue) {
          const selectedSkuData = skus.find(
            (sku) => sku.id === selectedSkuValue
          );
          if (selectedSkuData) {
            itemNameToAdd = `${product.name} - ${
              selectedSkuData.name || selectedSkuValue
            }`;
            itemProductData.selectedSkuId = selectedSkuValue;
            itemProductData.selectedSkuName = selectedSkuData.name;
          }
        }
        itemProductData.name = itemNameToAdd;

        console.log(
          `Adding from modal: Qty=${quantity}, Price=${price}`,
          itemProductData
        );

        saleManager.addItem(itemProductData, quantity, price);
        scanModalInstance.hide(); // Hide modal on success

        // --- Restart scanner logic (same as before) ---
        const canScan = scannerConfig.modelUrl && scannerConfig.metadataUrl;
        if (keepScanning && canScan && scanner && !scanner.isScanning) {
          console.log("Modal action complete, restarting scanner...");
          setTimeout(() => {
            if (!scanner.isScanning) {
              scanner.start();
            }
          }, 300);
        } else if (keepScanning && (!canScan || !scanner)) {
          console.warn(
            "Cannot restart scanner (not configured, not initialized, or keepScanning=false)"
          );
        }
      } catch (e) {
        console.error("Error processing modal data:", e);
        // Use the helper function to show the error
        showModalError(`Error: ${e.message || "Could not add product."}`);
      }
    };

    // Attach listeners (same as before)
    modalAddButton.addEventListener("click", () => {
      processModalAdd(false);
    });

    modalAddAndKeepScanningButton.addEventListener("click", () => {
      processModalAdd(true);
    });
  } else {
    console.warn(
      "One or more required modal elements or services not found. Modal 'Add' buttons may not function correctly."
    );
    // Disable buttons if elements are missing
    if (modalAddButton) modalAddButton.disabled = true;
    if (modalAddAndKeepScanningButton)
      modalAddAndKeepScanningButton.disabled = true;
  }

  // --- Update Modal Close Event ---
  scanModalElement?.addEventListener("hidden.bs.modal", () => {
    console.log("Scan modal closed.");
    // Clear sensitive data and reset fields when modal closes fully
    if (modalOriginalProductData) modalOriginalProductData.value = "";
    if (modalQuantityInput) modalQuantityInput.value = "1"; // Reset to 1
    if (modalPriceInput) modalPriceInput.value = "0.00"; // Reset price
    if (modalSkuSelect)
      modalSkuSelect.innerHTML =
        '<option selected disabled value="">Choose variation...</option>'; // Reset SKU select
    if (modalSkuSection) modalSkuSection.classList.add("d-none"); // Ensure SKU section is hidden
    if (modalTotalPrice) modalTotalPrice.textContent = formatCurrency(0); // Reset total display
    hideModalError(); // Ensure error is hidden
  });
  // 8. Attach Listener: Checkout Button
  if (checkoutButton) {
    checkoutButton.addEventListener("click", handleCheckout);
  }
  scanner.start();
  // Initial UI state
  updateScannerVisuals(true); // Scanner starts off
  // if (cameraSection) cameraSection.style.display = "none"; // Hide camera initially
});
