// db.js - PocketBase Client Wrapper
const pb = new PocketBase("/");

/**
 * Database service wrapper for PocketBase operations
 */
export const DbService = {
  get authStore() {
    return pb.authStore;
  },

  /**
   * Executes various database operations
   * @param {string} collection - Name of the collection
   * @param {object} params - Operation parameters
   * @param {string} params.operation - Operation to perform (list_search, view, create, update, delete)
   * @returns {Promise<object>} Result of the operation
   */
  async execute(collection, params) {
    try {
      if (!params?.operation) {
        throw new Error("Missing operation parameter");
      }

      const result = await pb.collection(collection)[params.operation](params);
      return { success: true, data: result };
    } catch (error) {
      console.error(`Database operation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Refreshes the authentication token
   * @returns {Promise<void>}
   */
  async refreshAuthToken() {
    try {
      await handleTokenRefresh();
    } catch (error) {
      console.error("Token refresh failed:", error);
      handleTokenRefreshFailure();
    }
  },

  scheduleTokenRefresh() {
    return scheduleTokenRefresh();
  },

  /**
   * Handles login functionality
   * @param {Event} event - Form submission event
   * @returns {Promise<void>}
   */
  async loginUser(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      const authData = await pb
        .collection("admins")
        .authWithPassword(email, password, { expand: "company" });

      pb.authStore.save(authData.token, authData.record);
      console.log(authData);

      // Update UI via HTMX
      htmx.trigger("#error-message", "loginSuccess", { success: true });

      setTimeout(() => {
        window.location.href = `/dashboard/${authData.record.company[0]}`;
      }, 500);
    } catch (error) {
      console.error("Login failed:", error);
      htmx.trigger("#error-message", "loginFailed", {
        error: error.message,
        email: email,
      });
    }
  },

  /**
   * Logs out the current user
   */
  logout() {
    pb.authStore.clear();
    localStorage.removeItem("pb_auth");
    window.location.href = "/login";
  },
};

/**
 * Schedules token refresh based on token expiry
 * @returns {number} Timeout ID
 */
function scheduleTokenRefresh() {
  try {
    const token = pb.authStore.token;
    if (!token) {
      console.warn("No authentication token found");
      return null;
    }

    // Decode JWT token to get expiry time
    const tokenPayload = token.split(".")[1];
    const decodedToken = JSON.parse(atob(tokenPayload));

    if (!decodedToken.exp) {
      throw new Error("Expiry time not found in token");
    }

    const expiresAt = decodedToken.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const refreshBefore = expiresAt - now - 5 * 60 * 1000; // Refresh 5 minutes before expiry

    if (refreshBefore <= 0) {
      console.log("Token already expired, refreshing immediately");
      handleTokenRefresh();
      return null;
    }

    console.log(`Scheduling token refresh in ${refreshBefore}ms`);

    const timeoutId = setTimeout(() => {
      handleTokenRefresh();
    }, refreshBefore);

    return timeoutId;
  } catch (error) {
    console.error("Failed to schedule token refresh:", error);
    return null;
  }
}

/**
 * Handles token refresh failure
 */
function handleTokenRefreshFailure() {
  console.warn("All token refresh attempts failed. Logging out user.");
  DbService.logout();
}

/**
 * Handles token refresh and scheduling
 * @returns {Promise<void>}
 */
async function handleTokenRefresh() {
  try {
    const token = pb.authStore.token;
    if (!token) {
      console.warn("No authentication token found");
      return;
    }

    // Decode JWT token to get current expiry time
    const tokenPayload = token.split(".")[1];
    const decodedToken = JSON.parse(atob(tokenPayload));

    if (!decodedToken.exp) {
      throw new Error("Expiry time not found in token");
    }

    const expiresAt = decodedToken.exp * 1000; // Convert to milliseconds
    const now = Date.now();

    // Only refresh if token will expire in the next 5 minutes
    if (expiresAt - now > 5 * 60 * 1000) {
      console.log("Token refresh not needed yet");
      return;
    }

    console.log("Initiating token refresh...");

    // Use retry logic for token refresh
    const maxRetries = 3;
    let attempts = 0;

    for (attempts = 1; attempts <= maxRetries; attempts++) {
      try {
        const response = await pb.collection("admins").authRefresh();
        pb.authStore.save(response.token, response.record);
        console.log("Token refreshed successfully");
        return scheduleTokenRefresh();
      } catch (error) {
        console.error(
          `Token refresh attempt ${attempts} failed:`,
          error.message
        );

        if (attempts >= maxRetries) {
          throw new Error("Token refresh failed after maximum retries");
        }

        // Wait before retrying with exponential backoff
        const delay = 1000 * Math.pow(2, attempts);
        console.log(`Waiting ${delay}ms before retrying...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  } catch (error) {
    console.error("Token refresh failed:", error);
    handleTokenRefreshFailure();
  }
}

// Export helper functions
export { DbService as default, pb as pocketBaseClient };
