'use strict';

var gulp  = require('gulp'),
    mocha = require('gulp-mocha'),
    gutil = require('gulp-util');
var exec  = require('child_process').exec;
var tslint = require('gulp-tslint');
var del = require('del');
var argv = require('yargs').argv;
var istanbul = require('gulp-istanbul');

// Default to list reporter when run directly.
// CI build can pass 'reporter=junit' to create JUnit results files
var reporterUnitTest = { reporter: 'list' };
var reporterIntegrationTest = { reporter: 'list' };
if (argv.reporter === "junit") {
    reporterUnitTest = { reporter: 'mocha-junit-reporter', reporterOptions: { mochaFile: 'out/results/tests/test-unittestresults.xml'} } ;
    reporterIntegrationTest = { reporter: 'mocha-junit-reporter', reporterOptions: { mochaFile: 'out/results/tests/test-integrationtestresults.xml'} } ;
}

function errorHandler(err) {
    console.error(err.message);
    process.exit(1);
}

gulp.task('tslint-src', function () {
    return gulp.src(['./src/**/*.ts'])
        .pipe(tslint())
        .pipe(tslint.report('prose', { emitError: true}))
        .on('error', errorHandler);
});

gulp.task('tslint-test', function () {
    return gulp.src(['./test/**/*.ts'])
        .pipe(tslint())
        .pipe(tslint.report('prose', { emitError: true}))
        .on('error', errorHandler);
});

gulp.task('tslint-test-integration', function () {
    return gulp.src(['./test-integration/**/*.ts'])
        .pipe(tslint())
        .pipe(tslint.report('prose', { emitError: true}))
        .on('error', errorHandler);
});

gulp.task('clean', ['tslint-src', 'tslint-test', 'tslint-test-integration'], function (done) {
    return del(['out/**', '!out', '!out/src/credentialstore/linux', '!out/src/credentialstore/osx', '!out/src/credentialstore/win32'], done);
});

gulp.task('build', ['clean'], function (cb) {
  exec('node ./node_modules/vscode/bin/compile', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('publishbuild', ['build'], function () {
    gulp.src(['./src/credentialstore/**/*.js'])
        .pipe(gulp.dest('./out/src/credentialstore'));
    gulp.src(['./src/credentialstore/bin/win32/*'])
        .pipe(gulp.dest('./out/src/credentialstore/bin/win32'));
});

gulp.task('publishall', ['publishbuild'], function () {
    gulp.src(['./test/contexts/testrepos/**/*'])
        .pipe(gulp.dest('./out/test/contexts/testrepos'));
    gulp.src(['./test/helpers/testrepos/**/*'])
        .pipe(gulp.dest('./out/test/helpers/testrepos'));
});

//Tests will fail with MODULE_NOT_FOUND if I try to run 'publishBuild' before test target
//gulp.task('test', ['publishBuild'], function() {
gulp.task('test', function() {
    return gulp.src(['out/test/**/*.js'], {read: false})
    .pipe(mocha(reporterUnitTest))
    .on('error', errorHandler);
});

gulp.task('test-integration', function() {
    return gulp.src(['out/test-integration/**/*.js'], {read: false})
    .pipe(mocha(reporterIntegrationTest))
    .on('error', errorHandler);
});

gulp.task('test-coverage', function() {
    //credentialstore is brought in from separate repository, exclude it here
    return gulp.src(['out/src/**/*.js', '!out/src/credentialstore/**'])
    //.pipe(istanbul({includeUntested: true}))
    .pipe(istanbul())
    .pipe(istanbul.hookRequire()) //for using node.js
    .on('finish', function() {
        gulp.src('out/test*/**/*.js')
          .pipe(mocha(reporterUnitTest))
          .pipe(istanbul.writeReports(
              {
                  dir: 'out/results/coverage',
                  reporters: ['cobertura','html'],
                  reportOpts: { dir: 'out/results/coverage' }
              }
          ));
    })
    .on('error', errorHandler);
});

gulp.task('test-all', ['test', 'test-integration'], function() { });

gulp.task('packageonly', function (cb) {
  exec('vsce package', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('package', ['publishall'], function (cb) {
  exec('vsce package', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('default', ['package']);
