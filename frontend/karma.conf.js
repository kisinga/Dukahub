// Karma configuration file for Angular testing
// Standard Angular CI testing setup using ChromeHeadlessNoSandbox
module.exports = function (config) {
  // Detect CI/headless environment - check multiple indicators
  // Priority: Explicit USE_HEADLESS flag, then CI detection, then display check
  const useHeadlessExplicit =
    process.env.USE_HEADLESS === 'true' || process.env.USE_HEADLESS === '1';
  const isCI =
    process.env.CI === 'true' ||
    process.env.CI === '1' ||
    process.env.CONTINUOUS_INTEGRATION === 'true' ||
    process.env.GITHUB_ACTIONS === 'true' ||
    process.env.GITLAB_CI === 'true' ||
    process.env.JENKINS_URL !== undefined;

  // Check if display is actually available (not just set)
  // DISPLAY might be set to ':0' in CI but not actually available
  const hasDisplay =
    process.env.DISPLAY &&
    process.env.DISPLAY !== '' &&
    process.env.DISPLAY !== ':0' &&
    process.env.DISPLAY !== ':99' &&
    process.env.DISPLAY !== ':99.0';

  // Use headless if explicitly requested, in CI (always), or no valid display available
  const useHeadless = useHeadlessExplicit || isCI || !hasDisplay;

  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      jasmine: {
        // you can add configuration options for Jasmine here
        // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
        // for example, you can disable the random execution order
        // random: false
      },
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
    },
    jasmineHtmlReporter: {
      suppressAll: true, // removes the duplicated traces
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }, { type: 'lcov' }],
    },
    reporters: ['progress', 'kjhtml', 'coverage'],
    browsers: useHeadless ? ['ChromeHeadlessNoSandbox'] : ['Chrome'],
    restartOnFileChange: true,
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--disable-software-rasterizer',
          '--disable-extensions',
          '--remote-debugging-port=0',
        ],
      },
    },
    // Fallback configuration for when browsers aren't available
    failOnEmptyTestSuite: false,
    singleRun: true,
  });
};
