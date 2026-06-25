import type { Config } from "jest";

const config: Config = {
  clearMocks: true,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  preset: "ts-jest",
  roots: ["<rootDir>/src"],
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
};

export default config;