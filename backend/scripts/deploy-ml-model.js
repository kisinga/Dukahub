#!/usr/bin/env node
/**
 * ML Model Deployment Script
 *
 * Deploys ML model files to a Vendure channel with proper tagging and versioning.
 *
 * Usage:
 *   node deploy-ml-model.js \
 *     --channel=2 \
 *     --version=3.0.0 \
 *     --model=./models/model.json \
 *     --weights=./models/weights.bin \
 *     --metadata=./models/metadata.json \
 *     --token=YOUR_ADMIN_TOKEN \
 *     [--api=http://localhost:3000/admin-api]
 *
 * Architecture:
 *   - Tags: ml-model, channel-{id}, v{version}, trained-{date}
 *   - Active model: Asset IDs in Channel.customFields
 *   - Channel ownership: Permanent via assignAssetsToChannel
 *   - Versioning: Multiple versions can coexist, tags identify them
 */

const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const DEFAULT_API_URL = 'http://localhost:3000/admin-api';

class MLModelDeployer {
  constructor(apiUrl, authToken) {
    this.apiUrl = apiUrl;
    this.authToken = authToken;
  }

  async deploy({ channelId, version, modelFile, weightsFile, metadataFile }) {
    const trainingDate = new Date().toISOString().split('T')[0];
    const tags = ['ml-model', `channel-${channelId}`, `v${version}`, `trained-${trainingDate}`];

    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  ML MODEL DEPLOYMENT                                      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(`Channel:        ${channelId}`);
    console.log(`Version:        v${version}`);
    console.log(`Training Date:  ${trainingDate}`);
    console.log(`Tags:           ${tags.join(', ')}`);
    console.log('');

    // Validate files exist
    const files = [
      { path: modelFile, name: 'model.json' },
      { path: weightsFile, name: 'weights.bin' },
      { path: metadataFile, name: 'metadata.json' },
    ];

    for (const file of files) {
      if (!fs.existsSync(file.path)) {
        throw new Error(`File not found: ${file.path}`);
      }
    }

    // Step 1: Upload assets
    console.log('📤 Step 1/3: Uploading files...');
    const assetIds = [];
    for (const file of files) {
      process.stdout.write(`  ⏳ ${file.name}... `);
      const assetId = await this.uploadAsset(file.path, tags);
      assetIds.push(assetId);
      console.log(`✅ (ID: ${assetId})`);
    }
    console.log('');

    // Step 2: Assign to channel
    console.log('🔗 Step 2/3: Assigning to channel...');
    await this.assignAssetsToChannel(assetIds, channelId);
    console.log('  ✅ Assets assigned');
    console.log('');

    // Step 3: Activate version
    console.log('⚡ Step 3/3: Activating version...');
    await this.activateVersion(channelId, assetIds);
    console.log('  ✅ Version activated');
    console.log('');

    // Summary
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ DEPLOYMENT SUCCESSFUL                                 ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(`Asset IDs: [${assetIds.join(', ')}]`);
    console.log('');
    console.log('Next steps:');
    console.log('  - Verify in Admin UI: Settings → Channels → ML Model tab');
    console.log('  - Frontend will auto-load new version on next request');
    console.log('  - To rollback: Update channel custom fields with old IDs');
    console.log('');

    return { assetIds, version, trainingDate };
  }

  async uploadAsset(filePath, tags) {
    const formData = new FormData();

    formData.append(
      'operations',
      JSON.stringify({
        query: `
        mutation($file: Upload!) {
          createAssets(input: [{
            file: $file
            tags: ${JSON.stringify(tags)}
          }]) {
            ... on Asset {
              id
              name
            }
            ... on MimeTypeError {
              message
            }
          }
        }
      `,
        variables: { file: null },
      })
    );

    formData.append('map', JSON.stringify({ 0: ['variables.file'] }));
    formData.append('0', fs.createReadStream(filePath));

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    const result = await response.json();

    if (result.errors) {
      throw new Error(`Upload failed: ${JSON.stringify(result.errors)}`);
    }

    const asset = result.data?.createAssets?.[0];
    if (!asset || !asset.id) {
      throw new Error('Upload failed: No asset ID returned');
    }

    return asset.id;
  }

  async assignAssetsToChannel(assetIds, channelId) {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation($assetIds: [ID!]!, $channelId: ID!) {
            assignAssetsToChannel(input: {
              assetIds: $assetIds
              channelId: $channelId
            }) {
              id
            }
          }
        `,
        variables: { assetIds, channelId },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      throw new Error(`Assignment failed: ${JSON.stringify(result.errors)}`);
    }
  }

  async activateVersion(channelId, assetIds) {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation($input: UpdateChannelInput!) {
            updateChannel(input: $input) {
              id
              customFields {
                mlModelJsonId
                mlModelBinId
                mlMetadataId
              }
            }
          }
        `,
        variables: {
          input: {
            id: channelId,
            customFields: {
              mlModelJsonId: assetIds[0],
              mlModelBinId: assetIds[1],
              mlMetadataId: assetIds[2],
            },
          },
        },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      throw new Error(`Activation failed: ${JSON.stringify(result.errors)}`);
    }
  }
}

// CLI argument parsing
function parseArgs() {
  const args = process.argv.slice(2).reduce((acc, arg) => {
    const [key, value] = arg.split('=');
    acc[key.replace('--', '')] = value;
    return acc;
  }, {});

  const required = ['channel', 'version', 'model', 'weights', 'metadata', 'token'];
  const missing = required.filter(key => !args[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required arguments:', missing.join(', '));
    console.log('');
    console.log('Usage:');
    console.log('  node deploy-ml-model.js \\');
    console.log('    --channel=2 \\');
    console.log('    --version=3.0.0 \\');
    console.log('    --model=./models/model.json \\');
    console.log('    --weights=./models/weights.bin \\');
    console.log('    --metadata=./models/metadata.json \\');
    console.log('    --token=YOUR_ADMIN_TOKEN \\');
    console.log('    [--api=http://localhost:3000/admin-api]');
    console.log('');
    console.log('Example:');
    console.log('  node deploy-ml-model.js \\');
    console.log('    --channel=2 \\');
    console.log('    --version=1.0.0 \\');
    console.log('    --model=./ml-models/model.json \\');
    console.log('    --weights=./ml-models/weights.bin \\');
    console.log('    --metadata=./ml-models/metadata.json \\');
    console.log('    --token=abc123...');
    process.exit(1);
  }

  return {
    channelId: args.channel,
    version: args.version,
    modelFile: args.model,
    weightsFile: args.weights,
    metadataFile: args.metadata,
    authToken: args.token,
    apiUrl: args.api || DEFAULT_API_URL,
  };
}

// Main execution
async function main() {
  try {
    const config = parseArgs();
    const deployer = new MLModelDeployer(config.apiUrl, config.authToken);

    await deployer.deploy({
      channelId: config.channelId,
      version: config.version,
      modelFile: config.modelFile,
      weightsFile: config.weightsFile,
      metadataFile: config.metadataFile,
    });

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('╔═══════════════════════════════════════════════════════════╗');
    console.error('║  ❌ DEPLOYMENT FAILED                                     ║');
    console.error('╚═══════════════════════════════════════════════════════════╝');
    console.error('Error:', error.message);
    console.error('');
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { MLModelDeployer };
