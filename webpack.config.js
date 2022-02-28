var webpack = require("webpack");``

const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");

const PROD = !!JSON.parse(process.env.PROD || '0');

module.exports = {
  entry: "./src/index.js",
  target: "node",
  mode: "development",
  devtool: false,
  output: {
    enabledLibraryTypes: ["umd"],
    library: "queryServer.js",
    libraryTarget: "umd",
    filename: "queryServer.js",
    auxiliaryComment: "queryServer.js for Doze42",
    path: path.resolve(__dirname, "dist")
  },
  resolve: {
    alias: {
      "@static": path.resolve(__dirname, "src", "static"),
      "@lib": path.resolve(__dirname, "src", "lib")
    }
  },
  optimization: {
    minimize: PROD,
    minimizer: [
      (compiler) => {
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            format: { comments: false }
          },
          extractComments: false
        }).apply(compiler)
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": {
        WEBPACK: 1
      }
    })
  ],
  stats: "verbose"
};
