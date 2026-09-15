import { isForceOffline } from '@/stores/force-offline-store';

const NETWORK_UNAVAILABLE_MESSAGE = 'Network request failed';

/** Throws when force-offline (or later, real offline detection) blocks remote calls. */
export function assertNetworkAvailable() {
  if (isForceOffline()) {
    throw new Error(NETWORK_UNAVAILABLE_MESSAGE);
  }
}
