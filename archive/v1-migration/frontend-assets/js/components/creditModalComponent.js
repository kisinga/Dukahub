// public/js/components/creditModalComponent.js
// Note: Relies on global Alpine, bootstrap, DbService
// Interacts with parent component via $dispatch and reading $root state ($root.isCheckingOut, $root.companyId)
import { DbService } from "/public/js/pb.js";

// --- Debounce Utility (Include if not globally available) ---
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}
// -----------------------------------------------------------

function creditModalComponentLogic() {
  return {
    // --- Credit Modal State ---
    creditSearchTerm: "",
    creditSearchResults: [],
    isSearchingCustomers: false,
    selectedCustomer: null, // Holds the selected customer object {id, name, phone, ...}
    creditModalStatus: { message: "", type: "" }, // Status inside this modal
    // _creditModalInstance: null, // Instance managed by parent via x-ref now

    // --- Debounced Search ---
    debouncedCustomerSearch: null,

    // --- Initialization ---
    init() {
      console.log("Credit Modal component initialized.");
      // Initialize debounced search
      this.debouncedCustomerSearch = debounce(
        this.searchCustomers.bind(this),
        350
      );

      // Add listener to clear state when modal is hidden (triggered by parent's instance)
      // We access the element via $el within the component scope
      this.$el.addEventListener("hidden.bs.modal", () => {
        this.resetCreditModalState();
      });
    },

    // --- Credit Modal Methods ---
    resetCreditModalState() {
      console.log("Resetting credit modal state");
      this.creditSearchTerm = "";
      this.creditSearchResults = [];
      this.isSearchingCustomers = false;
      this.selectedCustomer = null;
      this.creditModalStatus = { message: "", type: "" };
    },

    async searchCustomers() {
      // Access companyId from the parent component's scope ($root refers to the nearest parent x-data)
      const companyId = this.$root.companyId;
      if (!companyId || this.creditSearchTerm.trim().length < 1) {
        this.creditSearchResults = [];
        this.isSearchingCustomers = false;
        return;
      }
      this.isSearchingCustomers = true;
      this.creditSearchResults = [];
      console.log(
        `Searching customers for: ${this.creditSearchTerm} in company ${companyId}`
      );

      try {
        const term = this.creditSearchTerm.trim().replace(/'/g, "''");
        const filter = `(name ~ '${term}' || phone ~ '${term}') && company = '${companyId}'`;
        const customers = await DbService.getList("customers", {
          // Replace 'customers' if needed
          filter: filter,
          sort: "name",
          perPage: 10,
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

    // Method to handle the "Confirm" button click
    confirmCreditSale() {
      // Check parent's checking out state and if customer is selected
      if (!this.selectedCustomer || this.$root.isCheckingOut) {
        console.warn(
          "Confirm credit sale prevented. No customer selected or checkout already in progress."
        );
        return;
      }
      console.log(
        `Dispatching confirm-credit-sale event for customer: ${this.selectedCustomer.id}`
      );
      // Dispatch event to the parent component with the customer ID
      this.$dispatch("confirm-credit-sale", {
        customerId: this.selectedCustomer.id,
      });
      // Parent component (newSale) will handle setting isCheckingOut and calling submitSaleToBackend
      // Parent component will also handle closing the modal on success
      // We can show a local "processing" message here if desired, but parent handles main state
      this.creditModalStatus = { message: "Submitting...", type: "text-info" };
    },

    // Placeholder for createNewCustomer logic (can dispatch another event or open another modal)
    createNewCustomer(searchTerm = "") {
      console.log("Create New Customer clicked. Search term:", searchTerm);
      // Option 1: Dispatch an event for the parent to handle opening a different "create customer" modal/view
      this.$dispatch("create-new-customer", { initialName: searchTerm }); // Pass initial data if needed
      alert(
        "Create New Customer functionality not yet implemented in this component."
      );

      // Option 2: Implement a simple inline form within this modal (more complex)
      // Option 3: Navigate to a separate create customer page
    },
  };
}

export default creditModalComponentLogic;
