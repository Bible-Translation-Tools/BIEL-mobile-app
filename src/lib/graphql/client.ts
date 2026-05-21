const GRAPHQL_ENDPOINT = 'https://api.bibleineverylanguage.org/v1/graphql';
const USER_AGENT = 'Mozilla/5.0';

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  const json = (await response.json()) as GraphQLResponse<T>;

  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? 'GraphQL request failed');
  }

  if (!json.data) {
    throw new Error('No data returned from API');
  }

  return json.data;
}
