const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.spec.ts'],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/types/**/*.ts',
  ],
  moduleNameMapper: {
    '^(..?/.+).js$': '$1',
  },
  globals: {
    transform: {
      '^.+.tsx?$': ['ts-jest', { isolatedModules: true }],
    },
  },
  testTimeout: 10000,
};

export default config;
