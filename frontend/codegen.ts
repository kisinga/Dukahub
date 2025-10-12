import type { CodegenConfig } from '@graphql-codegen/cli';
import proxyConfig from './proxy.conf.json';

// Extract backend URL from proxy configuration
const adminApiProxy = proxyConfig['/admin-api'];
const backendUrl = adminApiProxy?.target || 'http://localhost:3000';
const schemaUrl = `${backendUrl}/admin-api`;

const config: CodegenConfig = {
    overwrite: true,
    // Dynamically reads backend URL from proxy.conf.json
    // This ensures codegen always uses the same backend as the dev server
    schema: schemaUrl,
    config: {
        // This tells codegen that the `Money` scalar is a number
        scalars: { Money: 'number' },
        // This ensures generated enums do not conflict with the built-in types
        namingConvention: { enumValues: 'keep' },
        // Add any custom scalars your schema uses
        avoidOptionals: {
            field: false,
            inputValue: false,
            object: false,
        },
    },
    generates: {
        // Client preset - generates ALL schema types + operation types + documents
        // This is your single source of truth for GraphQL types
        'src/app/core/graphql/generated/': {
            preset: 'client',
            documents: [
                'src/app/**/*.ts',
                'src/app/**/*.graphql.ts',
                '!src/app/core/graphql/generated/**/*',
            ],
            // This disables the "fragment masking" feature for simpler usage
            presetConfig: {
                fragmentMasking: false,
            },
        },
    },
};

export default config;

