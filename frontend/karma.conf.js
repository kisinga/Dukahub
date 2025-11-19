// Karma configuration file for Angular testing
// Set CHROME_BIN before karma-chrome-launcher initializes
const { execSync } = require('child_process');
try {
  const possiblePaths = ['chromium-browser', 'chromium'];
  for (const cmd of possiblePaths) {
    try {
      const path = execSync(`which ${cmd} 2>/dev/null`, { encoding: 'utf8' }).trim();
      if (path) {
        process.env.CHROME_BIN = path;
        break;
      }
    } catch (e) {
      // Continue to next option
    }
  }
} catch (e) {
  // Will fall back to karma-chrome-launcher's default detection
}

module.exports = function (config) {
  const chromePath = process.env.CHROME_BIN;

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
    browsers: ['ChromeHeadless'],
    restartOnFileChange: true,
    customLaunchers: {
      ChromeHeadless: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-gpu',
          '--headless',
          '--disable-dev-shm-usage',
          '--disable-software-rasterizer',
        ],
        ...(chromePath && { executablePath: chromePath }),
      },
    },
    // Fallback configuration for when browsers aren't available
    failOnEmptyTestSuite: false,
    singleRun: true,
  });
};
