// Initialize PocketBase Client
const POCKETBASE_URL = "/";
const pb = new PocketBase(POCKETBASE_URL);

/**
 * PocketBase Service for interacting with the database.
 * Focuses solely on data operations and authentication state.
 */
class PocketBaseService {
  constructor(pocketbaseInstance) {
    this.pb = pocketbaseInstance;

    // Automatically refresh token when needed by the SDK
    this.pb.autoRefreshThreshold = 5 * 60; // Refresh 5 minutes before expiry (SDK default is 10min)

    // Listen to auth changes to potentially update UI elsewhere
    this.pb.authStore.onChange((token, model) => {
      console.log("AuthStore changed:", token, model);
      // You could dispatch a custom event here for other parts of the app
      // document.dispatchEvent(new CustomEvent('authChange', { detail: { token, model } }));
    }, true); // `true` triggers the callback immediately with the current state
  }

  get authStore() {
    return this.pb.authStore;
  }

  get client() {
    return this.pb; // Expose the raw client if needed for advanced use cases
  }

  /**
   * Checks if a user or admin is currently authenticated.
   * @returns {boolean} True if authenticated, false otherwise.
   */
  isAuthenticated() {
    return this.pb.authStore.isValid;
  }

  /**
   * Retrieves a list of records from a collection with filtering, sorting, etc.
   * @param {string} collection - Name of the collection.
   * @param {object} [options] - PocketBase JS SDK options (filter, sort, page, perPage, etc.).
   * @returns {Promise<Array<object>>} List of records.
   * @throws {Error} If the API request fails.
   */
  async getList(collection, options = {}) {
    try {
      // Use getFullList for simplicity if pagination isn't immediately needed,
      // or use getList for paginated results. Let's use getFullList for now.
      // Adjust batch size as needed.
      const records = await this.pb.collection(collection).getFullList(options);
      return records;
    } catch (error) {
      console.error(
        `Failed to get list from collection "${collection}":`,
        error
      );
      // Re-throw the error so the caller can handle it appropriately
      throw this._handlePocketBaseError(error);
    }
  }

  /**
   * Retrieves a single record by its ID.
   * @param {string} collection - Name of the collection.
   * @param {string} id - The ID of the record.
   * @param {object} [options] - PocketBase JS SDK options (e.g., expand).
   * @returns {Promise<object>} The record.
   * @throws {Error} If the API request fails or record not found.
   */
  async getOne(collection, id, options = {}) {
    try {
      const record = await this.pb.collection(collection).getOne(id, options);
      return record;
    } catch (error) {
      console.error(
        `Failed to get record "${id}" from collection "${collection}":`,
        error
      );
      throw this._handlePocketBaseError(error);
    }
  }

  /**
   * Creates a new record.
   * @param {string} collection - Name of the collection.
   * @param {object} data - Data for the new record.
   * @param {object} [options] - PocketBase JS SDK options.
   * @returns {Promise<object>} The newly created record.
   * @throws {Error} If the API request fails.
   */
  async create(collection, data, options = {}) {
    try {
      const record = await this.pb.collection(collection).create(data, options);
      return record;
    } catch (error) {
      console.error(
        `Failed to create record in collection "${collection}":`,
        error
      );
      throw this._handlePocketBaseError(error);
    }
  }

  /**
   * Updates an existing record.
   * @param {string} collection - Name of the collection.
   * @param {string} id - The ID of the record to update.
   * @param {object} data - Data to update.
   * @param {object} [options] - PocketBase JS SDK options.
   * @returns {Promise<object>} The updated record.
   * @throws {Error} If the API request fails.
   */
  async update(collection, id, data, options = {}) {
    try {
      const record = await this.pb
        .collection(collection)
        .update(id, data, options);
      return record;
    } catch (error) {
      console.error(
        `Failed to update record "${id}" in collection "${collection}":`,
        error
      );
      throw this._handlePocketBaseError(error);
    }
  }

  /**
   * Deletes a record.
   * @param {string} collection - Name of the collection.
   * @param {string} id - The ID of the record to delete.
   * @returns {Promise<boolean>} True if deletion was successful.
   * @throws {Error} If the API request fails.
   */
  async delete(collection, id) {
    try {
      await this.pb.collection(collection).delete(id);
      return true;
    } catch (error) {
      console.error(
        `Failed to delete record "${id}" from collection "${collection}":`,
        error
      );
      throw this._handlePocketBaseError(error);
    }
  }

  /**
   * Authenticates an admin user.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<object>} Admin record.
   * @throws {Error} If authentication fails.
   */
  async authAdmin(email, password) {
    try {
      const authData = await this.pb
        .collection("admins")
        .authWithPassword(email, password);
      // AuthStore is automatically updated by the SDK
      console.log("Admin authenticated:", authData.record);
      return authData.record;
    } catch (error) {
      console.error("Admin authentication failed:", error);
      throw this._handlePocketBaseError(error);
    }
  }

  /**
   * Authenticates a regular user.
   * @param {string} email
   * @param {string} password
   * @param {object} [options] - PocketBase JS SDK options (e.g., expand).
   * @returns {Promise<object>} User record.
   * @throws {Error} If authentication fails.
   */
  async authUser(email, password, options = {}) {
    try {
      const authData = await this.pb
        .collection("users")
        .authWithPassword(email, password, options);
      // AuthStore is automatically updated by the SDK
      console.log("User authenticated:", authData.record);
      return authData.record;
    } catch (error) {
      console.error("User authentication failed:", error);
      throw this._handlePocketBaseError(error);
    }
  }

  /**
   * Logs out the current user/admin.
   */
  logout() {
    this.pb.authStore.clear();
    // Consider redirecting or dispatching an event in the calling code, not here.
    console.log("User logged out.");
  }

  /**
   * Handles PocketBase errors, potentially formatting them.
   * @param {any} error - The original error object.
   * @returns {Error} A potentially formatted error.
   */
  _handlePocketBaseError(error) {
    // PocketBase errors often have a `response` property with details
    if (error && error.response && error.response.message) {
      return new Error(
        `PocketBase Error: ${error.message} (Status: ${error.status}) - ${error.response.message}`
      );
    }
    if (error instanceof Error) {
      return error; // Re-throw standard errors
    }
    return new Error("An unknown PocketBase error occurred.");
  }
}

// Create a singleton instance
const DbService = new PocketBaseService(pb);

// Export the singleton instance
export { DbService };
