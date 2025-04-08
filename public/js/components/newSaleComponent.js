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

      // Initialize stores that need DOM elements or initial data
      // Stores are assumed to be registered by alpine:init before this runs
      Alpine.store("scanner")?.initScanner(
        this.modelInfo, // Pass the whole modelInfo object
        this.$refs.cameraView
      );
      Alpine.store("modal")?.initModal(this.$refs.scanModal);

      if (!this.companyId) {
        console.warn("Company ID missing.");
      }
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

    // --- Search Methods ---
    async searchProducts() {
      if (!this.companyId || this.searchTerm.trim().length < 2) {
        /* ... clear results ... */ return;
      }
      this.isSearching = true;
      this.searchResults = [];
      try {
        /* ... copy search try/catch block ... */
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
        /* ... copy error handling ... */
        console.error("Product search failed:", error);
        this.searchResults = [{ id: "error", name: "Search failed." }];
      } finally {
        this.isSearching = false;
      }
    },
    handleSearchResultClick(product) {
      Alpine.store("sale").addItem(product, 1, product.price ?? 0); // Call sale store
      this.searchTerm = "";
      this.searchResults = [];
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
