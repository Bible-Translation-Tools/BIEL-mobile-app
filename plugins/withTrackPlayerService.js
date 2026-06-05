const { withAndroidManifest } = require('@expo/config-plugins');

const TRACK_PLAYER_SERVICE = 'com.doublesymmetry.trackplayer.service.MusicService';

/**
 * Ensures TrackPlayer's foreground service declares mediaPlayback type (Android 14+).
 */
function withTrackPlayerService(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (!application) return config;

    if (!application.service) {
      application.service = [];
    }

    const services = application.service;
    const existing = services.find((entry) => entry.$?.['android:name'] === TRACK_PLAYER_SERVICE);

    if (existing) {
      existing.$['android:foregroundServiceType'] = 'mediaPlayback';
      existing.$['tools:replace'] = 'android:foregroundServiceType';
      delete existing.$['android:exported'];
    } else {
      services.push({
        $: {
          'android:name': TRACK_PLAYER_SERVICE,
          'android:foregroundServiceType': 'mediaPlayback',
          'tools:replace': 'android:foregroundServiceType',
        },
      });
    }

    return config;
  });
}

module.exports = withTrackPlayerService;
