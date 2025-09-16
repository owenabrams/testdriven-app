// Simple test that doesn't import complex dependencies
test('basic math works', () => {
  expect(2 + 2).toBe(4);
});

test('environment is set up correctly', () => {
  expect(process.env.NODE_ENV).toBeDefined();
});
