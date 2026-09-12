/**
 * Metro config — the map analysis client imports the shared API contract
 * from ../backend/shared, so Metro must watch that folder for hot reloads.
 */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, '../backend'),
];

module.exports = config;
