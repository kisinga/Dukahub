module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/spec"],
  testMatch: ["**/*.spec.ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/migrations/**/*.ts",
    "!src/index.ts",
    "!src/index-worker.ts",
    "!src/populate.ts",
    "!src/vendure-config.ts",
    "!src/environment.d.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: [],
  testTimeout: 30000, // 30 seconds for migration tests
};
