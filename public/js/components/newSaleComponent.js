// Note: This component logic relies on the global 'Alpine' and 'DbService'
// It also interacts with the globally registered 'sale', 'scanner', and 'modal' stores.
import { DbService } from "/public/js/pb.js"; // Import dependency

function newSaleComponentLogic() {
  return {
    // --- Component State ---
    companyId: null,
    modelInfo: null, // Holds the object with model URLs
    searchTerm: "",
    searchResults: [],
    isSearching: false,
    checkoutStatus: { message: "", type: "" },
    isCheckingOut: false,
    initialized: false, // Initialization guard

    // --- Initialization ---
    init() {
      if (this.initialized) return;
      this.initialized = true;
      console.log("Initializing NewSale Alpine component...");
      this.loadPageData(); // Loads companyId and modelInfo
      // Get store references AFTER they are registered in alpine:init
      const scannerStore = Alpine.store("scanner");
      const modalStore = Alpine.store("modal");

      // Initialize stores that need DOM elements or initial data
      // Use optional chaining just in case stores aren't ready (though they should be)
      scannerStore?.initScanner(
        this.modelInfo, // Pass the whole modelInfo object
        this.$refs.cameraView
      );
      modalStore?.initModal(this.$refs.scanModal);

      if (!this.companyId) {
        console.warn("Company ID missing.");
      }
      this.startScannerOnMobile();
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
        const filter = `name ~ '${term}' || barcode ~ '${term}' && company = '${this.companyId}'`;
        // --- End Correction ---
        const products = await DbService.getList("products", {
          filter: filter,
          sort: "name",
          perPage: 10,
          // --- Expand SKUs directly in search results ---
          expand: "skus",
          // --- End Expand ---
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
      console.log("Selected from search, opening modal:", product);
      // --- Open Modal instead of adding directly ---
      Alpine.store("modal").open(product);
      // --- End Change ---
      this.searchTerm = ""; // Clear search term
      this.searchResults = []; // Hide results dropdown
    },

    // --- Checkout Method ---
    async checkout() {
      const saleStore = Alpine.store("sale"); // Access sale store
      if (saleStore?.items.length === 0 || this.isCheckingOut) return;
      const saleData = saleStore.getSaleDataForCheckout();
      this.isCheckingOut = true;
      this.checkoutStatus = {
        message: "Processing sale...",
        type: "text-info",
      };
      try {
        /* ... copy checkout try/catch block ... */
        const response = await fetch("/api/sales", {
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
        /* ... copy error handling ... */
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

export default newSaleComponentLogic;
