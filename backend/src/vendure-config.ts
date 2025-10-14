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
import { MlModelPlugin } from './plugins/ml-model.plugin';

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
    // When adding or altering custom field definitions, the database will
    // need to be updated. See the "Migrations" section in README.md.
    customFields: {
        Channel: [
            {
                name: 'mlModelJsonId',
                type: 'string',
                nullable: true,
                label: [{ languageCode: LanguageCode.en, value: 'ML Model JSON Asset ID' }],
                description: [{ languageCode: LanguageCode.en, value: 'Asset ID for model.json file' }],
                ui: { component: 'asset-form-input' },
            },
            {
                name: 'mlModelBinId',
                type: 'string',
                nullable: true,
                label: [{ languageCode: LanguageCode.en, value: 'ML Model Binary Asset ID' }],
                description: [{ languageCode: LanguageCode.en, value: 'Asset ID for weights.bin file' }],
                ui: { component: 'asset-form-input' },
            },
            {
                name: 'mlMetadataId',
                type: 'string',
                nullable: true,
                label: [{ languageCode: LanguageCode.en, value: 'ML Model Metadata Asset ID' }],
                description: [{ languageCode: LanguageCode.en, value: 'Asset ID for metadata.json file' }],
                ui: { component: 'asset-form-input' },
            },
            {
                name: 'mlModelVersion',
                type: 'string',
                nullable: true,
                label: [{ languageCode: LanguageCode.en, value: 'ML Model Version' }],
                description: [{ languageCode: LanguageCode.en, value: 'Version identifier for the ML model' }],
            },
            {
                name: 'mlModelStatus',
                type: 'string',
                nullable: true,
                defaultValue: 'inactive',
                label: [{ languageCode: LanguageCode.en, value: 'ML Model Status' }],
                description: [{ languageCode: LanguageCode.en, value: 'Status: active, inactive, or training' }],
            },
        ],
    },
    plugins: [
        GraphiqlPlugin.init(),
        MlModelPlugin,
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
