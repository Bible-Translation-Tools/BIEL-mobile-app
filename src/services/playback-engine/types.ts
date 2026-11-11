/** Engine-neutral playback types. Nothing here may mention the underlying player library. */

export type PlaybackTrack = {
  id: string;
  url: string;
  title: string;
  artist: string;
};

export type NowPlayingMetadata = {
  title: string;
  artist: string;
};

/** Coarse player status: the only distinctions the playback session relies on. */
export type PlaybackStatus = 'playing' | 'ended' | 'other';

export type PlaybackProgress = {
  position: number;
  duration: number;
};
