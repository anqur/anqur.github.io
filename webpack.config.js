const path = require('path')
const webpack = require('webpack')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const autoprefixer = require('autoprefixer')
const ENV = process.env.NODE_ENV || 'development'
const IS_DEV = ENV === 'development'

module.exports = {
  context: __dirname,
  devtool: IS_DEV ? 'source-map' : false,
  entry: './index.js',
  output: {
    path: path.join(__dirname, 'dist'),
    publicPath: 'dist',
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'source-map-loader'
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            {
              loader: 'css-loader',
              options: {
                sourceMap: IS_DEV,
                importLoaders: 1,
                minimize: true
              }
            },
            {
              loader: 'postcss-loader',
              options: {
                sourceMap: IS_DEV,
                plugins: () => {
                  autoprefixer({ browsers: ['last 2 versions'] })
                }
              }
            }
          ]
        })
      }
    ]
  },
  plugins: [
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(ENV)
    }),
    new ExtractTextPlugin({
      filename: 'style.css',
      allChunks: true,
      disable: IS_DEV
    }),
    new webpack.ContextReplacementPlugin(
      /highlight\.js\/lib\/languages$/,
      new RegExp(`^./(${[
        'javascript', 'python', 'bash', 'cpp', 'java', 'go', 'clojure', 'scala'
      ].join('|')})$`)
    )
  ].concat(IS_DEV ? [] : [
    new webpack.optimize.UglifyJsPlugin({
      output: { comments: false },
      compress: true
    })
  ])
}
