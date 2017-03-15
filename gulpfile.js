'use strict';

var gulp  = require('gulp'),
    mocha = require('gulp-mocha'),
    gutil = require('gulp-util');
var exec  = require('child_process').exec;
var tslint = require('gulp-tslint');
var typescript = require('gulp-typescript');
var sourcemaps = require('gulp-sourcemaps');
var del = require('del');
var argv = require('yargs').argv;
var istanbul = require('gulp-istanbul');
var tl = require('vsts-task-lib');
var path = require('path');

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

gulp.task('clean', function (done) {
    return del(['out/**', '!out', '!out/src/credentialstore/linux', '!out/src/credentialstore/osx', '!out/src/credentialstore/win32'], done);
});

gulp.task('copyresources', ['clean'],  function() {
    return gulp.src('resources/**/*')
        .pipe(gulp.dest('out/resources'));
});

gulp.task('build', ['copyresources'], function () {
    let tsProject = typescript.createProject('./tsconfig.json');
    let tsResult = tsProject.src()
        .pipe(sourcemaps.init())
        .pipe(tsProject())
        .on('error', errorHandler);

    return tsResult.js
        .pipe(sourcemaps.write('.', {
            sourceRoot: function (file) {
                // This override is needed because of a bug in sourcemaps base logic.
                // "file.base"" is the out dir where all the js and map files are located.
                return file.base;
            }
        }))
        .pipe(gulp.dest('./out'));
});

gulp.task('tslint', ['build'], function () {
    return gulp.src(['./src/**/*.ts', './test/**/*.ts', './test-integration/**/*.ts'])
        .pipe(tslint())
        .pipe(tslint.report('prose', { emitError: true}))
        .on('error', errorHandler);
});

gulp.task('publishbuild', ['tslint'], function () {
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
    //exclude the files we know we can't get coverage on (e.g., vscode, etc.)
    return gulp.src(['out/src/**/*.js', '!out/src/credentialstore/**'
        ,'!out/src/extension.js'
        ,'!out/src/extensionmanager.js'
        ,'!out/src/team-extension.js'
        ,'!out/src/clients/baseclient.js'
        ,'!out/src/clients/buildclient.js'
        ,'!out/src/clients/coreapiclient.js'
        ,'!out/src/clients/feedbackclient.js'
        ,'!out/src/clients/gitclient.js'
        ,'!out/src/clients/repositoryinfoclient.js'
        ,'!out/src/clients/witclient.js'
        ,'!out/src/contexts/repocontextfactory.js'
        ,'!out/src/contexts/tfvccontext.js'
        ,'!out/src/helpers/settings.js'
        ,'!out/src/helpers/vscodeutils.js'
        ,'!out/src/services/telemetry.js'
        ,'!out/src/services/coreapi.js'
        ,'!out/src/tfvc/tfvcrepository.js'
        ,'!out/src/tfvc/tfvc-extension.js'
        ,'!out/src/tfvc/tfcommandlinerunner.js'
        ,'!out/src/tfvc/tfvcoutput.js'
        ,'!out/src/tfvc/tfvcscmprovider.js'
        ,'!out/src/tfvc/tfvcsettings.js'
        ,'!out/src/tfvc/uihelper.js'
        ,'!out/src/tfvc/util.js'
        ,'!out/src/tfvc/scm/commithoverprovider.js'
        ,'!out/src/tfvc/scm/decorationprovider.js'
        ,'!out/src/tfvc/scm/model.js'
        ,'!out/src/tfvc/scm/resource.js'
        ,'!out/src/tfvc/scm/tfvccontentprovider.js'
    ])
    .pipe(istanbul({includeUntested: true}))
    //.pipe(istanbul())
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

//The following task is used by the CI build to upload code coverage files
//Added due to race condition between writeReports and ccPublisher.publish
//It's OK for this to fail if the coverage file doesn't exist
gulp.task('upload-coverage-file', function() {
    var ccPublisher = new tl.CodeCoveragePublisher();
    ccPublisher.publish('cobertura', path.join(__dirname, 'out/results/coverage/cobertura-coverage.xml'), path.join(__dirname, 'out/results/coverage'), "");
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

gulp.task('default', ['publishall']);
