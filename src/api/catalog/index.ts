import type { BielCatalogApi } from '@/api/catalog/types';
import { createGraphqlCatalogApi } from '@/api/graphql/catalog-api';

export type { BielCatalogApi } from '@/api/catalog/types';

/**
 * Default remote catalog client. Swap the factory here (or inject in tests)
 * when moving off GraphQL.
 */
export const catalogApi: BielCatalogApi = createGraphqlCatalogApi();
