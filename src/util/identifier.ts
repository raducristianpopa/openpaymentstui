export namespace Identifier {
  const EPOCH = 1704067200;
  const BASE58_ALPHABET =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

  type Prefix = "optuikid" | "wal" | "flow";

  function encode(bytes: Uint8Array): string {
    if (bytes.length === 0) {
      return "";
    }

    let zeros = 0;
    while (zeros < bytes.length && bytes[zeros] === 0) zeros++;

    const input = bytes.slice(zeros);
    const encoded = new Array<number>();

    let start = zeros;
    while (start < input.length) {
      let remainder = 0;
      for (let i = start; i < input.length; i++) {
        const b = input[i] ?? 0;
        const value = (remainder << 8) | b;
        input[i] = Math.floor(value / 58);
        remainder = value % 58;
      }
      encoded.push(remainder);
      while (start < input.length && input[start] === 0) start++;
    }

    let out = "1".repeat(zeros);
    for (const idx of encoded.slice().reverse()) {
      out += BASE58_ALPHABET.charAt(idx);
    }
    return out;
  }

  export function create(prefix: Prefix, ...byteSize: number[]): string {
    const bytes = (byteSize[0] ?? 12) | 0;
    if (bytes <= 0) throw new Error("byteSize must be > 0");

    const buf = new Uint8Array(bytes);

    crypto.getRandomValues(buf);

    if (bytes > 4) {
      const t = Math.floor(Date.now() / 1000) - EPOCH;

      const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
      view.setUint32(0, t >>> 0, false);
    }

    const encoded = encode(buf);
    return prefix ? `${prefix}_${encoded}` : encoded;
  }
}
