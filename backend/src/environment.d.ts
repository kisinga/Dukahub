export { };

// Here we declare the members of the process.env object, so that we
// can use them in our application code in a type-safe manner.
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: string;
            PORT: string;
            COOKIE_SECRET: string;
            COOKIE_SECURE?: string;
            SUPERADMIN_USERNAME: string;
            SUPERADMIN_PASSWORD: string;
            DB_HOST: string;
            DB_PORT: number;
            DB_NAME: string;
            DB_USERNAME: string;
            DB_PASSWORD: string;
            DB_SCHEMA: string;
            DB_SYNCHRONIZE: string;
            REDIS_HOST?: string;
            REDIS_PORT?: string;
            // SMS Provider Configuration
            SMS_PROVIDER?: string; // 'hostpinnacle', 'twilio', 'aws-sns', etc.
            HOSTPINNACLE_API_URL?: string;
            HOSTPINNACLE_USERID?: string;
            HOSTPINNACLE_PASSWORD?: string;
            HOSTPINNACLE_SENDER_ID?: string;
        }
    }
}
