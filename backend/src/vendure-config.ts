import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import {
    DefaultJobQueuePlugin,
    DefaultSchedulerPlugin,
    DefaultSearchPlugin,
    dummyPaymentHandler,
    VendureConfig,
} from '@vendure/core';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import { config as dotenvConfig } from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';

// Detect if running inside Docker
const isDocker = fs.existsSync('/.dockerenv') || process.env.DOCKER_CONTAINER === 'true';

// Only load from .env file if NOT in Docker
// Docker containers get env vars passed directly from docker-compose
if (!isDocker) {
    const envPaths = [
        path.join(__dirname, '../../configs/.env.backend'), // Local dev (ts-node from src/)
        path.join(__dirname, '../configs/.env.backend'),    // Docker (compiled to dist/)
    ];
    const envPath = envPaths.find(p => fs.existsSync(p));
    if (envPath) {
        console.log(`[dotenv] Loading from ${envPath}`);
        dotenvConfig({ path: envPath });
    } else {
        console.warn('[dotenv] No .env.backend file found, using system environment variables');
    }
} else {
    console.log('[dotenv] Running in Docker, using environment variables from container');
}

const IS_DEV = process.env.APP_ENV === 'dev';
const serverPort = +process.env.PORT || 3000;

export const config: VendureConfig = {
    apiOptions: {
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        trustProxy: IS_DEV ? false : 1,
        // CORS configuration for cross-origin cookie authentication
        cors: {
            origin: IS_DEV
                ? ['http://localhost:4200', 'http://127.0.0.1:4200']
                : process.env.FRONTEND_URL?.split(',') || true,
            credentials: true,
        },
        // The following options are useful in development mode,
        // but are best turned off for production for security
        // reasons.
        ...(IS_DEV ? {
            adminApiDebug: true,
            shopApiDebug: true,
        } : {}),
        // Custom middleware to serve ML model files
        middleware: [
            {
                handler: express.static(path.join(__dirname, '../static/assets/ml-models'), {
                    setHeaders: (res, filePath) => {
                        // Enable CORS for ML model files
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.setHeader('Access-Control-Allow-Methods', 'GET');

                        // Set proper MIME types
                        if (filePath.endsWith('.json')) {
                            res.setHeader('Content-Type', 'application/json');
                        } else if (filePath.endsWith('.bin')) {
                            res.setHeader('Content-Type', 'application/octet-stream');
                        }
                    },
                }),
                route: 'assets/ml-models',
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
            // Allow cookies to work across different hosts (e.g., localhost frontend -> VPN backend)
            httpOnly: true,
            sameSite: IS_DEV ? 'lax' : 'strict',
            // In development, don't require HTTPS
            secure: !IS_DEV,
        },
    },
    dbConnectionOptions: {
        type: 'postgres',
        // See the README.md "Migrations" section for an explanation of
        // the `synchronize` and `migrations` options.
        synchronize: process.env.DB_SYNCHRONIZE ? process.env.DB_SYNCHRONIZE === 'true' : false,
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
    customFields: {},
    plugins: [
        GraphiqlPlugin.init(),
        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path.join(__dirname, '../static/assets'),
            // For local dev, the correct value for assetUrlPrefix should
            // be guessed correctly, but for production it will usually need
            // to be set manually to match your production url.
            assetUrlPrefix: IS_DEV ? undefined : 'https://www.my-shop.com/assets/',
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
