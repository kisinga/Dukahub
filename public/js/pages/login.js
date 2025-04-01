// /public/js/pages/login.js

import { DbService } from "/public/js/pb.js";

// --- Wait for DOM Ready ---
document.addEventListener("DOMContentLoaded", () => {
  // --- Read Page Data ---
  let pageData = {};
  try {
    const dataElement = document.getElementById("login-page-data");
    if (!dataElement) throw new Error("Login page data script tag not found.");
    pageData = JSON.parse(dataElement.textContent);
    console.log("Login page data loaded:", pageData); // Debug log
  } catch (error) {
    console.error("Failed to read or parse page data:", error);
    showMessage(
      "Error loading page configuration. Login may not work correctly."
    );
    // Disable form if config fails
    loginForm?.querySelectorAll("input, button").forEach((el) => {
      el.disabled = true;
    });
    return; // Stop execution if data is missing
  }

  // --- DOM Elements ---
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorMessageDiv = document.getElementById("error-message");
  const submitButton = document.getElementById("login-submit-btn");
  const submitButtonSpinner = submitButton?.querySelector(".spinner-border");
  const submitButtonText = submitButton?.querySelector(
    "span:not(.spinner-border)"
  );

  // --- Helper Functions (showMessage, hideMessage, showLoading - keep as before) ---
  function showLoading(isLoading) {
    if (!submitButton || !submitButtonSpinner || !submitButtonText) return;
    if (isLoading) {
      submitButton.disabled = true;
      submitButtonSpinner.classList.remove("d-none");
      submitButtonText.textContent = "Logging in...";
    } else {
      submitButton.disabled = false;
      submitButtonSpinner.classList.add("d-none");
      submitButtonText.textContent = "Login";
    }
  }

  function showMessage(message, isError = true) {
    if (!errorMessageDiv) return;
    errorMessageDiv.textContent = message;
    errorMessageDiv.classList.remove("d-none", "alert-success", "alert-danger");
    errorMessageDiv.classList.add(isError ? "alert-danger" : "alert-success");
  }

  function hideMessage() {
    if (!errorMessageDiv) return;
    errorMessageDiv.classList.add("d-none");
    errorMessageDiv.textContent = "";
  }

  // --- Event Listener ---
  loginForm?.addEventListener("submit", async (event) => {
    // --- CRITICAL: Prevent default FIRST ---
    event.preventDefault();
    console.log("Form submission intercepted."); // Debug log

    hideMessage(); // Clear previous messages

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const userType = pageData.userType;

    if (!email || !password) {
      showMessage("Email and password are required.");
      return;
    }
    if (!userType) {
      showMessage("User type configuration error.");
      console.error("User type missing from pageData:", pageData); // Debug log
      return;
    }

    showLoading(true);
    console.log(`Attempting login for ${userType}...`); // Debug log

    try {
      let authRecord;
      let redirectUrl;

      if (userType === "admin") {
        authRecord = await DbService.authAdmin(email, password);
        redirectUrl = `/admin-dashboard`; // Adjust as needed
        console.log("Admin login successful:", authRecord); // Debug log
      } else if (userType === "user") {
        authRecord = await DbService.authUser(email, password, {
          expand: "company", // Ensure your PocketBase rules allow expanding 'company' for users
        });
        console.log("User login successful (with expand):", authRecord); // Debug log

        // --- Robust check for company ID ---
        const company = authRecord?.expand?.company?.[0]; // Get the first company object
        if (!company || !company.id) {
          console.warn(
            "User logged in, but company info missing, not expanded, or has no ID.",
            authRecord.expand // Log the expand object for inspection
          );
          // Option 1: Show error and stop
          // throw new Error("Could not determine your company dashboard.");
          // Option 2: Redirect to a generic dashboard
          redirectUrl = "/dashboard"; // Fallback dashboard
          console.log("Using fallback redirect URL:", redirectUrl);
        } else {
          redirectUrl = `/dashboard/${company.id}`; // Construct the specific URL
          console.log("Constructed redirect URL:", redirectUrl);
        }
      } else {
        throw new Error(`Invalid user type: ${userType}`);
      }

      showMessage("Login successful! Redirecting...", false);
      console.log("Redirecting in 800ms to:", redirectUrl); // Debug log

      // Redirect after a short delay
      setTimeout(() => {
        if (redirectUrl) {
          window.location.href = redirectUrl;
        } else {
          // This should ideally not happen if logic above is correct
          console.error("Redirect URL was not set!");
          showMessage(
            "Login succeeded but redirect failed. Please contact support."
          );
          showLoading(false); // Allow retry if redirect fails
        }
      }, 800);
    } catch (error) {
      console.error("Login failed:", error);
      // Use the error message from the DbService exception or a generic one
      const displayError = error.message || "An unknown login error occurred.";
      showMessage(displayError);
      showLoading(false); // Re-enable button on failure
    }
  });

  // Add initial focus to email field
  emailInput?.focus();
  console.log("Login page script initialized."); // Debug log
}); // End DOMContentLoaded
