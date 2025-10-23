module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/spec", "<rootDir>/src"],
  testMatch: ["**/*.spec.ts"],
  collectCoverageFrom: [
    "src/plugins/**/*.ts",
    "src/utils/**/*.ts",
    "!src/**/*.d.ts",
    "!src/migrations/**/*.ts",
    "!src/index.ts",
    "!src/index-worker.ts",
    "!src/populate.ts",
    "!src/vendure-config.ts",
    "!src/environment.d.ts",
    "!src/entrypoint.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.test.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10,
    },
  },
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: [],
  testTimeout: 30000, // 30 seconds for migration tests
};
