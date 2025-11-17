// Runtime configuration can be injected via window.__APP_CONFIG__ in production
// For development, these defaults are used
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

// Get runtime config from window or use defaults
const getRuntimeConfig = () => {
  if (typeof window !== 'undefined' && window.__APP_CONFIG__) {
    return window.__APP_CONFIG__;
  }
  return {};
};

const runtimeConfig = getRuntimeConfig();

export const environment = {
  production: false,
  apiUrl: '/admin-api', // Proxied by dev server (see proxy.conf.json)
  // SigNoz Observability Configuration
  // ⚠️ NOTE: Tracing is NOT available in development mode (ng serve)
  // - proxy.conf.json is static and cannot proxy /signoz/ requests
  // - Runtime config injection only works in Docker containers
  // - Use Docker Compose for testing observability features
  enableTracing: runtimeConfig.enableTracing ?? false,
  signozEndpoint: runtimeConfig.signozEndpoint ?? '/signoz/v1/traces',
  serviceName: runtimeConfig.serviceName ?? 'dukahub-frontend',
  serviceVersion: runtimeConfig.serviceVersion ?? '2.0.0',
};

