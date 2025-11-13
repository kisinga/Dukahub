import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { config as dotenvConfig } from 'dotenv';
import fs from 'fs';
import path from 'path';

/**
 * Environment Configuration Service
 * 
 * Centralized service for loading and accessing environment variables.
 * All environment variables are loaded once at application startup and
 * exposed through this service, eliminating scattered process.env references.
 * 
 * This service must be initialized early in the application lifecycle.
 */
@Injectable()
export class EnvironmentConfig implements OnModuleInit {
    private readonly logger = new Logger(EnvironmentConfig.name);
    private static instance: EnvironmentConfig | null = null;
    private initialized = false;

    // Database configuration
    readonly db = {
        host: '',
        port: 5432,
        name: '',
        username: '',
        password: '',
    };

    // Audit database configuration
    readonly auditDb = {
        host: '',
        port: 5432,
        name: '',
        username: '',
        password: '',
    };

    // Application configuration
    readonly app = {
        nodeEnv: 'development',
        port: 3000,
        corsOrigin: '',
        cookieSecret: '',
        cookieSecure: false,
        frontendUrl: '',
        assetUrlPrefix: '',
    };

    // Redis configuration
    readonly redis = {
        host: '',
        port: 6379,
        password: '',
    };

    // SMS configuration
    readonly sms = {
        provider: '',
        africastalkingApiKey: '',
        africastalkingUsername: '',
        textsmsApiKey: '',
        textsmsSenderId: '',
    };

    // ML/Webhook configuration
    readonly ml = {
        webhookSecret: '',
    };

    // Push notification configuration
    readonly push = {
        vapidPublicKey: '',
        vapidPrivateKey: '',
        vapidSubject: '',
    };

    // Paystack configuration
    readonly paystack = {
        secretKey: '',
        publicKey: '',
    };

    // OTP configuration
    readonly otp = {
        redisHost: '',
        redisPort: 6379,
        redisPassword: '',
    };

    // Superadmin configuration
    readonly superadmin = {
        username: '',
        password: '',
    };

    /**
     * Get singleton instance (for use before DI container is ready)
     */
    static getInstance(): EnvironmentConfig {
        if (!EnvironmentConfig.instance) {
            EnvironmentConfig.instance = new EnvironmentConfig();
            EnvironmentConfig.instance.loadEnvironment();
        }
        return EnvironmentConfig.instance;
    }

    onModuleInit(): void {
        if (!this.initialized) {
            this.loadEnvironment();
            this.initialized = true;
            EnvironmentConfig.instance = this;
            this.logger.log('Environment configuration loaded');
        }
    }

    /**
     * Load environment variables from .env file
     * This is called early in the application lifecycle
     */
    private loadEnvironment(): void {
        // Try multiple paths to handle both development (src/) and production (dist/) scenarios
        const envPaths = [
            path.join(process.cwd(), 'configs/.env'),         // From project root
            path.join(process.cwd(), '../configs/.env'),      // From backend/ directory
            path.join(__dirname, '../../../../configs/.env'), // From dist/src/infrastructure/config/
            path.join(__dirname, '../../../configs/.env'),    // From dist/src/infrastructure/config/ (alternative)
            path.join(__dirname, '../../configs/.env'),        // From src/infrastructure/config/
        ];

        const envPath = envPaths.find(p => {
            const exists = fs.existsSync(p);
            if (exists) {
                this.logger.log(`Loading environment from: ${p}`);
            }
            return exists;
        });

        if (envPath) {
            const result = dotenvConfig({ path: envPath });
            if (result.error) {
                this.logger.warn(`Failed to load .env file: ${result.error.message}`);
            }
        } else {
            this.logger.warn('No .env file found in expected paths. Using environment variables or defaults.');
        }

        // Load database configuration
        this.db.host = process.env.DB_HOST || 'localhost';
        this.db.port = +(process.env.DB_PORT || 5432);
        this.db.name = process.env.DB_NAME || 'vendure';
        this.db.username = process.env.DB_USERNAME || 'vendure';
        this.db.password = process.env.DB_PASSWORD || 'vendure';

        // Load audit database configuration
        this.auditDb.host = process.env.AUDIT_DB_HOST || 'timescaledb_audit';
        this.auditDb.port = +(process.env.AUDIT_DB_PORT || 5432);
        this.auditDb.name = process.env.AUDIT_DB_NAME || 'audit_logs';
        this.auditDb.username = process.env.AUDIT_DB_USERNAME || 'audit_user';
        this.auditDb.password = process.env.AUDIT_DB_PASSWORD || 'audit_password';

        // Load application configuration
        this.app.nodeEnv = process.env.NODE_ENV || 'development';
        this.app.port = +(process.env.PORT || 3000);
        this.app.corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:4200';
        this.app.cookieSecret = process.env.COOKIE_SECRET || 'cookie-secret-change-in-production';
        this.app.cookieSecure = process.env.COOKIE_SECURE === 'true';
        this.app.frontendUrl = process.env.FRONTEND_URL || '';
        this.app.assetUrlPrefix = process.env.ASSET_URL_PREFIX || '';

        // Load Redis configuration
        this.redis.host = process.env.REDIS_HOST || 'localhost';
        this.redis.port = +(process.env.REDIS_PORT || 6379);
        this.redis.password = process.env.REDIS_PASSWORD || '';

        // Load SMS configuration
        this.sms.provider = process.env.SMS_PROVIDER || 'textsms';
        this.sms.africastalkingApiKey = process.env.AFRICASTALKING_API_KEY || '';
        this.sms.africastalkingUsername = process.env.AFRICASTALKING_USERNAME || '';
        this.sms.textsmsApiKey = process.env.TEXTSMS_API_KEY || '';
        this.sms.textsmsSenderId = process.env.TEXTSMS_SENDER_ID || '';

        // Load ML/Webhook configuration
        this.ml.webhookSecret = process.env.ML_WEBHOOK_SECRET || '';

        // Load Push notification configuration
        this.push.vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
        this.push.vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
        this.push.vapidSubject = process.env.VAPID_SUBJECT || '';

        // Load Paystack configuration
        this.paystack.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
        this.paystack.publicKey = process.env.PAYSTACK_PUBLIC_KEY || '';

        // Load OTP configuration
        this.otp.redisHost = process.env.OTP_REDIS_HOST || process.env.REDIS_HOST || 'localhost';
        this.otp.redisPort = +(process.env.OTP_REDIS_PORT || process.env.REDIS_PORT || 6379);
        this.otp.redisPassword = process.env.OTP_REDIS_PASSWORD || process.env.REDIS_PASSWORD || '';

        // Load Superadmin configuration
        this.superadmin.username = process.env.SUPERADMIN_USERNAME || '';
        this.superadmin.password = process.env.SUPERADMIN_PASSWORD || '';
    }

    /**
     * Validate that required environment variables are set
     */
    validate(): void {
        const required: string[] = [];

        if (!this.db.host) required.push('DB_HOST');
        if (!this.db.name) required.push('DB_NAME');
        if (!this.db.username) required.push('DB_USERNAME');
        if (!this.db.password) required.push('DB_PASSWORD');

        if (required.length > 0) {
            throw new Error(`Missing required environment variables: ${required.join(', ')}`);
        }
    }
}

/**
 * Global environment configuration instance
 * This is initialized early and available throughout the application lifecycle
 */
export const env = EnvironmentConfig.getInstance();

