// /public/js/scanner.js
import { DbService } from "./pb.js"; // Use the refactored DbService

// Ensure Teachable Machine library is loaded globally or imported if using modules
// Assuming tmImage is available globally for this example.
// If using npm: import * as tmImage from '@teachablemachine/image';

/**
 * Manages the camera scanning functionality using Teachable Machine.
 */
class ScannerService {
  constructor(config) {
    // Configuration and Dependencies
    this.config = {
      modelUrl: config.modelUrl,
      metadataUrl: config.metadataUrl,
      confidenceThreshold: config.confidenceThreshold || 0.9,
      detectionIntervalMs: config.detectionIntervalMs || 1000,
      selectors: {
        container: config.selectors?.container || "#camera-container",
        video: config.selectors?.video || "#camera-view",
        predictions: config.selectors?.predictions || "#predictions",
        scanLine: config.selectors?.scanLine || ".scanning-line",
      },
      callbacks: {
        onDetect: config.callbacks?.onDetect || ((product) => {}),
        onError: config.callbacks?.onError || ((error) => {}),
        onStatusChange: config.callbacks?.onStatusChange || ((status) => {}),
      },
    };

    // DOM Elements (initialized later)
    this.elements = {
      container: null,
      video: null,
      predictions: null,
      scanLine: null,
    };

    // State
    this.model = null;
    this.modelLabels = [];
    this.stream = null;
    this.isInitialized = false;
    this.isScanning = false;
    this.detectionTimerId = null;
    this.animationTimerId = null;
  }

  /**
   * Loads the Teachable Machine model.
   * @private
   */
  async _loadModel() {
    this._updateStatus("Loading model...");
    try {
      this.model = await tmImage.load(
        this.config.modelUrl,
        this.config.metadataUrl
      );
      const maxPredictions = this.model.getTotalClasses();
      this.modelLabels = this.model.getClassLabels().slice(0, maxPredictions);
      console.log("Teachable Machine model loaded successfully");
      console.log("Labels:", this.modelLabels);
      this._updateStatus("Model loaded");
      return true;
    } catch (error) {
      console.error("Error loading Teachable Machine model:", error);
      this._handleError("Failed to load the detection model.");
      return false;
    }
  }

  /**
   * Initializes the scanner service (loads model, gets elements).
   */
  async initialize() {
    if (this.isInitialized) return true;

    this._updateStatus("Initializing...");
    this.elements.container = document.querySelector(
      this.config.selectors.container
    );
    this.elements.video = document.querySelector(this.config.selectors.video);
    this.elements.predictions = document.querySelector(
      this.config.selectors.predictions
    );
    this.elements.scanLine = document.querySelector(
      this.config.selectors.scanLine
    );

    if (!this.elements.container || !this.elements.video) {
      this._handleError(
        "Scanner initialization failed: Required DOM elements not found."
      );
      return false;
    }

    const modelLoaded = await this._loadModel();
    if (!modelLoaded) {
      return false; // Error already handled in _loadModel
    }

    this.isInitialized = true;
    this._updateStatus("Ready");
    console.log("Scanner initialized.");
    return true;
  }

  /**
   * Starts the camera stream and detection loop.
   */
  async start() {
    if (!this.isInitialized) {
      console.warn("Scanner not initialized. Call initialize() first.");
      const success = await this.initialize();
      if (!success) return; // Stop if initialization failed
    }

    if (this.isScanning) {
      console.log("Scanner already running.");
      return;
    }

    this._updateStatus("Starting camera...");
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      if (!this.elements.video || !this.elements.container) {
        throw new Error("Video or container element not available.");
      }

      this.elements.video.srcObject = this.stream;
      // Wait for video metadata to load to prevent prediction errors
      await new Promise((resolve) => {
        this.elements.video.onloadedmetadata = resolve;
      });

      this.elements.container.style.display = "block";
      this._startAnimation();

      // Clear previous predictions if any
      if (this.elements.predictions) {
        this.elements.predictions.innerHTML = "";
      }

      // Start detection loop
      this.detectionTimerId = setInterval(
        () => this._detectLoop(),
        this.config.detectionIntervalMs
      );

      this.isScanning = true;
      this._updateStatus("Scanning...");
      console.log("Camera started and scanning.");
    } catch (error) {
      console.error("Error starting camera:", error);
      this._handleError(
        "Could not access the camera. Please check permissions and ensure it's not in use."
      );
      this.stop(); // Clean up if start failed
    }
  }

  /**
   * Stops the camera stream and detection loop.
   */
  stop() {
    if (!this.isScanning && !this.stream) {
      // console.log("Scanner already stopped.");
      return;
    }

    this._updateStatus("Stopping...");
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.elements.video) {
      this.elements.video.srcObject = null;
    }
    if (this.elements.container) {
      this.elements.container.style.display = "none";
    }

    if (this.detectionTimerId) {
      clearInterval(this.detectionTimerId);
      this.detectionTimerId = null;
    }

    this._stopAnimation();

    // Clear predictions when stopping
    if (this.elements.predictions) {
      this.elements.predictions.innerHTML = "";
    }

    this.isScanning = false;
    this._updateStatus("Stopped");
    console.log("Scanner stopped.");
  }

  /**
   * Toggles the scanner on or off.
   */
  toggle() {
    if (this.isScanning) {
      this.stop();
    } else {
      this.start();
    }
  }

  /**
   * Main detection loop called by setInterval.
   * @private
   */
  async _detectLoop() {
    if (!this.isScanning || !this.model || !this.elements.video?.srcObject) {
      return; // Not ready or stopped
    }

    // Check if video is playing and has dimensions
    if (
      this.elements.video.paused ||
      this.elements.video.ended ||
      !this.elements.video.videoWidth
    ) {
      // console.log("Video not ready for prediction.");
      return;
    }

    try {
      const predictions = await this.model.predict(this.elements.video);
      this._displayPredictions(predictions); // Update UI with probabilities

      let bestPrediction = null;
      let maxConfidence = 0;

      for (const prediction of predictions) {
        if (prediction.probability > maxConfidence) {
          maxConfidence = prediction.probability;
          bestPrediction = prediction;
        }
      }

      if (bestPrediction && maxConfidence >= this.config.confidenceThreshold) {
        console.log(
          `Potential detection: ${bestPrediction.className} (${maxConfidence})`
        );
        // Temporarily stop detection to handle this result
        this.stop(); // Stop camera and detection loop
        await this._handleDetection(bestPrediction.className, maxConfidence);
        // Note: The caller (via onDetect callback) is responsible for deciding
        // whether to restart scanning later.
      }
    } catch (error) {
      console.error("Error during prediction:", error);
      // Don't stop scanning for transient prediction errors, but log them.
      // Consider adding a counter to stop if errors persist.
    }
  }

  /**
   * Handles a successful detection above the confidence threshold.
   * @param {string} detectedLabel - The label detected by the model.
   * @param {number} confidence - The confidence score.
   * @private
   */
  async _handleDetection(detectedLabel, confidence) {
    this._updateStatus(`Detected: ${detectedLabel}. Verifying...`);
    this._showDetectionFeedback(detectedLabel, confidence); // Show brief visual cue

    try {
      // --- IMPORTANT: Use the detectedLabel for lookup ---
      // Assuming the label directly corresponds to the product ID or a unique code field.
      // If the label is just a name, you might need to filter instead:
      // const filter = `unique_code = '${detectedLabel.replace(/'/g, "''")}'`; // Example filter
      // const products = await DbService.getList("products", { filter });
      // if (products.length === 1) { product = products[0]; } else { throw... }

      // Using getOne assuming label is the ID:
      const product = await DbService.getOne("products", detectedLabel);

      console.log("Product found in DB:", product);
      this._updateStatus(`Product Found: ${product.name}`);
      // Call the success callback provided in config
      this.config.callbacks.onDetect(product);
    } catch (error) {
      console.error(
        `Error fetching product with ID/Label "${detectedLabel}":`,
        error
      );
      // Check if it's a "not found" error (PocketBase throws 404)
      if (error.status === 404) {
        this._handleError(
          `Detected item "${detectedLabel}" not found in the product database.`
        );
      } else {
        this._handleError(`Error verifying detected item "${detectedLabel}".`);
      }
      // Even on error, the scanner is stopped. The user might need to restart manually.
    }
  }

  /**
   * Displays prediction probabilities in the UI.
   * @param {Array<object>} predictions - Array of prediction objects.
   * @private
   */
  _displayPredictions(predictions) {
    if (!this.elements.predictions) return;

    this.elements.predictions.innerHTML = ""; // Clear previous
    predictions
      .sort((a, b) => b.probability - a.probability) // Sort descending
      .slice(0, 5) // Show top 5
      .forEach((p) => {
        const el = document.createElement("div");
        el.className = "prediction"; // Add styling via CSS
        el.innerHTML = `
                    <span class="label">${p.className}</span>
                    <span class="probability">(${(p.probability * 100).toFixed(
                      1
                    )}%)</span>
                `;
        this.elements.predictions.appendChild(el);
      });
  }

  /**
   * Shows temporary visual feedback on the camera view.
   * @param {string} label
   * @param {number} confidence
   * @private
   */
  _showDetectionFeedback(label, confidence) {
    if (!this.elements.container) return;
    const feedback = document.createElement("div");
    feedback.className = "detection-feedback"; // Style with CSS
    feedback.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 0.9em;
            z-index: 10;
        `;
    feedback.textContent = `Detected: ${label} (${(confidence * 100).toFixed(
      0
    )}%)`;
    this.elements.container.appendChild(feedback);
    setTimeout(() => feedback.remove(), 2500); // Remove after 2.5 seconds
  }

  /** Starts the scanning line animation. @private */
  _startAnimation() {
    if (!this.elements.scanLine || this.animationTimerId) return;
    this.elements.scanLine.style.display = "block";
    let position = 10;
    let direction = 1;
    this.animationTimerId = setInterval(() => {
      position += direction * 1.5; // Adjust speed as needed
      if (position >= 90 || position <= 10) {
        direction *= -1;
      }
      this.elements.scanLine.style.top = `${position}%`;
    }, 50); // Adjust interval as needed
  }

  /** Stops the scanning line animation. @private */
  _stopAnimation() {
    if (this.animationTimerId) {
      clearInterval(this.animationTimerId);
      this.animationTimerId = null;
    }
    if (this.elements.scanLine) {
      this.elements.scanLine.style.display = "none";
    }
  }

  /** Calls the configured error callback. @private */
  _handleError(errorMessage) {
    this._updateStatus(`Error: ${errorMessage}`);
    this.config.callbacks.onError(errorMessage);
  }

  /** Calls the configured status update callback. @private */
  _updateStatus(statusMessage) {
    this.config.callbacks.onStatusChange(statusMessage);
  }
}

// Export the class for use in other modules
export { ScannerService };
