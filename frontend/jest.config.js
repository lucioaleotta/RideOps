module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
  ],
  coverageThreshold: {
    global: {
      branches: 40, // Start low, increase gradually
      functions: 40,
      lines: 40,
      statements: 40,
    },
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/'],
  transformIgnorePatterns: ['/node_modules/(?!(decode-uri-component|split-on-first|strict-uri-encode)/)'],
};
