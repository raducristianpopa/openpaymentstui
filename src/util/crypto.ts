import { Identifier } from "./identifier";

export namespace Crypto {
  export async function generateKeyPair() {
    const kp = (await crypto.subtle.generateKey(
      {
        name: "Ed25519",
      },
      true,
      ["sign", "verify"],
    )) as unknown as { publicKey: CryptoKey; privateKey: CryptoKey };

    const keyId = Identifier.create("optuikid");
    const publicKey = await exportPublicKey(kp.publicKey, keyId);
    const privateKey = await exportPrivateKey(kp.privateKey);

    return { publicKey, privateKey, keyId };
  }

  function ab2str(buffer: ArrayBuffer) {
    return String.fromCharCode.apply(null, Array.from(new Uint8Array(buffer)));
  }

  async function exportPrivateKey(key: CryptoKey) {
    const exported = await crypto.subtle.exportKey("pkcs8", key);
    const exportedAsString = ab2str(exported);
    const exportedAsBase64 = btoa(exportedAsString);
    const pem = `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64}\n-----END PRIVATE KEY-----`;
    return btoa(pem);
  }

  async function exportPublicKey(key: CryptoKey, keyId: string) {
    const exported = await crypto.subtle.exportKey("jwk", key);
    delete exported.key_ops;
    delete exported.ext;
    Object.assign(exported, { kid: keyId });
    return btoa(JSON.stringify(exported));
  }
}
