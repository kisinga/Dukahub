// /public/js/pb.js (or your preferred filename)

// Initialize PocketBase Client (assuming it's served locally or adjust URL)
const POCKETBASE_URL = '/'; // Or your PocketBase server URL
const pb = new PocketBase(POCKETBASE_URL);

/**
 * PocketBase Service for interacting with the database.
 * Provides a simplified and consistent interface for common PocketBase operations.
 */
class PocketBaseService {
  constructor(pocketbaseInstance) {
    if (!pocketbaseInstance) {
      throw new Error('PocketBase instance is required.');
    }
    this.pb = pocketbaseInstance;

    // Configure auto-refresh (optional, SDK defaults are often fine)
    // this.pb.autoRefreshThreshold = 5 * 60; // Example: Refresh 5 min before expiry

    // Optional: Listen to auth changes for debugging or global state updates
    this.pb.authStore.onChange((token, model) => {
      console.log('AuthStore changed:', model ? `User/Admin ${model.id}` : 'Logged out');
      // If needed, dispatch a global event for other parts of the app:
      // document.dispatchEvent(new CustomEvent('authChange', { detail: { model } }));
    }, true); // `true` triggers immediately
  }

  /**
   * Provides access to the PocketBase AuthStore.
   * @returns {import("pocketbase").AuthStore}
   */
  get authStore() {
    return this.pb.authStore;
  }

  /**
   * Checks if a user or admin is currently authenticated and the token is valid.
   * @returns {boolean} True if authenticated, false otherwise.
   */
  isAuthenticated() {
    return this.pb.authStore.isValid;
  }

  /**
   * Gets the currently authenticated admin or user model.
   * @returns {import("pocketbase").Record | import("pocketbase").Admin | null}
   */
  getCurrentUser() {
    return this.pb.authStore.model;
  }

  // --- Private Helper for Request Execution and Error Handling ---

  /**
   * Executes a PocketBase SDK request function and handles errors consistently.
   * @private
   * @param {Promise<T>} requestPromise - The promise returned by a PocketBase SDK method.
   * @returns {Promise<T>} The result of the successful request.
   * @throws {Error} A formatted error if the request fails.
   */
  async _request(requestPromise) {
    try {
      return await requestPromise;
    } catch (error) {
      // Log the raw error for detailed debugging
      console.error('PocketBase request error:', error);
      // Throw a potentially more user-friendly/standardized error
      throw this._handlePocketBaseError(error);
    }
  }

  /**
   * Formats PocketBase errors into a standard Error object.
   * @private
   * @param {any} error - The original error object from PocketBase SDK.
   * @returns {Error} A formatted error object.
   */
  _handlePocketBaseError(error) {
    // PocketBase ClientResponseError provides more details
    if (error && typeof error === 'object' && error.status && error.data?.message) {
      // Use the message from the PB response data if available
      return new Error(`PocketBase Error (${error.status}): ${error.data.message}`);
    }
    if (error instanceof Error) {
      // It might be a network error or other standard error
      return error;
    }
    // Fallback for unknown errors
    return new Error('An unknown PocketBase error occurred.');
  }

  // --- CRUD Operations ---

  /**
   * Retrieves a list of all records matching the options.
   * Consider using getPaginatedList for large collections.
   * @param {string} collection - Name of the collection.
   * @param {import("pocketbase").RecordListOptions} [options] - PocketBase JS SDK options (filter, sort, expand, etc.).
   * @returns {Promise<Array<import("pocketbase").Record>>} List of records.
   */
  getList(collection, options = {}) {
    return this._request(this.pb.collection(collection).getFullList(options));
  }

  /**
   * Retrieves a paginated list of records.
   * @param {string} collection - Name of the collection.
   * @param {number} [page=1] - Page number to fetch.
   * @param {number} [perPage=30] - Number of records per page.
   * @param {import("pocketbase").RecordListOptions} [options] - PocketBase JS SDK options (filter, sort, expand, etc.).
   * @returns {Promise<import("pocketbase").ListResult<import("pocketbase").Record>>} Paginated list result.
   */
  getPaginatedList(collection, page = 1, perPage = 30, options = {}) {
    return this._request(this.pb.collection(collection).getList(page, perPage, options));
  }

  /**
   * Retrieves a single record by its ID.
   * @param {string} collection - Name of the collection.
   * @param {string} id - The ID of the record.
   * @param {import("pocketbase").RecordOptions} [options] - PocketBase JS SDK options (e.g., expand).
   * @returns {Promise<import("pocketbase").Record>} The record.
   */
  getOne(collection, id, options = {}) {
    return this._request(this.pb.collection(collection).getOne(id, options));
  }

  /**
   * Creates a new record.
   * @param {string} collection - Name of the collection.
   * @param {object} data - Data for the new record.
   * @param {import("pocketbase").RecordOptions} [options] - PocketBase JS SDK options.
   * @returns {Promise<import("pocketbase").Record>} The newly created record.
   */
  create(collection, data, options = {}) {
    return this._request(this.pb.collection(collection).create(data, options));
  }

  /**
   * Updates an existing record.
   * @param {string} collection - Name of the collection.
   * @param {string} id - The ID of the record to update.
   * @param {object} data - Data to update.
   * @param {import("pocketbase").RecordOptions} [options] - PocketBase JS SDK options.
   * @returns {Promise<import("pocketbase").Record>} The updated record.
   */
  update(collection, id, data, options = {}) {
    return this._request(this.pb.collection(collection).update(id, data, options));
  }

  /**
   * Deletes a record.
   * @param {string} collection - Name of the collection.
   * @param {string} id - The ID of the record to delete.
   * @returns {Promise<boolean>} True if deletion was successful.
   */
  async delete(collection, id) {
    await this._request(this.pb.collection(collection).delete(id));
    return true; // PocketBase delete resolves with no content on success
  }

  // --- Authentication ---

  /**
   * Authenticates an admin user.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<import("pocketbase").Admin>} Admin record.
   */
  async authAdmin(email, password) {
    const authData = await this._request(
      this.pb.collection('admins').authWithPassword(email, password)
    );
    console.log('Admin authenticated:', authData.record);
    return authData.record; // Return the admin record model
  }

  /**
   * Authenticates a regular user.
   * @param {string} email
   * @param {string} password
   * @param {import("pocketbase").RecordOptions} [options] - PocketBase JS SDK options (e.g., expand).
   * @returns {Promise<import("pocketbase").Record>} User record.
   */
  async authUser(email, password, options = {}) {
    const authData = await this._request(
      this.pb.collection('users').authWithPassword(email, password, options)
    );
    console.log('User authenticated:', authData.record);
    return authData.record; // Return the user record model
  }

  /**
   * Logs out the current user/admin.
   */
  logout() {
    this.pb.authStore.clear();
    console.log('User logged out.');
    // Consider dispatching 'authChange' event or handling redirect in UI code
  }
}

// --- Singleton Instance ---
// Create and export a single instance of the service
const DbService = new PocketBaseService(pb);

// Export the singleton instance for use in other modules
export { DbService };

// Optional: Export the class itself if needed for testing or extension
// export { PocketBaseService };
