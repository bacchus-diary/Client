var gulp = require('gulp'),
    gulpBabel = require('gulp-babel'),
    gulpTypings = require('gulp-typings'),
    gulpWatch = require('gulp-watch'),
    del = require('del'),
    runSequence = require('run-sequence'),
    argv = process.argv;


/**
 * Ionic hooks
 * Add ':before' or ':after' to any Ionic project command name to run the specified
 * tasks before or after the command.
 */
gulp.task('serve:before', ['watch']);
gulp.task('emulate:before', ['build']);
gulp.task('deploy:before', ['build']);
gulp.task('build:before', ['build']);

// we want to 'watch' when livereloading
var shouldWatch = argv.indexOf('-l') > -1 || argv.indexOf('--livereload') > -1;
gulp.task('run:before', [shouldWatch ? 'watch' : 'build']);

/**
 * Ionic Gulp tasks, for more information on each see
 * https://github.com/driftyco/ionic-gulp-tasks
 *
 * Using these will allow you to stay up to date if the default Ionic 2 build
 * changes, but you are of course welcome (and encouraged) to customize your
 * build however you see fit.
 */
var buildBrowserify = require('ionic-gulp-browserify-typescript');
var buildSass = require('ionic-gulp-sass-build');
var copyHTML = require('ionic-gulp-html-copy');
var copyFonts = require('ionic-gulp-fonts-copy');
var copyScripts = require('ionic-gulp-scripts-copy');

var browserify = function(done, watch){
  return function(){
    if (watch) {
      gulpWatch('app/**/*.scss', function(){ gulp.start('sass'); });
      gulpWatch('app/**/*.html', function(){ gulp.start('html'); });
    }
    buildBrowserify({
        watch: watch || false,
        outputFile: 'app.bundle.es6',
        src: [
            './app/app.ts',
            './typings/main.d.ts',
            './plugins/org.fathens.cordova.plugin.fabric.Crashlytics/www/index.d.ts'
        ],
        browserifyOptions: {
            debug: false,
            entries: [
                './app/app.ts',
                './typings/main.d.ts',
                './node_modules/babel-polyfill',
                './node_modules/reflect-metadata',
                './plugins/org.fathens.cordova.plugin.fabric.Crashlytics/www/index.d.ts'
            ],
            noParse: ['./node_modules/aws-sdk', './node_modules/reflect-metadata']
        }
    }).on('end', () => {
        gulp.src('www/build/js/app.bundle.es6')
        .pipe(gulpBabel({ presets: ['es2015', 'stage-0'] }))
        .pipe(gulp.dest('www/build/js'))
        .on('end', done);
    })
  }
}

gulp.task('watch', ['clean', 'typings'], function(done){
  runSequence(
    ['sass', 'html', 'fonts', 'scripts'],
    browserify(done, true)
  );
});

gulp.task('build', ['clean', 'typings'], function(done){
  runSequence(
    ['sass', 'html', 'fonts', 'scripts'],
    browserify(done)
  );
});
gulp.task('sass', buildSass);
gulp.task('html', copyHTML);
gulp.task('fonts', copyFonts);
gulp.task('scripts', copyScripts);
gulp.task('clean', function(){
  return del('www/build');
});
gulp.task("typings",function(){
    gulp.src("./typings.json")
        .pipe(gulpTypings()); //will install all typingsfiles in pipeline.
});
