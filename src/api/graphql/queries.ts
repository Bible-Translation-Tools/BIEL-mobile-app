export const BOOK_CONTENT_QUERY = `
  query BookContent($languageCode: String!, $bookSlug: String!) {
    scriptural_rendering_metadata(
      where: {
        book_slug: { _eq: $bookSlug }
        is_whole_book: { _eq: true }
        rendered_content: {
          content: {
            language: { ietf_code: { _eq: $languageCode } }
            wa_content_metadata: {
              show_on_biel: { _eq: true }
              status: { _eq: "Primary" }
            }
          }
          file_type: { _eq: "json" }
        }
      }
    ) {
      book_name
      book_slug
      rendered_content {
        url
        content {
          name
          resource_type
        }
        file_size_bytes
      }
    }
  }
`;

export const CHAPTER_AUDIO_FILE_QUERY = `
  query ChapterAudioFile($languageCode: String!, $bookSlug: String!, $chapter: Int!, $fileType: String!) {
    content(
      where: {
        type: { _eq: "audio" }
        language: { ietf_code: { _eq: $languageCode } }
      }
    ) {
      rendered_contents(
        where: {
          scriptural_rendering_metadata: {
            book_slug: { _eq: $bookSlug }
            chapter: { _eq: $chapter }
            is_whole_book: { _eq: false }
          }
          file_type: { _eq: $fileType }
        }
      ) {
        url
        file_type
        file_size_bytes
      }
    }
  }
`;

export const CHAPTER_CONTENT_QUERY = `
  query ChapterContent($languageCode: String!, $bookSlug: String!, $chapter: Int!) {
    scriptural_rendering_metadata(
      where: {
        book_slug: { _eq: $bookSlug }
        chapter: { _eq: $chapter }
        is_whole_book: { _eq: false }
        rendered_content: {
          content: {
            language: { ietf_code: { _eq: $languageCode } }
            wa_content_metadata: {
              show_on_biel: { _eq: true }
              status: { _eq: "Primary" }
            }
          }
        }
      }
    ) {
      book_name
      chapter
      rendered_content {
        url
        content {
          name
          resource_type
        }
      }
    }
  }
`;

export const CHAPTERS_FOR_BOOK_QUERY = `
  query ChaptersForBook($languageCode: String!, $bookSlug: String!) {
    scriptural_rendering_metadata(
      where: {
        book_slug: { _eq: $bookSlug }
        is_whole_book: { _eq: false }
        chapter: { _is_null: false }
        rendered_content: {
          content: {
            language: { ietf_code: { _eq: $languageCode } }
            wa_content_metadata: {
              show_on_biel: { _eq: true }
              status: { _eq: "Primary" }
            }
          }
        }
      }
      order_by: [{ chapter: asc }]
    ) {
      chapter
    }
  }
`;

export const BOOKS_FOR_LANGUAGE_QUERY = `
  query BooksForLanguage($languageCode: String!) {
    scriptural_rendering_metadata(
      where: {
        is_whole_book: { _eq: true }
        rendered_content: {
          content: {
            language: { ietf_code: { _eq: $languageCode } }
            wa_content_metadata: {
              show_on_biel: { _eq: true }
              status: { _eq: "Primary" }
            }
          }
        }
      }
      distinct_on: book_slug
      order_by: [{ book_slug: asc }]
    ) {
      book_name
      book_slug
    }
  }
`;

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
