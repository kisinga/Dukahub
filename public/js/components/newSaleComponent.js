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

      // --- Initialize Credit Modal Instance (still needed to show/hide) ---
      if (this.$refs.creditModal && typeof bootstrap !== "undefined") {
        this._creditModalInstance = new bootstrap.Modal(this.$refs.creditModal);
        // NOTE: The hidden.bs.modal listener is now inside the creditModalComponent's init
      } else {
        console.error(
          "Credit modal element or Bootstrap not found for initialization in parent."
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
      this.selectedCustomer = null;
      this.creditModalStatus = { message: "", type: "" };
      // Don't reset isCheckingOut here, it's handled by the checkout flows
    },

    async searchCustomers() {
      if (!this.companyId || this.creditSearchTerm.trim().length < 1) {
        // Search on 1 char? Adjust if needed
        this.creditSearchResults = [];
        return;
      }
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

      this.checkoutTarget = isCreditSale ? "credit" : "pay";

      if (isCreditSale) {
        console.log("Opening CREDIT modal...");
        if (this._creditModalInstance) {
          // Optional: Clear any previous modal status before showing
          Alpine.store("modal")?.resetCreditModalState?.(); // If store method exists
          this._creditModalInstance.show();
        } else {
          console.error("Cannot open credit modal: instance not available.");
        }
      } else {
        console.log("Initiating PAY sale...");
        this.processCashCheckout();
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
    handleCreditSaleConfirmation(detail) {
      const customerId = detail?.customerId;
      console.log(
        `Received confirm-credit-sale event for customer: ${customerId}`
      );
      if (!customerId) {
        console.error(
          "Credit sale confirmation failed: No customer ID received."
        );
        // Optionally update credit modal status via store/direct access if needed
        return;
      }
      // Call submit with credit flag and customer ID
      this.submitSaleToBackend(true, customerId);
    },
    // Centralized function to submit sale data to the backend
    async submitSaleToBackend(isCredit, customerId) {
      // Prevent double submission if already checking out
      if (this.isCheckingOut) {
        console.warn("Submission prevented: Checkout already in progress.");
        return;
      }

      const saleStore = Alpine.store("sale");
      if (!saleStore) {
        console.error("Sale store not found.");
        return;
      } // Added check
      const saleData = saleStore.getSaleDataForCheckout();

      const payload = {
        ...saleData,
        isCredit: isCredit,
        customerId: customerId,
      };
      console.log("Submitting sale to backend:", payload);

      this.isCheckingOut = true; // Set flag HERE
      // Reset status messages before fetch
      this.checkoutStatus = { message: "", type: "" };
      // Access credit modal component's state if needed, or rely on its internal status
      // For simplicity, let credit modal manage its own status display for processing
      if (this.checkoutTarget === "pay") {
        this.checkoutStatus = {
          message: "Processing sale...",
          type: "text-info",
        };
      }
      // Credit modal shows its own "Submitting..." message internally now

      try {
        const response = await fetch("/api/sales", {
          /* ... fetch options ... */ method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          /* ... error handling ... */
          let errorMsg = `HTTP error ${response.status}`;
          try {
            errorMsg = (await response.json()).message || errorMsg;
          } catch (e) {}
          throw new Error(errorMsg);
        }
        const result = await response.json();
        console.log("Checkout successful:", result);

        const successMessage = `Sale completed! (ID: ${
          result.saleId || "N/A"
        })`;
        if (this.checkoutTarget === "pay") {
          this.checkoutStatus = {
            message: successMessage,
            type: "text-success",
          };
        } else {
          // Credit sale success: Close the modal, maybe show brief success in main status
          if (this._creditModalInstance) this._creditModalInstance.hide();
          this.checkoutStatus = {
            message: "Credit sale completed.",
            type: "text-success",
          };
          // Credit modal's internal status is cleared on hide by its own listener
        }

        saleStore.clearSale();
        setTimeout(() => {
          this.checkoutStatus = { message: "", type: "" };
        }, 5000);
        return result; // Success
      } catch (error) {
        console.error("Checkout submission failed:", error);
        const errorMessage = `Checkout failed: ${error.message}.`;
        if (this.checkoutTarget === "pay") {
          this.checkoutStatus = { message: errorMessage, type: "text-danger" };
        } else {
          // Show error within the credit modal (it's still open)
          // Accessing other component's state directly is less ideal,
          // but possible if needed, or dispatch another event back.
          // Let's assume credit modal shows its own error for now.
          // We need to update its status.
          const creditModalComponent = this.$refs.creditModal.__x.$data; // Access component data (use with caution)
          if (creditModalComponent) {
            creditModalComponent.creditModalStatus = {
              message: errorMessage,
              type: "text-danger",
            };
          } else {
            // Fallback if direct access fails
            this.checkoutStatus = {
              message: `Credit Sale Error: ${errorMessage}`,
              type: "text-danger",
            };
          }
        }
        // Don't re-throw here unless needed upstream
      } finally {
        this.isCheckingOut = false; // Reset flag HERE
        this.checkoutTarget = null;
      }
    },
  };
}

export default newSaleComponentLogic;
