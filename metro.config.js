const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.watchFolders = [];
config.resolver.blockList = [
  /\.local\/state\/.*/,
  /\.local\/skills\/.*/,
  /web\/node_modules\/.*/,
];

module.exports = config;
