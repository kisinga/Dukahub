import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
    overwrite: true,
    // Points to your local Vendure server
    // Make sure the server is running when you run codegen
    schema: 'http://localhost:3000/admin-api',
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

