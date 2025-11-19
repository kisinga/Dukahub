export {};

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
      SMS_PROVIDER?: string; // 'textsms', 'africastalking', 'twilio', 'aws-sns', etc.
      // TextSMS Configuration (default provider)
      TEXTSMS_API_KEY?: string; // Required - Your TextSMS API key
      TEXTSMS_PARTNER_ID?: string; // Required - Your TextSMS Partner ID
      TEXTSMS_SHORTCODE?: string; // Required - Your TextSMS Sender ID/Shortcode
      // AfricasTalking Configuration (alternative provider)
      AFRICASTALKING_USERNAME?: string; // Required - Your AfricasTalking username
      AFRICASTALKING_API_KEY?: string; // Required - Your AfricasTalking API key
      AFRICASTALKING_SENDER_ID?: string; // Optional - will use default if not provided
      AFRICASTALKING_ENVIRONMENT?: string; // Optional - 'sandbox' or 'production', defaults to 'production'
      AFRICASTALKING_API_URL?: string; // Optional - defaults to standard endpoint based on environment
      // Push Notification Configuration (VAPID)
      VAPID_PUBLIC_KEY?: string; // VAPID public key for web push notifications
      VAPID_PRIVATE_KEY?: string; // VAPID private key for web push notifications
      VAPID_EMAIL?: string; // VAPID subject/email (usually mailto: format)
    }
  }
}
