export const LANGUAGES_QUERY = `
  query Languages {
    language(
      where: {
        contents_aggregate: {
          count: {
            predicate: { _gt: 0 }
            filter: {
              wa_content_metadata: {
                show_on_biel: { _eq: true }
                status: { _eq: "Primary" }
              }
              rendered_contents_aggregate: {
                count: { predicate: { _gt: 0 } }
              }
            }
          }
        }
      }
      order_by: { english_name: asc }
    ) {
      english_name
      ietf_code
      national_name
      wa_language_metadata {
        is_gateway
      }
      contents(
        where: {
          wa_content_metadata: {
            show_on_biel: { _eq: true }
            status: { _eq: "Primary" }
          }
        }
        distinct_on: resource_type
      ) {
        resource_type
        name
      }
    }
  }
`;
