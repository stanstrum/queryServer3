var webpack = require("webpack");

const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");

const debug = process.env.NODE_ENV !== "production";

module.exports = {
  entry: "./src/index.js",
  target: "node",
  mode: process.env.NODE_ENV || "none",
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
    minimize: !debug,
    minimizer: [
      (compiler) => {
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            format: { comments: false },
            compress: { drop_console: true }
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
  ]
};
