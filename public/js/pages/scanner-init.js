// /public/js/pages/scanner-init.js

// --- Imports ---
import { DbService } from "/public/js/pb.js"; // Import DbService for search
import { addProduct } from "/public/js/products.js"; // Your function to add products
import { ScannerService } from "/public/js/scanner.js";

// --- Utilities ---
/**
 * Debounce function
 * @param {Function} func The function to debounce.
 * @param {number} delay Delay in milliseconds.
 * @returns {Function} Debounced function.
 */
function debounce(func, delay) {
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

// --- Instantiate Services ---
const scanner = new ScannerService(scannerConfig);

// --- UI Elements Cache ---
const searchInput = document.getElementById("product-search-input");
const searchResultsContainer = document.getElementById("search-results");
const searchIndicator = document.getElementById("search-indicator");
const cameraSection = document.getElementById("camera-section"); // The whole right column card
const cameraContainer = document.getElementById("camera-container"); // The div wrapping the video/scanline
const scanToggleButton = document.getElementById("scan-toggle");
const scanToggleText = document.getElementById("scan-toggle-text"); // Span inside the button
const addProductButton = document.getElementById("add-product-btn");
const scanModalElement = document.getElementById("scanModal");
const scanModalInstance = scanModalElement
  ? new bootstrap.Modal(scanModalElement)
  : null;
const scanModalLabel = document.getElementById("scanModalLabel");
const scanModalBody = scanModalElement?.querySelector(".modal-body");
const scanModalFooter = scanModalElement?.querySelector(".modal-footer");
const scannerStatusElement = document.getElementById("scanner-status"); // Text status below camera

// --- Search Functionality ---
/**
 * Performs product search using PocketBase.
 * @param {string} searchTerm The term to search for.
 */
async function performProductSearch(searchTerm) {
  if (!searchResultsContainer || !searchIndicator) return;

  const trimmedSearchTerm = searchTerm.trim();

  // Clear previous results immediately unless search term is empty
  searchResultsContainer.innerHTML = "";
  searchResultsContainer.classList.remove("show");

  if (trimmedSearchTerm === "") {
    searchIndicator.style.display = "none"; // Ensure indicator is hidden
    return; // No search if term is empty
  }

  searchIndicator.style.display = "inline-block"; // Show indicator

  try {
    const filter = `name ~ '${trimmedSearchTerm.replace(
      /'/g,
      "''"
    )}' && company = '${companyId}'`;
    const products = await DbService.getList("products", {
      filter: filter,
      sort: "name",
      perPage: 10, // Limit results for dropdown
    });

    if (products && products.length > 0) {
      renderSearchResults(products, searchResultsContainer);
      searchResultsContainer.classList.add("show"); // Show results container
    } else {
      searchResultsContainer.innerHTML =
        '<li class="list-group-item text-muted fst-italic">No products found.</li>';
      searchResultsContainer.classList.add("show"); // Show "no results" message
    }
  } catch (error) {
    console.error("Product search failed:", error);
    searchResultsContainer.innerHTML =
      '<li class="list-group-item text-danger">Search failed. Please try again.</li>';
    searchResultsContainer.classList.add("show"); // Show error
  } finally {
    searchIndicator.style.display = "none"; // Hide indicator
  }
}

/**
 * Renders the search results in the specified container.
 * @param {Array<object>} products List of product records.
 * @param {HTMLElement} container The element to render results into.
 */
function renderSearchResults(products, container) {
  container.innerHTML = ""; // Clear previous (redundant but safe)
  products.forEach((product) => {
    const a = document.createElement("a");
    a.href = "#"; // Prevent page jump
    a.classList.add("list-group-item", "list-group-item-action");
    // Display more info if available, e.g., price or code
    a.textContent = `${product.name} ${
      product.price ? `($${product.price})` : ""
    }`;
    a.dataset.productId = product.id;
    a.dataset.productName = product.name; // Store name for input fill

    a.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Selected product:", product);
      searchInput.value = a.dataset.productName; // Fill input with just the name
      container.classList.remove("show"); // Hide results
      // Automatically trigger the add action for the selected product
      addProduct(product.id); // Call your addProduct function
      searchInput.value = ""; // Clear search input after adding
    });
    container.appendChild(a);
  });
}

// Debounced search function
const debouncedSearch = debounce(performProductSearch, 400); // Adjust delay as needed

// --- Scanner UI Update Function ---
/**
 * Updates the scanner related UI elements based on the scanning state.
 * @param {boolean} isScanning - The current scanning state from ScannerService.
 */
function updateScannerVisuals(isScanning) {
  if (!cameraSection || !cameraContainer || !scanToggleButton) return;

  if (isScanning) {
    cameraSection.style.display = "block"; // Show the camera card section
    cameraContainer.classList.add("scanning"); // Add class to enable animation
    if (scanToggleText) scanToggleText.textContent = "Stop Scanner";
    scanToggleButton.classList.remove("btn-outline-primary");
    scanToggleButton.classList.add("btn-danger"); // Red button for stop action
  } else {
    // Keep camera section visible even when stopped, hide only if toggled off explicitly?
    // Or hide it: cameraSection.style.display = 'none';
    cameraContainer.classList.remove("scanning"); // Remove class to stop animation
    if (scanToggleText) scanToggleText.textContent = "Start Scanner";
    scanToggleButton.classList.add("btn-outline-primary");
    scanToggleButton.classList.remove("btn-danger");
  }
}

// --- Callback Functions (UI Logic) ---
function handleProductDetected(product) {
  console.log("Callback: Product Detected!", product);
  // ScannerService should have already stopped scanning before calling this

  if (
    !scanModalInstance ||
    !scanModalLabel ||
    !scanModalBody ||
    !scanModalFooter
  ) {
    console.error("Scan modal elements not found for displaying result.");
    alert(`Product Found: ${product.name}`); // Fallback
    addProduct(product.id); // Add product even if modal fails
    return;
  }

  scanModalLabel.textContent = "Product Found";
  scanModalBody.innerHTML = `
        <p>Detected: <strong>${product.name || "Unknown Product"}</strong></p>
        <p>Price: ${product.price ?? "N/A"}</p>
        <p class="text-muted small">ID: ${product.id}</p>
    `;
  scanModalFooter.innerHTML = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary" id="modal-add-product-btn">Add to Sale</button>
    `;

  const modalAddBtn = document.getElementById("modal-add-product-btn");
  if (modalAddBtn) {
    modalAddBtn.replaceWith(modalAddBtn.cloneNode(true)); // Clear old listeners
    document
      .getElementById("modal-add-product-btn")
      .addEventListener("click", () => {
        console.log("Adding detected product from modal:", product.id);
        addProduct(product.id);
        scanModalInstance.hide();
        // Optional: Automatically restart scanner?
        // scanner.start();
      });
  }
  scanModalInstance.show();
}

function handleScannerError(errorMessage) {
  console.error("Callback: Scanner Error!", errorMessage);
  // Ensure scanner is stopped visually and functionally
  if (scanner.isScanning) {
    scanner.stop(); // Tell the service to stop
  } else {
    // If already stopped but error occurred (e.g., init fail), ensure UI reflects stopped state
    updateScannerVisuals(false);
  }

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
}

/**
 * Updates the status text and syncs the overall scanner UI visuals.
 * @param {string} statusMessage - Message from ScannerService.
 */
function updateScannerStatus(statusMessage) {
  console.log("Callback: Scanner Status:", statusMessage);
  if (scannerStatusElement) {
    scannerStatusElement.textContent = statusMessage;
  }
  // Update button text/style, camera visibility, and animation based on actual scanner state
  updateScannerVisuals(scanner.isScanning);
}

// --- Initialization and Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  // 1. Check essential config from Go
  if (!scannerConfig.modelUrl || !scannerConfig.metadataUrl) {
    handleScannerError(
      "Scanner configuration (model/metadata URL) is missing. Cannot initialize."
    );
    if (scanToggleButton) scanToggleButton.disabled = true;
    return; // Stop initialization
  }

  // 2. Initialize the scanner service (loads model etc.)
  scanner
    .initialize()
    .then((success) => {
      if (success) {
        if (scanToggleButton) scanToggleButton.disabled = false;
        updateScannerStatus("Scanner ready."); // Initial status update
      } else {
        if (scanToggleButton) scanToggleButton.disabled = true;
        // Error should have been handled by the onError callback during init
      }
    })
    .catch((err) => {
      // Catch any unexpected error during async initialize
      handleScannerError(`Unexpected initialization error: ${err.message}`);
      if (scanToggleButton) scanToggleButton.disabled = true;
    });

  // 3. Attach listener to the Scan Toggle button
  if (scanToggleButton) {
    scanToggleButton.addEventListener("click", () => {
      scanner.toggle(); // Let the service handle state change
      // UI updates will happen via the onStatusChange callback
    });
  } else {
    console.warn("Scan toggle button (#scan-toggle) not found.");
  }

  // 4. Attach listener for the Manual Add button
  if (addProductButton && searchInput) {
    addProductButton.addEventListener("click", () => {
      const searchTerm = searchInput.value.trim();
      if (searchTerm) {
        console.log("Manual add button clicked for:", searchTerm);
        // Here, you need logic to determine the product ID from the search term.
        // Option 1: Assume the user selected from dropdown (ID might be stored elsewhere)
        // Option 2: Perform a quick search/lookup for an exact match? Risky.
        // Option 3: Require selection from dropdown (most reliable)
        alert("Please select a product from the search results list to add."); // Placeholder action
        // If you have the ID (e.g., from a hidden input populated by dropdown click):
        // const productId = document.getElementById('selected-product-id')?.value;
        // if (productId) {
        //     addProduct(productId);
        //     searchInput.value = ''; // Clear input
        // }
      } else {
        console.log("Manual add: No product specified in search input.");
      }
    });
  }

  // 5. Attach listener for Search Input
  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      debouncedSearch(event.target.value);
    });
    // Clear results if input is cleared manually
    searchInput.addEventListener("search", (event) => {
      if (!event.target.value) {
        searchResultsContainer.innerHTML = "";
        searchResultsContainer.classList.remove("show");
      }
    });
  }

  // 6. Add Click Outside Listener for search results
  document.addEventListener("click", (event) => {
    if (
      searchResultsContainer &&
      searchInput &&
      !searchInput.contains(event.target) &&
      !searchResultsContainer.contains(event.target)
    ) {
      searchResultsContainer.classList.remove("show");
    }
  });

  // 7. Optional: Modal close event
  scanModalElement?.addEventListener("hidden.bs.modal", () => {
    console.log("Scan modal closed.");
    // Reset modal body/footer?
    if (scanModalBody) scanModalBody.innerHTML = "<p>...</p>";
    if (scanModalFooter)
      scanModalFooter.innerHTML =
        '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>';
    // Decide whether to restart scanning
    // if (!scanner.isScanning) { scanner.start(); }
  });

  // Initial UI state for scanner (assuming it starts off)
  updateScannerVisuals(false);
  if (cameraSection) cameraSection.style.display = "none"; // Keep camera hidden initially
});
