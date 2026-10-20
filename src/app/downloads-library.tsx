import { DownloadsLibraryView } from '@/components/download/downloads-library-view';
import { useBackToHomeWithoutHistory } from '@/hooks/use-back-to-home-without-history';

export default function DownloadsLibraryScreen() {
  useBackToHomeWithoutHistory();

  return <DownloadsLibraryView />;
}
