import TrackPlayer from 'react-native-track-player';

TrackPlayer.registerPlaybackService(() => require('./src/services/track-player/playback-service').default);

import 'expo-router/entry';
