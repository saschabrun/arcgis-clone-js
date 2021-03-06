      // Karma configuration
// Generated on Tue Oct 16 2018 14:43:15 GMT-0700 (Pacifique (heure d’été))
const fs = require("fs");

require('ts-node').register({
  compilerOptions: {
    module: 'commonjs'
  }
});

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine', 'karma-typescript'],

    // list of files / patterns to load in the browser
    files: ["{src,test}/**/*.ts"],

    // list of files to exclude
    exclude: [],

    karmaTypescriptConfig: {
      reports: {
        lcovonly: "coverage",
        html: "coverage",
        text: ""
      },
      compilerOptions: {
        module: "commonjs"
      },
      tsconfig: "./tsconfig.json",
      bundlerOptions: {
        transforms: [require("karma-typescript-es6-transform")()],
        resolve: {
          // karmas resolver can't figure out the symlinked deps from lerna
          // so we need to manually alias each package here.
          alias: fs
            .readdirSync("node_modules/@esri")
            .filter(p => p[0] !== ".")
            .reduce((alias, p) => {
              if (p !== "arcgis-rest-common-types") {
                alias[`@esri/${p}`] = `node_modules/@esri/${p}/dist/node/index.js`;
              } else {
                // the built lib for common-types doesnt contain any JS
                alias[`@esri/${p}`] = `node_modules/@esri/${p}/src/index.ts`;
              }
              return alias;
            }, {})
        }
      }
    },

    // coveralls uses this one. still need to figure out how to DRY this up.
    coverageReporter: {
      type: 'lcov',
      dir: 'coverage/'
    },

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      "src/**/*.ts": ["karma-typescript", "coverage"],
      "test/**/*.ts": ["karma-typescript"]
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ["dots", "karma-typescript", "coverage", "coveralls"],

    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome', 'ChromeHeadless', 'Firefox', 'IE'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,


    // Concurrency level
    // how many browsers should be started simultaneously
    concurrency: Infinity,


    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox']
      }
    },
  });
};
