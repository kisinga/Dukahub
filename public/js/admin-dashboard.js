// This file contains Alpine.js data functions to manage different sections of the admin dashboard.
// These functions are intended to be used with `x-data` attributes on the corresponding HTML elements.
// Ensure Alpine.js is loaded before this script (e.g., <script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>).

import { DbService } from "./pb.js"; // Import DbService

document.addEventListener("alpine:init", () => {
  /**
   * Alpine.js handler for the Model Modal.
   * Manages displaying model information when the Bootstrap modal is shown.
   */
  Alpine.data("modelModalHandler", () => ({
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
  }));

  /**
   * Alpine.js handler for the Create Company Form.
   * Manages form input and submission for creating a new company.
   * Apply this to your form element, e.g., <form id="createCompanyForm" x-data="createCompanyFormHandler()" x-on:submit.prevent="submitForm">.
   */
  Alpine.data("createCompanyFormHandler", () => ({
    companyName: "",
    companyLocation: "",
    companyPhone: "",
    companyLogo: "", // Assuming this input exists in the form

    /**
     * Handles the form submission for creating a new company.
     */
    async submitForm() {
      try {
        const companyData = {
          name: this.companyName,
          location: this.companyLocation,
          phone: this.companyPhone,
          logo: this.companyLogo,
        };
        const newCompany = await DbService.create("companies", companyData);

        if (newCompany) {
          alert("Company created successfully!");
          location.reload(); // Reload to reflect new company
        } else {
          alert("Error creating company.");
        }
      } catch (error) {
        console.error("Error creating company:", error);
        alert(`An error occurred while creating the company: ${error.message}`);
      }
    },
  }));

  /**
   * Alpine.js handler for the Edit Company Modal and Form.
   * Manages populating edit form with existing data and handling form submission for updates.
   * Apply this to your edit modal element, e.g., <div id="editCompanyModal" x-data="editCompanyFormHandler()">.
   */
  Alpine.data("editCompanyFormHandler", () => ({
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
        this.companyLogo = button.getAttribute("data-company-logo"); // Set companyLogo from data attribute
      });
    },

    /**
     * Handles the form submission for updating an existing company.
     * Use with x-on:submit.prevent="submitForm" on the form element inside the modal.
     */
    async submitForm() {
      try {
        const companyData = {
          name: this.companyName,
          location: this.companyLocation,
          phone: this.companyPhone,
          logo: this.companyLogo,
        };
        const updatedCompany = await DbService.update(
          "companies",
          this.companyId,
          companyData
        );

        if (updatedCompany) {
          alert("Company updated successfully!");
          location.reload(); // Reload to reflect updated company
        } else {
          alert("Error updating company.");
        }
      } catch (error) {
        console.error("Error updating company:", error);
        alert(`An error occurred while updating the company: ${error.message}`);
      }
    },
  }));

  /**
   * Alpine.js handler for the Delete Company Modal and Confirmation.
   * Manages displaying company name to be deleted and handles the deletion confirmation.
   * Apply this to your delete modal element, e.g., <div id="deleteCompanyModal" x-data="deleteCompanyHandler()">.
   */
  Alpine.data("deleteCompanyHandler", () => ({
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
        // Perform soft delete by updating the 'is_deleted' field
        const updatedCompany = await DbService.update(
          "companies",
          this.companyId,
          { is_deleted: true }
        );

        if (updatedCompany) {
          alert("Company deleted successfully!");
          location.reload(); // Reload to reflect deleted company
        } else {
          alert("Error deleting company.");
        }
      } catch (error) {
        console.error("Error deleting company:", error);
        alert(`An error occurred while deleting the company: ${error.message}`);
      }
    },
  }));
});
