const { withAppBuildGradle } = require('expo/config-plugins');

const CMAKE_VERSION = '4.1.2';
const MARKER = '// withWindowsCmakeVersion';

/**
 * Pins the app module's CMake to a version whose bundled ninja (>= 1.12) supports
 * Windows long paths. With the default CMake 3.22.1 (ninja 1.10), codegen object
 * paths such as react-native-gesture-handler's shared/shadowNodes sources exceed
 * 260 characters and the :app:buildCMake* task fails. Applied on Windows only, so
 * EAS and macOS/Linux builds keep AGP's default CMake.
 */
function withWindowsCmakeVersion(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes(MARKER)) return config;

    config.modResults.contents += `
${MARKER}
if (System.getProperty('os.name').toLowerCase().contains('windows')) {
    android.externalNativeBuild.cmake.version = '${CMAKE_VERSION}'
}
`;
    return config;
  });
}

module.exports = withWindowsCmakeVersion;
