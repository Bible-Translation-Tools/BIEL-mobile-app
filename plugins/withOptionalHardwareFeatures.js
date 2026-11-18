const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Hardware features Android infers as *required* from other manifest entries,
 * which Google Play then uses to hide the app from devices that lack them:
 *
 * - android.hardware.screen.portrait: implied by screenOrientation="portrait"
 *   (app.json "orientation"). Desktop, Android XR and some tablets don't report it.
 * - android.hardware.wifi: implied by ACCESS_WIFI_STATE, which
 *   @react-native-community/netinfo adds. The app works on any network.
 *
 * Declaring them explicitly with required="false" keeps the behaviour and lets
 * Play offer the app on those devices.
 */
const OPTIONAL_FEATURES = ['android.hardware.screen.portrait', 'android.hardware.wifi'];

function withOptionalHardwareFeatures(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest['uses-feature']) {
      manifest['uses-feature'] = [];
    }
    const features = manifest['uses-feature'];

    for (const name of OPTIONAL_FEATURES) {
      const existing = features.find((entry) => entry.$?.['android:name'] === name);
      if (existing) {
        existing.$['android:required'] = 'false';
      } else {
        features.push({ $: { 'android:name': name, 'android:required': 'false' } });
      }
    }

    return config;
  });
}

module.exports = withOptionalHardwareFeatures;
