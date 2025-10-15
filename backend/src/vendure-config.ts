import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import {
    DefaultJobQueuePlugin,
    DefaultSchedulerPlugin,
    DefaultSearchPlugin,
    dummyPaymentHandler,
    LanguageCode,
    VendureConfig
} from '@vendure/core';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import { config as dotenvConfig } from 'dotenv';
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
// import { MlModelPlugin } from './plugins/ml-model.plugin';

// ML Model functionality handled via existing AssetServerPlugin and custom middleware

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
        paymentMethodHandlers: [dummyPaymentHandler],
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
                name: 'mlModelJsonId',
                type: 'string',
                label: [{ languageCode: LanguageCode.en, value: 'ML Model JSON Asset ID' }],
                description: [{ languageCode: LanguageCode.en, value: 'Asset ID for model.json file' }],
                public: false,
                nullable: true,
                ui: { tab: 'ML Model' },
            },
            {
                name: 'mlModelBinId',
                type: 'string',
                label: [{ languageCode: LanguageCode.en, value: 'ML Model Weights Asset ID' }],
                description: [{ languageCode: LanguageCode.en, value: 'Asset ID for weights.bin file' }],
                public: false,
                nullable: true,
                ui: { tab: 'ML Model' },
            },
            {
                name: 'mlMetadataId',
                type: 'string',
                label: [{ languageCode: LanguageCode.en, value: 'ML Metadata Asset ID' }],
                description: [{ languageCode: LanguageCode.en, value: 'Asset ID for metadata.json file' }],
                public: false,
                nullable: true,
                ui: { tab: 'ML Model' },
            },
            {
                name: 'companyLogoId',
                type: 'string',
                label: [{ languageCode: LanguageCode.en, value: 'Company Logo Asset ID' }],
                description: [{ languageCode: LanguageCode.en, value: 'Asset ID for the company logo image' }],
                public: true,
                nullable: true,
                ui: { tab: 'Branding' },
            },
        ],
        StockLocation: [
            {
                name: 'cashierFlowEnabled',
                type: 'boolean',
                label: [{ languageCode: LanguageCode.en, value: 'Enable Cashier Flow' }],
                description: [{ languageCode: LanguageCode.en, value: 'Enable cashier/POS interface at this location' }],
                public: true,
                defaultValue: false,
            },
            {
                name: 'cashierOpen',
                type: 'boolean',
                label: [{ languageCode: LanguageCode.en, value: 'Cashier Open' }],
                description: [{ languageCode: LanguageCode.en, value: 'Whether the cashier is currently open at this location' }],
                public: true,
                defaultValue: false,
            },
        ],
    },
    plugins: [
        GraphiqlPlugin.init(),
        // MlModelPlugin,
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
            outputPath: path.join(__dirname, '../static/email/test-emails'),
            route: 'mailbox',
            handlers: defaultEmailHandlers,
            templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
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
