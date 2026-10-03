export default {
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts", "**/*.spec.ts", "**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.wrangler/**"],

    // Покриття рахується окремою командою: `npm test` має залишатися швидким,
    // а поріг — падати в CI. `check-coverage.mjs` порівнює підсумок із
    // мінімумом, який не можна знизити мовчки.
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      reportsDirectory: "coverage",
      include: [
        "packages/*/src/**",
        "bot-dev/src/**",
        "api-dev/src/**",
        "web-platform-dev/src/**",
        "web-admin-dev/src/**",
      ],
      exclude: ["**/*.test.*", "**/*.dom.test.*", "**/*.spec.*", "**/types/**"],
    },
  },
};
