// Karma configuration file for Angular testing
// Configured to use Chromium for consistent testing across local and CI environments
const { execSync } = require('child_process');

// Detect Chromium binary and set CHROME_BIN environment variable
// This must be done before karma-chrome-launcher initializes
let chromiumPath = null;
try {
  const possiblePaths = ['chromium-browser', 'chromium'];
  for (const cmd of possiblePaths) {
    try {
      const path = execSync(`which ${cmd} 2>/dev/null`, { encoding: 'utf8' }).trim();
      if (path) {
        chromiumPath = path;
        process.env.CHROME_BIN = path;
        break;
      }
    } catch (e) {
      // Continue to next option
    }
  }
} catch (e) {
  // Chromium not found - will use system default if available
}

module.exports = function (config) {
  // Headless flags required for running without display server (CI/local headless)
  const headlessFlags = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-software-rasterizer',
    '--disable-setuid-sandbox',
    '--remote-debugging-port=9222',
  ];

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
      ChromeHeadless: chromiumPath
        ? {
            // Use Chrome base launcher with Chromium executable
            // karma-chrome-launcher works with both Chrome and Chromium
            base: 'Chrome',
            flags: headlessFlags,
            executablePath: chromiumPath,
          }
        : {
            // Fallback: use default ChromeHeadless if Chromium not found
            base: 'ChromeHeadless',
            flags: headlessFlags,
          },
    },
    // Fallback configuration for when browsers aren't available
    failOnEmptyTestSuite: false,
    singleRun: true,
  });
};
