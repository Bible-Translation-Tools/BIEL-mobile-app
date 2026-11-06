import { registerPlaybackEngineService } from './src/services/playback-engine';

registerPlaybackEngineService(() => require('./src/features/playback/session').handleQueueEnded);

import 'expo-router/entry';
