// Note: This store relies on the global 'Alpine', 'tf', 'tmImage', and 'DbService'
// It also calls methods on the globally registered 'modal' store.
import { DbService } from "/public/js/pb.js"; // Import dependency

const scannerStoreLogic = {
  // --- State Properties ---
  status: "idle",
  _errorMessage: "",
  isScanning: false,
  isInitialized: false,
  isConfigured: false,
  model: null,
  stream: null,
  detectionTimerId: null,
  config: {
    modelUrl: null,
    metadataUrl: null,
    weightsUrl: null,
    confidenceThreshold: 0.9,
    detectionIntervalMs: 1200,
  },
  videoElement: null,
  predictions: [],

  // --- Computed Getters for UI ---
  get message() {
    const messages = {
      /* ... copy messages object from previous version ... */
      idle: "Scanner inactive.",
      initializing: "Initializing scanner...",
      loading_model: this._errorMessage || "Loading detection model...",
      ready: "Scanner ready.",
      starting_camera: "Starting camera...",
      scanning: "Scanning for products...",
      stopping: "Stopping scanner...",
      stopped: "Scanner stopped.",
      verifying_detection: "Detected item, verifying...",
      product_found: "Product identified.",
      error: `Error: ${this._errorMessage || "Unknown scanner error."}`,
    };
    if (this.status === "loading_model" && !this._errorMessage) {
      messages.loading_model = "Loading detection model...";
    }
    return messages[this.status] || "Scanner status unknown.";
  },
  get buttonText() {
    switch (this.status /* ... copy cases from previous version ... */) {
      case "error":
        return "Scanner Error";
      case "initializing":
      case "loading_model":
        return "Loading...";
      default:
        return this.isScanning ? "Stop Scanner" : "Start Scanner";
    }
  },

  // --- Core Methods ---
  initScanner(modelInfo, videoEl) {
    console.log("Scanner Store: initScanner called.");
    this.isInitialized = false;
    this.model = null;
    this._errorMessage = "";
    this.status = "idle";
    this.isConfigured = !!(
      modelInfo?.model &&
      modelInfo?.weights &&
      modelInfo?.metadata
    );
    if (!this.isConfigured) {
      this.updateStatus(
        "error",
        "Scanner disabled: Missing configuration URLs."
      );
      return;
    }
    this.config.modelUrl = modelInfo.model;
    this.config.weightsUrl = modelInfo.weights;
    this.config.metadataUrl = modelInfo.metadata;
    this.videoElement = videoEl;
    if (!this.videoElement) {
      this.updateStatus(
        "error",
        "Scanner disabled: Video element reference missing."
      );
      this.isConfigured = false;
      return;
    }
    this.updateStatus("idle");
    console.log("Scanner configured successfully.");
  },

  async _fetchUrlAsFile(url, defaultFilename, type) {
    // Added defaultFilename
    let filename = defaultFilename; // Use default initially
    try {
      const absoluteUrl = new URL(url, window.location.origin); // Use href for fetching
      // --- Extract filename from URL path ---
      const pathname = absoluteUrl.pathname;
      const lastSlashIndex = pathname.lastIndexOf("/");
      if (lastSlashIndex !== -1) {
        filename = pathname.substring(lastSlashIndex + 1); // Get part after last slash
      }

      const response = await fetch(absoluteUrl.href); // Fetch using the full URL object's href
      if (!response.ok) {
        throw new Error(
          `HTTP error fetching ${filename}! status: ${response.status}`
        );
      }
      const blob = await response.blob();
      // --- Use extracted filename here ---
      return new File([blob], filename, { type });
    } catch (error) {
      console.error(
        `Failed to fetch or create File for ${filename} (from ${url}):`,
        error
      );
      throw error;
    }
  },

  async _loadModel() {
    if (this.model) return true;
    if (
      !this.isConfigured ||
      !this.config.modelUrl ||
      !this.config.weightsUrl ||
      !this.config.metadataUrl
    ) {
      this.updateStatus("error", "Cannot load model: Configuration missing.");
      return false;
    }
    this.updateStatus("loading_model", "Downloading model files...");
    try {
      /* ... copy try/catch block from previous _loadModel ... */
      if (typeof tf === "undefined")
        throw new Error("TensorFlow.js (tf) not loaded.");
      if (typeof tmImage === "undefined")
        throw new Error("Teachable Machine library (tmImage) not loaded.");
      await tf.setBackend("webgl");
      await tf.ready();
      console.log(`TF.js backend ready: ${tf.getBackend()}`);
      const [modelFile, weightsFile, metadataFile] = await Promise.all([
        this._fetchUrlAsFile(
          this.config.modelUrl,
          "model.json",
          "application/json"
        ),
        // Pass 'weights.bin' as the default/fallback name
        this._fetchUrlAsFile(
          this.config.weightsUrl,
          "weights.bin",
          "application/octet-stream"
        ),
        this._fetchUrlAsFile(
          this.config.metadataUrl,
          "metadata.json",
          "application/json"
        ),
      ]);

      console.log("Model files downloaded.");
      this.updateStatus("loading_model", "Processing model files...");
      const loadedModel = await tmImage.loadFromFiles(
        modelFile,
        weightsFile,
        metadataFile
      );
      if (!loadedModel)
        throw new Error(
          "tmImage.loadFromFiles() did not return a valid model."
        );
      this.model = loadedModel;
      this.isInitialized = true;
      console.log("Scanner model loaded successfully from files.");
      return true;
    } catch (error) {
      /* ... copy error handling ... */
      console.error("Error during model loading process:", error);
      this.model = null;
      this.isInitialized = false;
      this.updateStatus("error", `Failed to load model: ${error.message}`);
      return false;
    }
  },

  async start() {
    console.log("Scanner Store: start() called.");
    if (!this.isConfigured) {
      /* ... handle not configured ... */ return;
    }
    if (this.isScanning) {
      /* ... handle already scanning ... */ return;
    }
    if (!this.isInitialized) {
      this.updateStatus("initializing");
      if (!(await this._loadModel())) {
        /* ... handle model load fail ... */ return;
      }
    }
    if (!this.model) {
      /* ... handle model null ... */ return;
    }
    this.updateStatus("starting_camera");
    try {
      /* ... copy try/catch block from previous start() ... */
      if (!this.videoElement)
        throw new Error("Camera video element reference lost.");
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      this.videoElement.srcObject = this.stream;
      await new Promise((resolve, reject) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play().then(resolve).catch(reject);
        };
        this.videoElement.onerror = (err) =>
          reject(new Error("Video element error during setup."));
      });
      console.log("Camera stream attached and playing.");
      this.predictions = [];
      if (this.detectionTimerId) clearInterval(this.detectionTimerId);
      this.detectionTimerId = setInterval(
        () => this._detectLoop(),
        this.config.detectionIntervalMs
      );
      this.isScanning = true;
      this.updateStatus("scanning");
      console.log("Scanner started successfully.");
    } catch (error) {
      /* ... copy error handling ... */
      console.error("Error starting camera stream:", error);
      this.updateStatus("error", `Could not access camera: ${error.message}`);
      this.stop();
    }
  },

  stop() {
    if (!this.isScanning && !this.stream && !this.detectionTimerId) return;
    console.log("Scanner Store: stop() called.");
    const previousStatus = this.status;
    this.updateStatus("stopping");
    if (this.detectionTimerId) {
      clearInterval(this.detectionTimerId);
      this.detectionTimerId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.predictions = [];
    this.isScanning = false;
    if (previousStatus === "error") {
      this.status = "error";
    } else {
      this.updateStatus(this.isInitialized ? "ready" : "idle");
    }
    console.log("Scanner stopped. Final status:", this.status);
  },

  toggle() {
    if (this.isScanning) this.stop();
    else {
      if (
        this.status !== "error" ||
        this._errorMessage.includes("Configuration missing")
      ) {
        this.start();
      } else {
        console.warn(
          "Scanner toggle prevented due to persistent error state:",
          this._errorMessage
        );
      }
    }
  },

  async _detectLoop() {
    if (
      !this.model ||
      !this.videoElement ||
      !this.isScanning ||
      !this.videoElement.srcObject
    )
      return;
    if (
      this.videoElement.paused ||
      this.videoElement.ended ||
      !this.videoElement.videoWidth ||
      this.videoElement.readyState < 3
    )
      return;
    try {
      /* ... copy try/catch block from previous _detectLoop, ensuring Alpine.raw() is used ... */
      const rawModel = Alpine.raw(this.model); // IMPORTANT
      if (!rawModel)
        throw new Error("Could not get raw model object from proxy.");
      const predictions = await rawModel.predictTopK(this.videoElement, 3);
      this.predictions = predictions;
      let bestPrediction = null;
      if (predictions && predictions.length > 0) {
        bestPrediction = predictions.reduce(
          (best, current) =>
            current.probability > best.probability ? current : best,
          { probability: 0 }
        );
      }
      if (
        bestPrediction &&
        bestPrediction.probability >= this.config.confidenceThreshold
      ) {
        console.log(
          `Scanner Store: Detection above threshold: ${bestPrediction.className} (${bestPrediction.probability})`
        );
        this.stop();
        await this._handleDetection(bestPrediction.className);
      }
    } catch (error) {
      /* ... copy error handling ... */
      console.error("Error during prediction loop:", error);
      this.updateStatus("error", `Prediction failed: ${error.message}`);
      this.stop();
    }
  },

  async _handleDetection(detectedLabel) {
    this.updateStatus("verifying_detection");
    try {
      /* ... copy try/catch block from previous _handleDetection ... */
      const product = await DbService.getOne("products", "v6xkdvb1llq483z", {
        expand: "skus",
      });

      // fetch the inventory details for the found product
      const inventory = await DbService.getList("inventory", {
        filter: `product = '${product.id}'`,
        perPage: 1,
      });

      // attach the inventory to the product
      if (inventory.length > 0) {
        product.inventory = inventory[0]; // Assuming you want the first inventory item
      } else {
        product.inventory = null; // No inventory found
      }

      console.log("Product verified:", product);
      Alpine.store("modal").open(product); // Call modal store
    } catch (error) {
      /* ... copy error handling ... */
      console.error(
        `Error fetching/verifying product "${detectedLabel}":`,
        error
      );
      const message =
        error.status === 404
          ? `Item "${detectedLabel}" not found.`
          : `Error verifying item.`;
      this.updateStatus("error", message);
    }
  },

  updateStatus(newStatus, specificErrorMessage = "") {
    this.status = newStatus;
    if (newStatus === "error") {
      this._errorMessage = specificErrorMessage || "Unknown scanner error.";
    } else {
      this._errorMessage = "";
    }
  },
};

export default scannerStoreLogic;
