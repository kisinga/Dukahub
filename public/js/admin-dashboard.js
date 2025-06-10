// This file contains Alpine.js data functions to manage different sections of the admin dashboard.
// These functions are intended to be used with `x-data` attributes on the corresponding HTML elements.
// Ensure Alpine.js is loaded before this script (e.g., <script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>).

/**
 * Alpine.js handler for the Model Modal.
 * Manages displaying model information when the Bootstrap modal is shown.
 */
function modelModalHandler() {
  return {
    companyName: "",
    modelStatus: "",
    trainDate: "",
    newItems: "",
    newImages: "",
    totalImages: "",

    init() {
      // Listen for Bootstrap's 'show.bs.modal' event to populate data
      this.$el.addEventListener("show.bs.modal", (event) => {
        const button = event.relatedTarget;
        this.companyName = button.getAttribute("data-company");
        this.modelStatus = button.getAttribute("data-status");
        this.trainDate = button.getAttribute("data-train-date");
        this.newItems = button.getAttribute("data-new-items");
        this.newImages = button.getAttribute("data-new-images");
        this.totalImages = button.getAttribute("data-total-images");
      });
    },

    /**
     * Dynamically determines the Bootstrap badge class based on modelStatus.
     * Use with `:class="getStatusBadgeClass()"` on the status element.
     */
    getStatusBadgeClass() {
      if (this.modelStatus === "Trained") {
        return "badge rounded-pill bg-success";
      } else if (this.modelStatus === "Untrained") {
        return "badge rounded-pill bg-danger";
      } else {
        return "badge rounded-pill bg-warning";
      }
    },
  };
}

/**
 * Alpine.js handler for the Create Company Form.
 * Manages form input and submission for creating a new company.
 * Apply this to your form element, e.g., <form id="createCompanyForm" x-data="createCompanyFormHandler()" x-on:submit.prevent="submitForm">.
 */
function createCompanyFormHandler() {
  return {
    companyName: "",
    companyLocation: "",
    companyPhone: "",
    companyLogo: "", // Assuming this input exists in the form

    /**
     * Handles the form submission for creating a new company.
     */
    async submitForm() {
      try {
        const response = await fetch("/admin/companies", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: this.companyName,
            location: this.companyLocation,
            phone: this.companyPhone,
            logo: this.companyLogo,
          }),
        });

        if (response.ok) {
          alert("Company created successfully!");
          location.reload(); // Reload to reflect new company
        } else {
          const errorData = await response.json();
          alert(`Error creating company: ${errorData.message}`);
        }
      } catch (error) {
        console.error("Error creating company:", error);
        alert("An error occurred while creating the company.");
      }
    },
  };
}

/**
 * Alpine.js handler for the Edit Company Modal and Form.
 * Manages populating edit form with existing data and handling form submission for updates.
 * Apply this to your edit modal element, e.g., <div id="editCompanyModal" x-data="editCompanyFormHandler()">.
 */
function editCompanyFormHandler() {
  return {
    companyId: "",
    companyName: "",
    companyLocation: "",
    companyPhone: "",
    companyLogo: "", // Assuming this input exists in the form for update

    init() {
      // Listen for Bootstrap's 'show.bs.modal' event to populate data
      this.$el.addEventListener("show.bs.modal", (event) => {
        const button = event.relatedTarget;
        this.companyId = button.getAttribute("data-company-id");
        this.companyName = button.getAttribute("data-company-name");
        this.companyLocation = button.getAttribute("data-company-location");
        this.companyPhone = button.getAttribute("data-company-phone");
        // companyLogo might need to be set if available, or cleared for new input
        this.companyLogo = ""; // Clear for new input or set from data-attribute if available
      });
    },

    /**
     * Handles the form submission for updating an existing company.
     * Use with x-on:submit.prevent="submitForm" on the form element inside the modal.
     */
    async submitForm() {
      try {
        const response = await fetch(`/admin/companies/${this.companyId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: this.companyName,
            location: this.companyLocation,
            phone: this.companyPhone,
            logo: this.companyLogo,
          }),
        });

        if (response.ok) {
          alert("Company updated successfully!");
          location.reload(); // Reload to reflect updated company
        } else {
          const errorData = await response.json();
          alert(`Error updating company: ${errorData.message}`);
        }
      } catch (error) {
        console.error("Error updating company:", error);
        alert("An error occurred while updating the company.");
      }
    },
  };
}

/**
 * Alpine.js handler for the Delete Company Modal and Confirmation.
 * Manages displaying company name to be deleted and handles the deletion confirmation.
 * Apply this to your delete modal element, e.g., <div id="deleteCompanyModal" x-data="deleteCompanyHandler()">.
 */
function deleteCompanyHandler() {
  return {
    companyId: "",
    companyNameToDelete: "",

    init() {
      // Listen for Bootstrap's 'show.bs.modal' event to populate data
      this.$el.addEventListener("show.bs.modal", (event) => {
        const button = event.relatedTarget;
        this.companyId = button.getAttribute("data-company-id");
        this.companyNameToDelete = button.getAttribute("data-company-name");
      });
    },

    /**
     * Handles the confirmation of deleting a company.
     * Use with x-on:click="confirmDelete" on the confirm delete button.
     */
    async confirmDelete() {
      try {
        const response = await fetch(`/admin/companies/${this.companyId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          alert("Company deleted successfully!");
          location.reload(); // Reload to reflect deleted company
        } else {
          const errorData = await response.json();
          alert(`Error deleting company: ${errorData.message}`);
        }
      } catch (error) {
        console.error("Error deleting company:", error);
        alert("An error occurred while deleting the company.");
      }
    },
  };
}
