const path = require('path')
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, '../dist/umd'),
    filename: 'index.js',
    libraryTarget: 'umd',
    globalObject: 'this',
  },
  experiments: {
    asyncWebAssembly: true
  },
  module: {
    rules: [
      {
        test: /\.ts(x*)?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
                configFile: 'config/tsconfig.umd.json',
              },
            },
      }
	]
  },
  resolve: {
	  fallback: {
		  "fs": false,
		  "path": require.resolve('path-browserify'),
      "constants": require.resolve('constants-browserify'),
      "buffer": require.resolve('buffer/'),
      "util": require.resolve('util/'),
      "stream": require.resolve("stream-browserify")
	  },
	  extensions: ['.wasm', '.ts', '.js'],
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: "process/browser",
      Buffer: ["buffer", "Buffer"],
    }),
  ],
};