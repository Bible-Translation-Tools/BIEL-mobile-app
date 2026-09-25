import { createGraphqlCatalogApi } from '@/api/graphql/catalog-api';
import type { BielCatalogApi } from '@/api/catalog/types';

export type { BielCatalogApi, ChapterAudioFileType } from '@/api/catalog/types';

/**
 * Default remote catalog client. Swap the factory here (or inject in tests)
 * when moving off GraphQL.
 */
export const catalogApi: BielCatalogApi = createGraphqlCatalogApi();
