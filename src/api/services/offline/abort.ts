export function abortError(): Error {
  const error = new Error('Download aborted');
  error.name = 'AbortError';
  return error;
}
