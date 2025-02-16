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

  async loginUser(event) {
    event.preventDefault(); // Prevent full page reload

    const formData = new FormData(event.target);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const authData = await pb
        .collection("admins")
        .authWithPassword(email, password, { expand: "company" });
      localStorage.setItem("pb_auth", JSON.stringify(authData));

      // Update UI via HTMX
      htmx.trigger("#error-message", "loginSuccess", { success: true });

      setTimeout(() => (window.location.href = "/dashboard"), 500);
    } catch (error) {
      htmx.trigger("#error-message", "loginFailed", { error: error.message });
    }
  },

  logout() {
    pb.authStore.clear();
    localStorage.removeItem("pb_auth");
  },
};
