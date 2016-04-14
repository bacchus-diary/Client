var path = require('path');


module.exports = {
  entry: [
    'babel-polyfill',
    'reflect-metadata',
    'lodash',
    'zone.js',
    path.resolve('app/app')
  ],
  output: {
    path: path.resolve('www/build/js'),
    filename: 'app.bundle.js',
    pathinfo: false // show module paths in the bundle, handy for debugging
  },
  module: {
    loaders: [
      {
        test: /\.ts$/,
        loader: 'babel-loader?presets[]=es2015,presets[]=stage-0!ts-loader',
        include: path.resolve('app'),
        exclude: /node_modules/
      },
      {
        test: /\.js$/,
        include: path.resolve('node_modules/angular2'),
        loader: 'strip-sourcemap'
      }
    ],
    noParse: [
      /aws-sdk/,
      /reflect-metadata/
    ]
  },
  resolve: {
    root: ['app'],
    alias: {
      'aws-sdk': path.resolve('node_modules/aws-sdk/dist/aws-sdk'),
      'angular2': path.resolve('node_modules/angular2')
    },
    extensions: ["", ".js", ".ts"]
  }
};
