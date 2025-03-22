// Camera stream reference
let stream = null;
let model = null;
let modelLabels = [];
let maxPredictions = 0;

const scriptTag = document.getElementById("model");
const modelSRC = JSON.parse(scriptTag.textContent);

// Load the Teachable Machine model
const loadModel = async () => {
  try {
    const modelURL = modelSRC.model;
    const metadataURL = modelSRC.metadata;

    // Load the model and metadata
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // Create labels array from model classes
    modelLabels = [];
    for (let i = 0; i < maxPredictions; i++) {
      modelLabels.push(model.getClassLabels()[i]);
    }

    console.log("Teachable Machine model loaded successfully");
    console.log("Labels loaded successfully:", modelLabels);

    return true;
  } catch (error) {
    console.error("Error loading Teachable Machine model:", error);
    return false;
  }
};

// Initialize camera on mobile
const initCamera = async () => {
  try {
    // Load model first
    await loadModel();

    // Request camera access
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });

    // Display camera feed in video element
    cameraView.srcObject = stream;
    cameraContainer.style.display = "block";

    // Add animation to scanning line
    const scanLine = document.querySelector(".scanning-line");
    let position = 10;
    let direction = 1;

    setInterval(() => {
      position += direction * 2;
      if (position >= 90 || position <= 10) {
        direction *= -1;
      }
      scanLine.style.top = `${position}%`;
    }, 50);

    // Start periodic detection
    setInterval(detectProduct, 1000); // Check for products every second
  } catch (error) {
    console.error("Error accessing camera:", error);
    alert("Could not access the camera. Please check permissions.");
  }
};

// Stop camera stream
const stopCamera = () => {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
    cameraView.srcObject = null;
    cameraContainer.style.display = "none";
  }
};

// Toggle camera
const toggleCamera = () => {
  if (stream) {
    stopCamera();
  } else {
    initCamera();
  }
};

// Function to detect products from camera feed
const detectProduct = async () => {
  if (!model || !cameraView.srcObject) return;

  try {
    // Predict with Teachable Machine
    const predictions = await model.predict(cameraView);

    // Display predictions
    displayPredictions(predictions);

    // Find the highest confidence prediction
    let maxConfidence = 0;
    let detectedClass = -1;

    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i].probability > maxConfidence) {
        maxConfidence = predictions[i].probability;
        detectedClass = i;
      }
    }

    // If confidence is high enough, add the product
    if (maxConfidence > 0.8 && detectedClass !== -1) {
      const productCode = `tm_${detectedClass}`;
      addProduct(productCode);
      showDetectionFeedback(modelLabels[detectedClass], maxConfidence);
    }
  } catch (error) {
    console.error("Error during product detection:", error);
  }
};

const displayPredictions = (predictions) => {
  const predictionsContainer = document.getElementById("predictions");
  predictionsContainer.innerHTML = ""; // Clear previous predictions

  // Sort by probability (descending)
  predictions.sort((a, b) => b.probability - a.probability);

  // Display top 5
  for (let i = 0; i < Math.min(5, predictions.length); i++) {
    const prediction = predictions[i];
    const predictionElement = document.createElement("div");
    predictionElement.className = "prediction";

    const labelElement = document.createElement("span");
    labelElement.className = "label";
    labelElement.textContent = prediction.className;

    const probabilityElement = document.createElement("span");
    probabilityElement.className = "probability";
    probabilityElement.textContent = ` - ${(
      prediction.probability * 100
    ).toFixed(2)}%`;

    predictionElement.appendChild(labelElement);
    predictionElement.appendChild(probabilityElement);
    predictionsContainer.appendChild(predictionElement);
  }
};

// Show visual feedback for detection
const showDetectionFeedback = (label, confidence) => {
  const feedback = document.createElement("div");
  feedback.className =
    "detection-feedback position-absolute top-0 start-0 m-3 bg-dark text-white p-2 rounded";
  feedback.style.opacity = "0.8";
  feedback.innerHTML = `Detected: ${label} (${(confidence * 100).toFixed(1)}%)`;

  cameraContainer.appendChild(feedback);
  setTimeout(() => feedback.remove(), 2000);
};
