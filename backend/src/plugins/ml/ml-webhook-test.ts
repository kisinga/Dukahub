/**
 * ML Training Webhook Test
 *
 * This file demonstrates how the webhook system works.
 * When training status changes, webhooks are sent to external services.
 *
 * Current implementation: Console logging
 * Production implementation: HTTP POST to external service URL
 */

// Example webhook payload that would be sent to external service:
export const exampleWebhookPayload = {
  channelId: '2',
  status: 'ready',
  progress: 100,
  productCount: 15,
  imageCount: 45,
  manifestUrl:
    'http://localhost:3000/admin-api?query=query{mlTrainingManifest(channelId:"2"){channelId,version,extractedAt,products{productId,productName,images{assetId,url,filename}}}}',
  error: null,
};

// Example external service response:
export const exampleExternalServiceResponse = {
  success: true,
  message: 'Training started',
  estimatedCompletionTime: '2025-10-17T16:00:00Z',
};

/**
 * How the webhook flow works:
 *
 * 1. User clicks "Prepare Training Data" in admin UI
 * 2. Backend extracts photos and updates status to 'extracting'
 * 3. Webhook sent: { status: 'extracting', progress: 0 }
 * 4. Backend completes extraction, updates status to 'ready'
 * 5. Webhook sent: { status: 'ready', progress: 100, manifestUrl: '...' }
 * 6. External service receives webhook, downloads manifest
 * 7. External service trains model, uploads via completeTraining mutation
 * 8. Backend updates status to 'active'
 *
 * The webhook payload includes:
 * - channelId: Which channel the training is for
 * - status: Current training status
 * - progress: Progress percentage (0-100)
 * - productCount: Number of products in training set
 * - imageCount: Number of images in training set
 * - manifestUrl: URL to download training manifest (when ready)
 * - error: Error message (if failed)
 */
