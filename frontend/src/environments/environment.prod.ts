// Runtime configuration injected via window.__APP_CONFIG__ in production
declare global {
  interface Window {
    __APP_CONFIG__?: {
      enableTracing?: boolean;
      signozEndpoint?: string;
      serviceName?: string;
      serviceVersion?: string;
    };
  }
}

// Get runtime config from window (injected at container startup)
const getRuntimeConfig = () => {
  if (typeof window !== 'undefined' && window.__APP_CONFIG__) {
    return window.__APP_CONFIG__;
  }
  return {};
};

const runtimeConfig = getRuntimeConfig();

export const environment = {
  production: true,
  apiUrl: '/admin-api', // Will use same origin in production
  // SigNoz Observability Configuration - injected at runtime via window.__APP_CONFIG__
  enableTracing: runtimeConfig.enableTracing ?? true,
  signozEndpoint: runtimeConfig.signozEndpoint ?? '/signoz/v1/traces',
  serviceName: runtimeConfig.serviceName ?? 'dukahub-frontend',
  serviceVersion: runtimeConfig.serviceVersion ?? '2.0.0',
};

