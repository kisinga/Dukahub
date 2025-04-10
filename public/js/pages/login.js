// /public/js/pages/login_alpine.js

import { DbService } from "/public/js/pb.js";

document.addEventListener("alpine:init", () => {
  Alpine.data("loginForm", () => ({
    // --- State Properties ---
    userType: null, // Will be loaded from JSON script
    email: "",
    password: "",
    isLoading: false,
    message: "",
    isError: true, // Default message type to error
    initError: "", // Specific error during initialization

    // --- Initialization Method ---
    init() {
      console.log("Alpine component initializing...");
      try {
        const dataElement = document.getElementById("login-page-data");
        if (!dataElement)
          throw new Error("Login page data script tag not found.");
        const pageData = JSON.parse(dataElement.textContent);
        if (!pageData || !pageData.userType) {
          throw new Error("User type missing or invalid in page data.");
        }
        this.userType = pageData.userType;
        console.log("Login page data loaded:", pageData);

        // Use $nextTick to ensure the element is rendered before focusing
        this.$nextTick(() => {
          // Use the focus plugin via $focus global magic property
          this.$focus.focus(this.$refs.emailInput);
          console.log("Initial focus set on email input.");
        });
      } catch (error) {
        console.error("Failed to initialize login form:", error);
        this.initError = "Error loading page configuration. Login is disabled.";
        // Keep isLoading false, but initError will disable the form
      }
    },

    // --- Form Submission Handler ---
    async handleSubmit() {
      // Prevent submission if already loading or init failed
      if (this.isLoading || this.initError) return;

      // Clear previous messages
      this.message = "";
      this.isError = true;

      // Basic client-side validation (though HTML5 'required' helps)
      if (!this.email || !this.password) {
        this.message = "Email and password are required.";
        return;
      }
      if (!this.userType) {
        // Should be caught by init, but double-check
        this.message = "User type configuration error.";
        console.error("User type missing during submit:", this.userType);
        return;
      }

      this.isLoading = true;
      console.log(`Attempting login for ${this.userType}...`);

      try {
        let authRecord;
        let redirectUrl;

        if (this.userType === "admin") {
          authRecord = await DbService.authAdmin(this.email, this.password);
          redirectUrl = `/admin-dashboard`; // Adjust as needed
          console.log("Admin login successful:", authRecord);
        } else if (this.userType === "user") {
          authRecord = await DbService.authUser(this.email, this.password, {
            expand: "company", // Ensure PocketBase rules allow this
          });
          console.log("User login successful (with expand):", authRecord);

          // Robust check for company ID
          const company = authRecord?.expand?.company?.[0];
          if (!company || !company.id) {
            console.warn(
              "User logged in, but company info missing or invalid.",
              authRecord.expand
            );
            // Option 1: Show error (more explicit)
            // throw new Error("Could not determine your company dashboard.");
            // Option 2: Redirect to a generic dashboard (current choice)
            redirectUrl = "/dashboard"; // Fallback dashboard
            console.log("Using fallback redirect URL:", redirectUrl);
          } else {
            redirectUrl = `/dashboard/${company.id}`;
            console.log("Constructed redirect URL:", redirectUrl);
          }
        } else {
          throw new Error(`Invalid user type: ${this.userType}`);
        }

        this.isError = false; // Success message
        this.message = "Login successful! Redirecting...";
        console.log("Redirecting in 800ms to:", redirectUrl);

        // Redirect after a short delay
        setTimeout(() => {
          if (redirectUrl) {
            window.location.href = redirectUrl;
          } else {
            console.error("Redirect URL was not set!");
            this.message =
              "Login succeeded but redirect failed. Please contact support.";
            this.isError = true; // It's an error state now
            this.isLoading = false; // Allow retry if redirect fails
          }
        }, 800);

        // Note: Don't set isLoading = false here if redirecting,
        // otherwise the button might flicker back to enabled state briefly.
      } catch (error) {
        console.error("Login failed:", error);
        // Use the error message from the DbService/PocketBase or a generic one
        this.message = error?.message || "An unknown login error occurred.";
        this.isError = true;
        this.isLoading = false; // Re-enable button on failure
      }
    },
  }));
});
