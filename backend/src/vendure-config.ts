import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import {
    Asset,
    configureDefaultOrderProcess,
    DefaultJobQueuePlugin,
    DefaultSchedulerPlugin,
    DefaultSearchPlugin,
    LanguageCode,
    manualFulfillmentHandler,
    VendureConfig
} from '@vendure/core';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import { config as dotenvConfig } from 'dotenv';
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ChannelSettingsPlugin } from './plugins/channel-settings.plugin';
import { FractionalQuantityPlugin } from './plugins/fractional-quantity.plugin';
import { MlModelPlugin } from './plugins/ml-model.plugin';
import { NotificationPlugin } from './plugins/notification.plugin';
import { cashPaymentHandler, mpesaPaymentHandler } from './plugins/payment-handlers';
import { PhoneAuthPlugin } from './plugins/phone-auth.plugin';
import { OverridePricePermission } from './plugins/price-override.permission';
import { PriceOverridePlugin } from './plugins/price-override.plugin';

// Load environment variables from .env file for local development
// Docker containers get env vars from docker-compose (these override .env)
const envPaths = [
    path.join(__dirname, '../../configs/.env'), // Local dev (ts-node from src/)
    path.join(__dirname, '../configs/.env'),    // Compiled (dist/)
];
const envPath = envPaths.find(p => fs.existsSync(p));
if (envPath) {
    dotenvConfig({ path: envPath });
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const serverPort = +process.env.PORT || 3000;
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

// Configure order process to disable shipping requirements for POS
const customOrderProcess = configureDefaultOrderProcess({
    arrangingPaymentRequiresShipping: false, // Disable shipping requirement for POS
    arrangingPaymentRequiresCustomer: true, // Keep customer requirement
});

export const config: VendureConfig = {
    apiOptions: {
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        trustProxy: IS_PRODUCTION ? 1 : false,
        cors: {
            origin: IS_PRODUCTION
                ? process.env.FRONTEND_URL?.split(',') || true
                : ['http://localhost:4200', 'http://127.0.0.1:4200'],
            credentials: true,
        },
        // Debug modes enabled only in development
        ...(!IS_PRODUCTION ? {
            adminApiDebug: true,
            shopApiDebug: true,
        } : {}),
        // Custom middleware
        middleware: [
            // Health check endpoint
            {
                handler: (req: Request, res: Response) => {
                    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
                },
                route: 'health',
            },
        ],
    },
    assetOptions: {
        permittedFileTypes: [
            // Images
            '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
            'image/*',
            // Documents
            '.pdf',
            'application/pdf',
            // ML Model files
            '.json',
            'application/json',
            '.bin',
            'application/octet-stream',
            '.pb',  // TensorFlow
            '.h5',  // Keras
            '.onnx',  // ONNX
            '.tflite',  // TensorFlow Lite
        ],
        uploadMaxFileSize: 52428800,  // 50MB for large model files
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
            secret: process.env.COOKIE_SECRET,
            httpOnly: true,
            sameSite: 'lax',
            secure: COOKIE_SECURE,
        },
        customPermissions: [OverridePricePermission],
        // OTP token auth strategy will be registered by PhoneAuthPlugin before bootstrap
        // It must be first in the array to be found by getAuthenticationStrategy (which uses find())
    },
    dbConnectionOptions: {
        type: 'postgres',
        synchronize: false, // Never use in production
        migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
        migrationsRun: true, // Auto-run pending migrations on startup
        logging: false,
        database: process.env.DB_NAME,
        schema: process.env.DB_SCHEMA,
        host: process.env.DB_HOST,
        port: +process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
    },
    paymentOptions: {
        paymentMethodHandlers: [
            cashPaymentHandler,
            mpesaPaymentHandler,
        ],
    },
    // ML Model Management: Tag-based versioning + custom field activation
    // - Assets tagged: ml-model, channel-{id}, v{version}, trained-{date}
    // - Active model: Asset IDs in Channel.customFields below
    // - Deploy: backend/scripts/deploy-ml-model.js
    customFields: {
        Product: [
            {
                name: 'barcode',
                type: 'string',
                label: [{ languageCode: LanguageCode.en, value: 'Product Barcode' }],
                description: [{ languageCode: LanguageCode.en, value: 'Barcode for the entire product (shared across all variants)' }],
                public: true,
                nullable: true,
            },
        ],
        Channel: [
            {
                name: 'mlModelJsonAsset',
                type: 'relation',
                entity: Asset,
                label: [{ languageCode: LanguageCode.en, value: 'ML Model JSON Asset' }],
                description: [{ languageCode: LanguageCode.en, value: 'Asset for model.json file' }],
                public: false,
                nullable: true,
                ui: {
                    tab: 'ML Model',
                    component: 'asset-selector',
                    props: {
                        acceptedFileTypes: ['application/json', 'text/json', '.json'],
                        multiple: false
                    }
                },
            },
            {
                name: 'mlModelBinAsset',
                type: 'relation',
                entity: Asset,
                label: [{ languageCode: LanguageCode.en, value: 'ML Model Weights Asset' }],
                description: [{ languageCode: LanguageCode.en, value: 'Asset for weights.bin file' }],
                public: false,
                nullable: true,
                ui: {
                    tab: 'ML Model',
                    component: 'asset-selector',
                    props: {
                        acceptedFileTypes: ['application/octet-stream', 'application/binary', '.bin'],
                        multiple: false
                    }
                },
            },
            {
                name: 'mlMetadataAsset',
                type: 'relation',
                entity: Asset,
                label: [{ languageCode: LanguageCode.en, value: 'ML Metadata Asset' }],
                description: [{ languageCode: LanguageCode.en, value: 'Asset for metadata.json file' }],
                public: false,
                nullable: true,
                ui: {
                    tab: 'ML Model',
                    component: 'asset-selector',
                    props: {
                        acceptedFileTypes: ['application/json', 'text/json', '.json'],
                        multiple: false
                    }
                },
            },
            {
                name: 'companyLogoAsset',
                type: 'relation',
                entity: Asset,
                label: [{ languageCode: LanguageCode.en, value: 'Company Logo Asset' }],
                description: [{ languageCode: LanguageCode.en, value: 'Asset for the company logo image' }],
                public: true,
                nullable: true,
                ui: {
                    tab: 'Branding',
                    component: 'asset-selector',
                    props: {
                        acceptedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
                        multiple: false
                    }
                },
            },
            {
                name: 'cashierFlowEnabled',
                type: 'boolean',
                label: [{ languageCode: LanguageCode.en, value: 'Enable Cashier Flow' }],
                description: [{
                    languageCode: LanguageCode.en,
                    value: 'When enabled, orders in this channel require cashier approval before completion'
                }],
                defaultValue: false,
                public: true,
                nullable: false,
                ui: { tab: 'Settings' },
            },
            {
                name: 'cashierOpen',
                type: 'boolean',
                label: [{ languageCode: LanguageCode.en, value: 'Cashier Currently Open' }],
                description: [{
                    languageCode: LanguageCode.en,
                    value: 'Real-time status: Is a cashier currently serving in this channel?'
                }],
                defaultValue: false,
                public: true,
                nullable: false,
                ui: { tab: 'Settings' },
            },
            {
                name: 'mlTrainingStatus',
                type: 'string',
                label: [{ languageCode: LanguageCode.en, value: 'ML Training Status' }],
                description: [{ languageCode: LanguageCode.en, value: 'Current status: idle, extracting, ready, training, active, failed' }],
                defaultValue: 'idle',
                public: true,
                nullable: false,
                ui: { tab: 'ML Model' },
            },
            {
                name: 'mlTrainingProgress',
                type: 'int',
                label: [{ languageCode: LanguageCode.en, value: 'Training Progress %' }],
                description: [{ languageCode: LanguageCode.en, value: 'Progress percentage (0-100)' }],
                defaultValue: 0,
                public: true,
                nullable: false,
                ui: { tab: 'ML Model' },
            },
            {
                name: 'mlTrainingStartedAt',
                type: 'datetime',
                label: [{ languageCode: LanguageCode.en, value: 'Training Started At' }],
                public: true,
                nullable: true,
                ui: { tab: 'ML Model' },
            },
            {
                name: 'mlTrainingError',
                type: 'text',
                label: [{ languageCode: LanguageCode.en, value: 'Last Training Error' }],
                public: false,
                nullable: true,
                ui: { tab: 'ML Model' },
            },
            {
                name: 'mlProductCount',
                type: 'int',
                label: [{ languageCode: LanguageCode.en, value: 'Product Count in Model' }],
                defaultValue: 0,
                public: true,
                nullable: false,
                ui: { tab: 'ML Model' },
            },
            {
                name: 'mlImageCount',
                type: 'int',
                label: [{ languageCode: LanguageCode.en, value: 'Image Count in Model' }],
                defaultValue: 0,
                public: true,
                nullable: false,
                ui: { tab: 'ML Model' },
            },
        ],
        Customer: [
            {
                name: 'isSupplier',
                type: 'boolean',
                label: [{ languageCode: LanguageCode.en, value: 'Is Supplier' }],
                description: [{ languageCode: LanguageCode.en, value: 'Marks this customer as a supplier' }],
                defaultValue: false,
                public: false,
                nullable: false,
                ui: { tab: 'Business Type' },
            },
            {
                name: 'supplierType',
                type: 'string',
                label: [{ languageCode: LanguageCode.en, value: 'Supplier Type' }],
                description: [{ languageCode: LanguageCode.en, value: 'Type of supplier (e.g., Manufacturer, Distributor, etc.)' }],
                public: true,
                nullable: true,
                ui: { tab: 'Supplier Info' },
            },
            {
                name: 'contactPerson',
                type: 'string',
                label: [{ languageCode: LanguageCode.en, value: 'Contact Person' }],
                description: [{ languageCode: LanguageCode.en, value: 'Primary contact person for this supplier' }],
                public: true,
                nullable: true,
                ui: { tab: 'Supplier Info' },
            },
            {
                name: 'taxId',
                type: 'string',
                label: [{ languageCode: LanguageCode.en, value: 'Tax ID' }],
                description: [{ languageCode: LanguageCode.en, value: 'Tax identification number' }],
                public: true,
                nullable: true,
                ui: { tab: 'Supplier Info' },
            },
            {
                name: 'paymentTerms',
                type: 'string',
                label: [{ languageCode: LanguageCode.en, value: 'Payment Terms' }],
                description: [{ languageCode: LanguageCode.en, value: 'Payment terms for this supplier (e.g., Net 30, COD, etc.)' }],
                public: true,
                nullable: true,
                ui: { tab: 'Supplier Info' },
            },
            {
                name: 'notes',
                type: 'text',
                label: [{ languageCode: LanguageCode.en, value: 'Supplier Notes' }],
                description: [{ languageCode: LanguageCode.en, value: 'Additional notes about this supplier' }],
                public: true,
                nullable: true,
                ui: { tab: 'Supplier Info' },
            },
            {
                name: 'outstandingAmount',
                type: 'float',
                label: [{ languageCode: LanguageCode.en, value: 'Outstanding Amount' }],
                description: [{ languageCode: LanguageCode.en, value: 'Amount owed to this supplier (positive) or amount customer owes (negative)' }],
                defaultValue: 0,
                public: true,
                nullable: false,
                ui: { tab: 'Financial' },
            },
        ],
        PaymentMethod: [
            {
                name: 'imageAsset',
                type: 'relation',
                entity: Asset,
                label: [{ languageCode: LanguageCode.en, value: 'Payment Method Image Asset' }],
                description: [{ languageCode: LanguageCode.en, value: 'Asset for payment method image/logo' }],
                public: true,
                nullable: true,
                ui: {
                    tab: 'Display',
                    component: 'asset-selector',
                    props: {
                        acceptedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
                        multiple: false
                    }
                },
            },
            {
                name: 'isActive',
                type: 'boolean',
                label: [{ languageCode: LanguageCode.en, value: 'Is Active' }],
                description: [{ languageCode: LanguageCode.en, value: 'Whether this payment method is active' }],
                public: true,
                nullable: true,
                defaultValue: true,
                ui: { tab: 'Display' },
            },
        ],
        OrderLine: [
            {
                name: 'customLinePrice',
                type: 'int',
                label: [{ languageCode: LanguageCode.en, value: 'Custom Line Price' }],
                description: [{ languageCode: LanguageCode.en, value: 'Total custom price for this line in cents (overrides variant price)' }],
                public: true,
                nullable: true,
            },
            {
                name: 'priceOverrideReason',
                type: 'string',
                label: [{ languageCode: LanguageCode.en, value: 'Price Override Reason' }],
                description: [{ languageCode: LanguageCode.en, value: 'Reason code for price override' }],
                public: true,
                nullable: true,
            },
        ],
        StockLocation: [],
        ProductVariant: [
            {
                name: 'wholesalePrice',
                type: 'int',
                label: [{ languageCode: LanguageCode.en, value: 'Wholesale Price' }],
                description: [{ languageCode: LanguageCode.en, value: 'Maximum discounted price in cents (serves as discount limit)' }],
                public: true,
                nullable: true,
                ui: { tab: 'Pricing' },
            },
            {
                name: 'allowFractionalQuantity',
                type: 'boolean',
                label: [{ languageCode: LanguageCode.en, value: 'Allow Fractional Sales' }],
                description: [{ languageCode: LanguageCode.en, value: 'Enable fractional quantity sales (e.g., 0.5kg)' }],
                defaultValue: false,
                public: true,
                nullable: false,
                ui: { tab: 'Pricing' },
            },
        ],
        User: [
            {
                name: 'authorizationStatus',
                type: 'string',
                label: [{ languageCode: LanguageCode.en, value: 'Authorization Status' }],
                description: [{ languageCode: LanguageCode.en, value: 'User authorization status for login access' }],
                defaultValue: 'PENDING',
                public: false,
                nullable: false,
            },
        ],
    },
    orderOptions: {
        process: [customOrderProcess],
    },
    shippingOptions: {
        fulfillmentHandlers: [manualFulfillmentHandler],
    },
    plugins: [
        GraphiqlPlugin.init(),
        MlModelPlugin,
        PriceOverridePlugin,
        ChannelSettingsPlugin,
        FractionalQuantityPlugin,
        NotificationPlugin,
        // PhoneAuthPlugin must be registered early so its strategy can be added to adminAuthenticationStrategy
        PhoneAuthPlugin,
        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path.join(__dirname, '../static/assets'),
            assetUrlPrefix: process.env.ASSET_URL_PREFIX || undefined,
        }),
        DefaultSchedulerPlugin.init(),
        DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
        DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
        EmailPlugin.init({
            devMode: true,
            outputPath: path.join(process.cwd(), 'static/email/test-emails'),
            route: 'mailbox',
            handlers: defaultEmailHandlers,
            templateLoader: new FileBasedTemplateLoader(path.join(process.cwd(), 'static/email/templates')),
            globalTemplateVars: {
                // The following variables will change depending on your storefront implementation.
                // Here we are assuming a storefront running at http://localhost:8080.
                fromAddress: '"example" <noreply@example.com>',
                verifyEmailAddressUrl: 'http://localhost:8080/verify',
                passwordResetUrl: 'http://localhost:8080/password-reset',
                changeEmailAddressUrl: 'http://localhost:8080/verify-email-address-change'
            },
        }),
        AdminUiPlugin.init({
            route: 'admin',
            port: serverPort + 2,
            adminUiConfig: {
                apiPort: serverPort,
            },
        }),
    ],
};
