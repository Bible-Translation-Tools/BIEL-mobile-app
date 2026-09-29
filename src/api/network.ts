const NETWORK_UNAVAILABLE_MESSAGE = 'Network request failed';

let networkBlocked = false;

/** Blocks or unblocks remote calls. Set by whatever decides the app is offline. */
export function setNetworkBlocked(blocked: boolean) {
  networkBlocked = blocked;
}

export function isNetworkBlocked() {
  return networkBlocked;
}

/** Throws when remote calls are blocked. */
export function assertNetworkAvailable() {
  if (networkBlocked) {
    throw new Error(NETWORK_UNAVAILABLE_MESSAGE);
  }
}
