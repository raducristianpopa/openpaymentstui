export namespace Network {
  export async function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  export async function poll<T>(
    fn: () => Promise<T>,
    intervalMs = 500,
    timeoutMs = 10000,
    condition: (result: T) => boolean = (response: T) => !!response,
  ): Promise<T> {
    const start = Date.now();

    while (true) {
      const result = await fn();

      if (condition(result)) {
        return result;
      }

      if (Date.now() - start > timeoutMs) {
        throw new Error("Polling timed out");
      }

      await sleep(intervalMs);
    }
  }
}
