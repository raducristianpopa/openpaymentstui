import { Database } from "#/database/sql";
import { Identifier } from "#/util/identifier";
import type { Models } from "./models";

export namespace Mutation {
  export async function storeWallet(
    resource: Models.InsertableWalletAddress,
  ): Promise<Models.WalletAddress> {
    resource.id ??= Identifier.create("wal");
    const [wallet] = await Database.sql<Array<Models.WalletAddress>>`
      INSERT INTO wallet_address (id, url, keyId, privateKey, publicKey,token, manageUrl, continueToken, continueUri, createdAt, updatedAt)
      VALUES (${resource.id}, ${resource.url}, ${resource.keyId}, ${resource.privateKey}, ${resource.publicKey}, ${resource.token}, ${resource.manageUrl}, ${resource.continueToken}, ${resource.continueUri}, ${Date.now()}, ${Date.now()})
      RETURNING *;
    `;

    if (!wallet) {
      throw new Error("could not store wallet address");
    }

    return wallet;
  }

  export async function updateToken(
    url: string,
    token: string,
    manageUrl: string,
  ): Promise<void> {
    await Database.sql`
      UPDATE wallet_address SET token = ${token}, manageUrl = ${manageUrl}, updatedAt = ${Date.now()} WHERE url = ${url};
    `;
  }

  export async function createFlow(
    id: string,
    name: string,
    steps: string,
  ): Promise<void> {
    await Database.sql`
      INSERT INTO flow (id, name, steps) VALUES (${id}, ${name}, ${steps});
    `;
  }
}
