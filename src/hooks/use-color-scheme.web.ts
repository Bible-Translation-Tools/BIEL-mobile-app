import { useEffect, useState } from 'react';

import { useAppearance } from '@/contexts/appearance-context';

/**
 * To support static rendering, defer to the resolved appearance until the client hydrates.
 */
export function useColorScheme() {
  const { colorScheme } = useAppearance();
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
