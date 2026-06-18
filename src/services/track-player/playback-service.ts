import TrackPlayer, { Event } from 'react-native-track-player';

import { handleQueueEnded } from './chapter-playback';

async function playbackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    void TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    void TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    void TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
    void handleQueueEnded();
  });
}

export default playbackService;
