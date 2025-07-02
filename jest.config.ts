const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.spec.ts'],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/types/**/*.ts',
  ],
  moduleNameMapper: {
    '^(..?/.+)\\.js$': '$1',
    '^../src$': '<rootDir>/src/index.ts',
    '^../src/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest'],
  },
  testTimeout: 10000,
};

export default config;
