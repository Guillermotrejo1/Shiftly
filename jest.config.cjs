/** @type {import('jest').Config} */
module.exports = {
  clearMocks: true,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  preset: "ts-jest",
  roots: ["<rootDir>/src"],
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
};