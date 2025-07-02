// Jest setup file to prevent memory issues during tests

// Force garbage collection after each test
afterEach(() => {
  if (global.gc) {
    global.gc();
  }
});

// Set up memory monitoring for large tests
beforeAll(() => {
  // Increase Node.js memory limit warning threshold
  if (
    process.env.NODE_OPTIONS &&
    !process.env.NODE_OPTIONS.includes('--max-old-space-size')
  ) {
    console.log(
      'Note: Consider running tests with --max-old-space-size=8192 for large image tests'
    );
  }
});

// Export empty object to make this a module
export {};
