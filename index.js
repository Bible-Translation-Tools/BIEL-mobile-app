import TrackPlayer from 'react-native-track-player';

TrackPlayer.registerPlaybackService(() => require('./src/features/playback/remote-events').default);

import 'expo-router/entry';
