# ML Model Upload - Implementation Guide

## Overview

This is a KISS (Keep It Simple, Stupid) implementation for uploading and managing ML models per channel in Vendure. ML model files are stored as regular Vendure Assets and linked to channels via custom fields.

## Architecture

- **Storage**: Uses Vendure's built-in Asset system (no manual file handling)
- **Links**: Channel custom fields reference Asset IDs
- **Serving**: AssetServerPlugin automatically serves files
- **API**: Simple GraphQL mutations and queries

## Custom Fields (Channel)

Each channel has these custom fields:

- `mlModelJsonId` (string) - Asset ID for the model.json file
- `mlModelBinId` (string) - Asset ID for the weights.bin or similar binary file
- `mlMetadataId` (string) - Asset ID for the metadata.json file
- `mlModelVersion` (string) - Auto-generated version identifier
- `mlModelStatus` (string) - Status: "active", "inactive", or "training"

**Note**: We store Asset IDs as strings (not relations) to avoid GraphQL schema complications. The resolver fetches the actual Asset objects when needed.

## GraphQL API

### Queries

```graphql
# Get ML model information for a channel
query {
  mlModelInfo(channelId: "1") {
    hasModel
    version
    status
    modelJson {
      id
      name
      source
      preview
    }
    modelBin {
      id
      name
      source
    }
    metadata {
      id
      name
      source
    }
  }
}
```

### Mutations

```graphql
# Upload a model file
mutation {
  uploadMlModelFile(
    channelId: "1"
    file: Upload!
    fileType: "model"  # or "binary" or "metadata"
  ) {
    id
    name
    source
    preview
  }
}

# Set model status
mutation {
  setMlModelStatus(channelId: "1", status: "active")
}

# Clear all model files for a channel
mutation {
  clearMlModel(channelId: "1")
}
```

## Usage

### 1. Via GraphQL Playground (Admin API)

1. Navigate to `http://localhost:3000/admin-api/graphiql`
2. Login as admin
3. Use the mutations above to upload files

### 2. Via Admin UI

The custom fields appear in the Channel editor. You can:

- Upload files directly through the Asset picker
- Set version and status manually
- View linked assets

### 3. Via Frontend/Client

```typescript
// Example using Apollo Client
import { gql } from "@apollo/client";

const UPLOAD_ML_MODEL = gql`
  mutation UploadMlModel($channelId: ID!, $file: Upload!, $fileType: String!) {
    uploadMlModelFile(channelId: $channelId, file: $file, fileType: $fileType) {
      id
      source
    }
  }
`;

// Upload model.json
await client.mutate({
  mutation: UPLOAD_ML_MODEL,
  variables: {
    channelId: "1",
    file: modelJsonFile,
    fileType: "model",
  },
});

// Upload weights.bin
await client.mutate({
  mutation: UPLOAD_ML_MODEL,
  variables: {
    channelId: "1",
    file: weightsFile,
    fileType: "binary",
  },
});

// Upload metadata.json
await client.mutate({
  mutation: UPLOAD_ML_MODEL,
  variables: {
    channelId: "1",
    file: metadataFile,
    fileType: "metadata",
  },
});

// Activate the model
await client.mutate({
  mutation: gql`
    mutation SetStatus($channelId: ID!, $status: String!) {
      setMlModelStatus(channelId: $channelId, status: $status)
    }
  `,
  variables: {
    channelId: "1",
    status: "active",
  },
});
```

### 4. Accessing Files from Frontend

Once uploaded, files are automatically served by AssetServerPlugin:

```typescript
// After querying mlModelInfo, you get Asset objects with 'source' field
const { data } = await client.query({
  query: gql`
    query GetMlModel($channelId: ID!) {
      mlModelInfo(channelId: $channelId) {
        modelJson {
          source
        }
        modelBin {
          source
        }
        metadata {
          source
        }
      }
    }
  `,
  variables: { channelId: "1" },
});

// URLs are like: /assets/model-xyz.json
const modelUrl = `${API_URL}/assets/${data.mlModelInfo.modelJson.source}`;
const weightsUrl = `${API_URL}/assets/${data.mlModelInfo.modelBin.source}`;
const metadataUrl = `${API_URL}/assets/${data.mlModelInfo.metadata.source}`;

// Load in TensorFlow.js
const model = await tf.loadLayersModel(modelUrl);
```

## File Upload via HTTP

For manual testing via cURL:

```bash
# First, get auth token
curl -X POST http://localhost:3000/admin-api \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { login(username: \"superadmin\", password: \"superadmin\") { ... on CurrentUser { id identifier } } }"
  }'

# Upload file using GraphQL multipart request
curl -X POST http://localhost:3000/admin-api \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F operations='{"query":"mutation($file: Upload!, $channelId: ID!, $fileType: String!) { uploadMlModelFile(file: $file, channelId: $channelId, fileType: $fileType) { id source } }","variables":{"file":null,"channelId":"1","fileType":"model"}}' \
  -F map='{"0":["variables.file"]}' \
  -F 0=@model.json
```

## Benefits of This Approach

1. **Simple**: Uses Vendure's existing Asset system - no reinventing the wheel
2. **Secure**: Leverages Vendure's permission system
3. **Auditable**: Asset creation is logged
4. **Flexible**: Easy to extend with additional file types
5. **No Manual File I/O**: No custom middleware or filesystem operations
6. **Frontend Ready**: Assets are automatically served with proper CORS headers

## Migration Status

The database already has the required columns from the previous migration:

- `customFieldsMlmodeljsonid` → Stores Asset ID for model.json
- `customFieldsMlmodelbinid` → Stores Asset ID for weights file
- `customFieldsMlmetadataid` → Stores Asset ID for metadata.json
- `customFieldsMlmodelversion` → Version string
- `customFieldsMlmodelstatus` → Status string

These columns are now properly mapped to the custom field definitions in `vendure-config.ts`.

## Future Enhancements

When needed, you can easily add:

- Model versioning (keep multiple versions)
- Model validation (check file format before accepting)
- Automatic metadata extraction
- Model training status tracking
- Model performance metrics
