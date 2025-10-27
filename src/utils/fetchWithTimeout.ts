/**
 * Utility for fetching data with independent timeout handling
 */

export async function fetchWithTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number = 10000,
  fallbackValue: T
): Promise<T> {
  const timeoutPromise = new Promise<T>((resolve) =>
    setTimeout(() => {
      console.warn('[fetchWithTimeout] Query timeout, using fallback');
      resolve(fallbackValue);
    }, timeoutMs)
  );
  
  try {
    return await Promise.race([queryFn(), timeoutPromise]);
  } catch (error) {
    console.error('[fetchWithTimeout] Query failed:', error);
    return fallbackValue;
  }
}
