// db.js - PocketBase Client Wrapper
const pb = new PocketBase("http://127.0.0.1:8090");

export const DbService = {
  getAuthStore: () => pb.authStore,

  async execute(collection, params) {
    try {
      switch (params.operation) {
        case "list_search":
          return await pb.collection(collection).getFullList(params.options);
        case "view":
          return await pb.collection(collection).getOne(params.id);
        case "create":
          return await pb.collection(collection).create(params.createparams);
        case "update":
          return await pb
            .collection(collection)
            .update(params.updateParams.id, params.updateParams.data);
        case "delete":
          return await pb.collection(collection).delete(params.id);
        default:
          throw new Error("Invalid operation");
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async refreshAuthToken() {
    if (!pb.authStore.isValid) {
      console.warn("Auth token expired. User must log in again.");
      return;
    }

    try {
      await pb.authStore.refresh(); // Refresh the token
      console.log("Token refreshed:", pb.authStore.token);

      // Schedule the next refresh before expiry
      scheduleTokenRefresh();
    } catch (error) {
      console.error("Token refresh failed:", error);
      pb.authStore.clear(); // Logout the user
      window.location.href = "/login"; // Redirect to login
    }
  },

  // Schedule refresh based on token expiry time
  scheduleTokenRefresh() {
    const tokenData = pb.authStore.model;
    if (!tokenData) return;

    const expiresAt = tokenData.exp * 1000; // Convert expiry time to milliseconds
    const refreshBefore = expiresAt - Date.now() - 5 * 60 * 1000; // Refresh 5 minutes before expiry

    if (refreshBefore > 0) {
      setTimeout(refreshAuthToken, refreshBefore);
    } else {
      refreshAuthToken(); // Token expired, refresh immediately
    }
  },

  // Start the refresh cycle when the page loads
  // if (pb.authStore.isValid) {
  //     scheduleTokenRefresh();
  // },

  async loginUser(event) {
    event.preventDefault(); // Prevent full page reload

    const formData = new FormData(event.target);
    const email = formData.get("email");
    const password = formData.get("password");
    console.log(email, password);
    console.log("Form Data Entries:", [...formData.entries()]);
    try {
      const authData = await pb
        .collection("admins")
        .authWithPassword(email, password, { expand: "company" });
      console.log(authData);
      pb.authStore.save(authData.token, authData.record);

      // Update UI via HTMX
      htmx.trigger("#error-message", "loginSuccess", { success: true });

      scheduleTokenRefresh();

      setTimeout(() => (window.location.href = "/dashboard"), 500);
    } catch (error) {
      htmx.trigger("#error-message", "loginFailed", { error: error.message });
    }
  },

  logout() {
    pb.authStore.clear();
    localStorage.removeItem("pb_auth");
  },
  // Schedule refresh based on token expiry time
  scheduleTokenRefresh() {
    const tokenData = pb.authStore.model;
    if (!tokenData) return;

    const expiresAt = tokenData.exp * 1000; // Convert expiry time to milliseconds
    const refreshBefore = expiresAt - Date.now() - 5 * 60 * 1000; // Refresh 5 minutes before expiry

    if (refreshBefore > 0) {
      setTimeout(refreshAuthToken, refreshBefore);
    } else {
      refreshAuthToken(); // Token expired, refresh immediately
    }
  },
};
