// db.js - PocketBase Client Wrapper
import PocketBase from "pocketbase";

const pb = new PocketBase("http://127.0.0.1:8090");

export const DbService = {
  getAuthStore: () => pb.authStore,

  async execute(collection, params) {
    try {
      const actions = {
        list_search: () =>
          pb.collection(collection).getFullList(params.options),
        view: () => pb.collection(collection).getOne(params.id),
        create: () => pb.collection(collection).create(params.createparams),
        update: () =>
          pb
            .collection(collection)
            .update(params.updateParams.id, params.updateParams.data),
        delete: () => pb.collection(collection).delete(params.id),
      };
      return await (
        actions[params.operation] ||
        Promise.reject(new Error("Invalid operation"))
      )();
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async refreshAuthToken() {
    if (!pb.authStore.isValid) {
      console.warn("Auth expired. User must log in again.");
      return;
    }
    try {
      await pb.authStore.refresh();
      console.log("Token refreshed.");
      this.scheduleTokenRefresh(); // Reschedule next refresh
    } catch (error) {
      console.error("Token refresh failed:", error);
      this.logout(); // Ensure logout flow
    }
  },

  scheduleTokenRefresh() {
    const tokenData = pb.authStore.model;
    if (!tokenData) return;

    const expiresAt = tokenData.exp * 1000;
    const refreshBefore = expiresAt - Date.now() - 5 * 60 * 1000;

    if (refreshBefore > 0) {
      setTimeout(() => this.refreshAuthToken(), refreshBefore);
    } else {
      this.refreshAuthToken();
    }
  },

  async loginUser(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const authData = await pb
        .collection("admins")
        .authWithPassword(email, password, { expand: "company" });
      pb.authStore.save(authData.token, authData.record);

      document.cookie = `pb_auth=${authData.token}; path=/; Secure; SameSite=Lax;`;

      htmx.trigger("#error-message", "loginSuccess", { success: true });

      setTimeout(() => (window.location.href = "/dashboard"), 500);
    } catch (error) {
      htmx.trigger("#error-message", "loginFailed", { error: error.message });
    }
  },

  logout() {
    pb.authStore.clear();
    document.cookie =
      "pb_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    window.location.href = "/login";
  },
};
