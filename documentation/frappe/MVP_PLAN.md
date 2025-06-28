# Dukahub on Frappe: The MVP Plan

This document provides a concrete, step-by-step plan to build a functional Minimum Viable Product (MVP) of Dukahub on the Frappe platform. The goal is to prove the core "magic" (AI-powered POS) as quickly as possible by ruthlessly prioritizing features.

## The 80/20 Rule: MVP Scope

**MVP Goal:** A user can open a custom POS page on their phone, use the camera to recognize a product from a pre-trained AI model, see it added to a cart, and submit the sale. The sale must create a real `Sales Invoice` and deduct stock in the backend.

The following diagram shows the only parts of the system we will build or touch for the MVP.

```mermaid
graph TD
    subgraph P ["Frappe/ERPNext Platform (Provided)"]
        B["ERPNext App <br/> (Doctypes: 'Item', 'Sales Invoice')"]
    end

    subgraph MVP ["Your Dukahub MVP App (You Will Build This)"]
        C("1. Custom 'AI Model' DocType <br/> file: `ai_model.py`")
        D("2. Custom 'Dukahub POS' Desk Page <br/> files: `dukahub_pos.js`, `dukahub_pos.py`")
        E("3. Modification to 'Item' DocType <br/> tool: 'Customize Form'")
        F("4. Server-Side Glue Code <br/> file: `api.py`")
    end

    C --> E
    D --> F
    F --> B

    style MVP fill:#e6f3ff,stroke:#333,stroke-width:2px
```

**What We Will IGNORE for the MVP:**
*   On-device AI model training. We will use one centrally-trained model.
*   Payment gateway integration. All sales are "Cash".
*   Advanced user permissions. We will use the Administrator account for everything.
*   PWA / Offline Mode. The MVP requires an internet connection to function.

---

## Phase 0: Environment Setup (1-2 Days)

Your goal is to get a blank Frappe site running with your custom app installed.

1.  **Install Bench (Frappe's CLI):** Follow the [official installation guide](https://frappeframework.com/docs/user/en/installation).
2.  **Create a New Bench Workspace:**
    ```bash
    bench init frappe-bench --frappe-branch version-15 # Or the latest stable version
    cd frappe-bench
    ```
3.  **Create Your Site:**
    ```bash
    bench new-site dukahub.local
    ```
4.  **Install ERPNext and Your Custom App:**
    ```bash
    bench get-app erpnext --branch version-15
    bench --site dukahub.local install-app erpnext
    bench new-app dukahub_mvp
    bench --site dukahub.local install-app dukahub_mvp
    ```
5.  **Start the Server:**
    ```bash
    bench start
    ```
    You can now log into `http://dukahub.local:8000` as "Administrator" with the password you set during site creation.

## Phase 1: Backend Foundation (1 Day)

Goal: Create the database structure to hold our AI model files.

1.  **Create `AI Model` DocType:**
    *   **Action:** Create a new DocType in your `dukahub_mvp` app.
    *   **AI Prompt:** *"Generate the Python code and JSON for a new Frappe DocType named `AI Model`. It should have one Data field named `model_name`. It needs to be a submittable document and allow attachments."*
2.  **Customize `Item` DocType:**
    *   **Action:** In the ERPNext search bar, type `Customize Form` and select `Item`. Add a new field linking to your `AI Model` DocType. This requires no code.
    *   **Details:**
        *   **Label:** `AI Model`
        *   **Type:** `Link`
        *   **Options:** `AI Model`
3.  **Create First `AI Model` Record & Upload Files:**
    *   **Action:** In the UI, go to the "AI Model List". Create a new record named "General Store Model". In the sidebar, upload your pre-trained `model.json` and `weights.bin` files as attachments.

## Phase 2: The Frontend "Magic" (2-3 Days)

Goal: Build the camera UI that recognizes products.

1.  **Create the `Dukahub POS` Page:**
    *   **Action:** In your `dukahub_mvp` app, create a new `Desk Page` named "Dukahub POS". This will create the necessary `dukahub_pos.js`, `.py`, and `.html` files.
2.  **Build the Basic Camera UI:**
    *   **Action:** In the `.html` file, add a `<video>` element for the camera feed and a `<div>` to act as the cart display.
    *   **AI Prompt:** *"Give me the JavaScript for a Frappe Desk Page that uses `navigator.mediaDevices.getUserMedia` to display a camera feed in a `<video>` element."*
3.  **Load TFLite Model & Run Inference:**
    *   **Action:** In the `.js` file, fetch the attachment URLs for your "General Store Model" record. Load the model using TensorFlow.js and run `predict()` in a loop on the video feed.
    *   **AI Prompt:** *"In my Frappe JS, show me how to use `frappe.db.get_value` to get the file URL of an attachment from an 'AI Model' document named 'General Store Model'. Then show me how to load this model with TensorFlow.js Lite."*
4.  **Populate the Cart:**
    *   **Action:** When the model recognizes an item, call a backend function to get its price. Add the item to a simple JavaScript array (the cart) and update the cart `<div>` on the page.

## Phase 3: The Final Glue (1 Day)

Goal: Connect the frontend to the backend to complete a sale.

1.  **Create the Backend API:**
    *   **Action:** Create a file `dukahub_mvp/api.py`. In this file, you will write the whitelisted Python functions that your JavaScript POS calls.
2.  **Write `get_item_details` function:**
    *   **Action:** Create a whitelisted function that takes an `item_code` and returns a dictionary with the item's price and name from the `Item` DocType.
    *   **AI Prompt:** *"Write a whitelisted Frappe Python function `get_item_details(item_code)`. It should look up the `Item` with the given `item_code` and return its `item_name` and `standard_selling_rate`."*
3.  **Write `submit_pos_sale` function:**
    *   **Action:** This is the most critical function. It takes a list of item codes (the cart), creates a new `Sales Invoice` document, populates its `items` table, and submits it. This single action will automatically update inventory and accounting ledgers.
    *   **AI Prompt:** *"Write a whitelisted Frappe Python function `submit_pos_sale`. It should accept a list of item codes. It needs to create a new 'Sales Invoice' for the customer 'Walk-in', set the `items` in its child table based on the input list (fetching the price for each), and then call `doc.submit()`."*

By the end of this plan, you will have a working, demonstrable prototype that validates the core premise of Dukahub, built on a scalable and maintainable foundation. 