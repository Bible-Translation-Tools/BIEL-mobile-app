import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useRef } from 'react';

/** Same rule as the offline toast: offline only when NetInfo says so, not while it is unknown. */
function isOffline(state: NetInfoState): boolean {
  return state.isConnected === false || state.isInternetReachable === false;
}

/**
 * Calls `onReconnect` each time the device goes from offline back to online, so data loaded
 * while offline (local-only lists, failed fetches) can be refreshed from the network.
 */
export function useOnReconnect(onReconnect: () => void) {
  const callbackRef = useRef(onReconnect);

  useEffect(() => {
    callbackRef.current = onReconnect;
  }, [onReconnect]);

  useEffect(() => {
    let wasOffline = false;
    return NetInfo.addEventListener((state) => {
      const offline = isOffline(state);
      if (wasOffline && !offline) {
        callbackRef.current();
      }
      wasOffline = offline;
    });
  }, []);
}
