/** Lets the RN bridge process frames before the next stretch of JS work. */
export function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
