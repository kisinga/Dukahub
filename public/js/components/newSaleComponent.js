// public/js/components/newSaleComponent.js
import { DbService } from "/public/js/pb.js";

// --- Debounce Utility (if not already global/imported elsewhere) ---
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}
// --------------------------------------------------------------------

function newSaleComponentLogic() {
  return {
    // --- Component State ---
    companyId: null,
    modelInfo: null,
    searchTerm: "",
    searchResults: [],
    isSearching: false,
    checkoutStatus: { message: "", type: "" }, // Status for direct PAY checkout
    isCheckingOut: false, // General flag to disable buttons during any checkout
    checkoutTarget: null, // 'pay' or 'credit' to show spinner on correct button
    initialized: false,

    // --- Credit Modal State ---
    creditSearchTerm: "",
    creditSearchResults: [],
    isSearchingCustomers: false,
    selectedCustomer: null, // Holds the selected customer object {id, name, phone, ...}
    creditModalStatus: { message: "", type: "" }, // Status inside the credit modal
    _creditModalInstance: null, // Bootstrap instance for credit modal

    // --- Debounced Search ---
    debouncedCustomerSearch: null, // Initialize in init

    // --- Initialization ---
    init() {
      if (this.initialized) return;
      this.initialized = true;
      console.log("Initializing NewSale Alpine component...");
      this.loadPageData();

      // Initialize debounced search here
      this.debouncedCustomerSearch = debounce(
        this.searchCustomers.bind(this),
        350
      );

      const scannerStore = Alpine.store("scanner");
      const modalStore = Alpine.store("modal"); // Scan modal store

      scannerStore?.initScanner(this.modelInfo, this.$refs.cameraView);
      modalStore?.initModal(this.$refs.scanModal); // Scan modal init

      // --- Initialize Credit Modal Instance ---
      if (this.$refs.creditModal && typeof bootstrap !== "undefined") {
        this._creditModalInstance = new bootstrap.Modal(this.$refs.creditModal);
        // Optional: Add listener to clear state when credit modal closes
        this.$refs.creditModal.addEventListener("hidden.bs.modal", () => {
          this.resetCreditModalState();
        });
      } else {
        console.error(
          "Credit modal element or Bootstrap not found for initialization."
        );
      }
      // --- End Credit Modal Init ---

      if (!this.companyId) {
        console.warn("Company ID missing.");
      }
      this.startScannerOnMobile();
    },

    loadPageData() {
      /* ... no change ... */
    },
    startScannerOnMobile() {
      /* ... no change ... */
    },

    // --- Credit Modal Methods ---
    openCreditModal() {
      if (!this._creditModalInstance) return;
      this.resetCreditModalState(); // Clear previous state
      this._creditModalInstance.show();
      // Optional: Focus search input
      // setTimeout(() => document.getElementById('customer-search-input')?.focus(), 500); // Delay needed after modal shows
    },

    resetCreditModalState() {
      this.creditSearchTerm = "";
      this.creditSearchResults = [];
      this.isSearchingCustomers = false;
      this.selectedCustomer = null;
      this.creditModalStatus = { message: "", type: "" };
      // Don't reset isCheckingOut here, it's handled by the checkout flows
    },

    async searchCustomers() {
      if (!this.companyId || this.creditSearchTerm.trim().length < 1) {
        // Search on 1 char? Adjust if needed
        this.creditSearchResults = [];
        this.isSearchingCustomers = false;
        return;
      }
      this.isSearchingCustomers = true;
      this.creditSearchResults = [];
      console.log(`Searching customers for: ${this.creditSearchTerm}`);

      try {
        const term = this.creditSearchTerm.trim().replace(/'/g, "''");
        // Adjust filter based on your customer fields (e.g., name, phone)
        const filter = `(name ~ '${term}' || phone ~ '${term}') && company = '${this.companyId}'`;
        // Replace 'customers' with your actual customer collection name
        const customers = await DbService.getList("customers", {
          filter: filter,
          sort: "name",
          perPage: 10, // Limit results
        });
        this.creditSearchResults =
          customers.length === 0
            ? [{ id: "not_found", name: "No customers found." }]
            : customers;
      } catch (error) {
        console.error("Customer search failed:", error);
        this.creditSearchResults = [
          { id: "error", name: "Customer search failed." },
        ];
      } finally {
        this.isSearchingCustomers = false;
      }
    },

    selectCustomer(customer) {
      console.log("Selected customer:", customer);
      this.selectedCustomer = customer;
      this.creditSearchTerm = ""; // Clear search
      this.creditSearchResults = []; // Hide results
      this.creditModalStatus = { message: "", type: "" }; // Clear status
    },

    loadPageData() {
      try {
        /* ... copy loadPageData logic ... */
        const dataElement = document.getElementById("page-data");
        if (!dataElement) throw new Error("Page data script tag not found.");
        const data = JSON.parse(dataElement.textContent);
        this.companyId = data.companyId;
        this.modelInfo = data.modelInfo;
        console.log("Page data loaded:", data);
      } catch (error) {
        /* ... copy error handling ... */
        console.error("Failed to read or parse page data:", error);
        alert("Error loading page configuration.");
        this.companyId = null;
        this.modelInfo = null;
      }
    },
    startScannerOnMobile() {
      const isMobile = navigator.maxTouchPoints > 0; // Detect touch capability
      console.log(
        `Device check: isMobile = ${isMobile} (maxTouchPoints: ${navigator.maxTouchPoints})`
      );

      if (isMobile) {
        const scannerStore = Alpine.store("scanner");
        // Check if scanner is configured and not already starting/running/in error
        if (
          scannerStore?.isConfigured &&
          !scannerStore.isScanning &&
          scannerStore.status !== "error"
        ) {
          console.log(
            "Mobile device detected, attempting to auto-start scanner..."
          );
          // Use a small timeout to ensure the UI has settled after init
          setTimeout(() => {
            // Re-check state before starting, in case user clicked manually
            if (
              scannerStore.isConfigured &&
              !scannerStore.isScanning &&
              scannerStore.status !== "error"
            ) {
              scannerStore.start();
            }
          }, 100); // 100ms delay, adjust if needed
        } else if (scannerStore && !scannerStore.isConfigured) {
          console.log("Mobile device detected, but scanner is not configured.");
        } else {
          console.log(
            "Mobile device detected, but scanner is already active or in error state."
          );
        }
      } else {
        console.log("Desktop device detected, scanner requires manual start.");
      }
    },
    // --- Search Methods ---
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
        // --- Corrected Filter with Company ID ---
        const filter = `(name ~ '${term}' || barcode ~ '${term}') && company = '${this.companyId}'`;
        // --- End Correction ---
        const products = await DbService.getList("products", {
          filter: filter,
          sort: "name",
          perPage: 3,
          // --- Expand SKUs directly in search results ---
          expand: "skus",
          // --- End Expand ---
        });
        this.searchResults =
          products.length === 0
            ? [{ id: "not_found", name: "No products found." }]
            : products;

        // fetch all the inventory details for the found products
        const inventoryPromises = products.map((product) =>
          DbService.getList("inventory", {
            filter: `product = '${product.id}'`,
            perPage: 1,
          })
        );
        const inventoryResults = await Promise.all(inventoryPromises);

        // each inventory result maps to an sku in the product
        this.searchResults.forEach((product, index) => {
          const inventory = inventoryResults[index];
          if (inventory.length > 0) {
            product.inventory = inventory; // Assuming you want the first inventory item
          } else {
            product.inventory = null; // No inventory found
          }
        });
        console.log("Search results:", this.searchResults);
      } catch (error) {
        console.error("Product search failed:", error);
        this.searchResults = [{ id: "error", name: "Search failed." }];
      } finally {
        this.isSearching = false;
      }
    },

    handleSearchResultClick(product) {
      console.log("Selected from search, opening modal:", product);
      // --- Open Modal instead of adding directly ---
      Alpine.store("modal").open(product);
      // --- End Change ---
      this.searchTerm = ""; // Clear search term
      this.searchResults = []; // Hide results dropdown
    },

    // Main checkout function called by buttons
    checkout(isCreditSale = false) {
      const saleStore = Alpine.store("sale");
      if (saleStore?.items.length === 0 || this.isCheckingOut) return;

      this.checkoutTarget = isCreditSale ? "credit" : "pay"; // Set target for spinner

      if (isCreditSale) {
        console.log("Initiating CREDIT sale...");
        this.openCreditModal(); // Open modal, don't process yet
      } else {
        console.log("Initiating PAY sale...");
        this.processCashCheckout(); // Process immediately
      }
    },

    // Handles the direct PAY checkout process
    async processCashCheckout() {
      this.isCheckingOut = true; // Set general flag
      this.checkoutStatus = {
        message: "Processing sale...",
        type: "text-info",
      };
      try {
        await this.submitSaleToBackend(false, null); // isCredit=false, no customerId
        // Success handled within submitSaleToBackend now
      } catch (error) {
        // Error handled within submitSaleToBackend now
      } finally {
        // submitSaleToBackend will reset isCheckingOut and checkoutTarget
      }
    },

    // Handles the final submission after customer is selected in CREDIT modal
    async confirmCreditSale() {
      if (!this.selectedCustomer || this.isCheckingOut) return;

      this.isCheckingOut = true; // Set general flag
      this.creditModalStatus = {
        message: "Processing credit sale...",
        type: "text-info",
      };
      try {
        await this.submitSaleToBackend(true, this.selectedCustomer.id); // isCredit=true, pass customerId
        // Success handled within submitSaleToBackend
        if (this._creditModalInstance) this._creditModalInstance.hide(); // Close modal on success
      } catch (error) {
        // Error handled within submitSaleToBackend
        // Keep modal open on error? Or close? Current logic keeps it open.
      } finally {
        // submitSaleToBackend will reset isCheckingOut and checkoutTarget
      }
    },
    // Centralized function to submit sale data to the backend
    async submitSaleToBackend(isCredit, customerId) {
      const saleStore = Alpine.store("sale");
      const saleData = saleStore.getSaleDataForCheckout();

      // Add credit-specific info to the payload
      const payload = {
        ...saleData,
        isCredit: isCredit,
        customerId: customerId, // Will be null for non-credit sales
      };

      console.log("Submitting sale to backend:", payload);

      // Reset specific status messages before fetch
      this.checkoutStatus = { message: "", type: "" };
      this.creditModalStatus = { message: "", type: "" };
      // Show processing message based on target
      if (this.checkoutTarget === "pay") {
        this.checkoutStatus = {
          message: "Processing sale...",
          type: "text-info",
        };
      } else if (this.checkoutTarget === "credit") {
        this.creditModalStatus = {
          message: "Processing credit sale...",
          type: "text-info",
        };
      }

      try {
        const response = await fetch("/api/sales", {
          // Your endpoint
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          let errorMsg = `HTTP error ${response.status}`;
          try {
            errorMsg = (await response.json()).message || errorMsg;
          } catch (e) {}
          throw new Error(errorMsg);
        }

        const result = await response.json();
        console.log("Checkout successful:", result);

        // Display success message (use general status for PAY, modal status for CREDIT)
        const successMessage = `Sale completed! (ID: ${
          result.saleId || "N/A"
        })`;
        if (this.checkoutTarget === "pay") {
          this.checkoutStatus = {
            message: successMessage,
            type: "text-success",
          };
        } else {
          // For credit, we might want the main status updated too, or just clear modal
          this.creditModalStatus = {
            message: successMessage,
            type: "text-success",
          };
          // Optionally update main status too:
          // this.checkoutStatus = { message: "Credit sale completed.", type: "text-success" };
        }

        saleStore.clearSale(); // Clear the sale items

        // Clear status message after a delay
        setTimeout(() => {
          this.checkoutStatus = { message: "", type: "" };
          // Don't clear creditModalStatus here if modal closes on success
        }, 5000);

        // Indicate success by resolving promise (optional)
        return result;
      } catch (error) {
        console.error("Checkout submission failed:", error);
        // Display error message (use general status for PAY, modal status for CREDIT)
        const errorMessage = `Checkout failed: ${error.message}.`;
        if (this.checkoutTarget === "pay") {
          this.checkoutStatus = { message: errorMessage, type: "text-danger" };
        } else {
          this.creditModalStatus = {
            message: errorMessage,
            type: "text-danger",
          };
        }
        // Re-throw error to signal failure to caller if needed
        throw error;
      } finally {
        this.isCheckingOut = false; // Reset general flag
        this.checkoutTarget = null; // Reset target
      }
    },
  };
}

export default newSaleComponentLogic;
