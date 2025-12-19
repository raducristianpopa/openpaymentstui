import { Database } from "#/database/sql";
import type { Models } from "#/database/models";

export namespace Query {
  export async function getWallet(url: string): Promise<Models.WalletAddress> {
    const [wallet] = await Database.sql<Array<Readonly<Models.WalletAddress>>>`
      SELECT * FROM wallet_address WHERE url = ${url};
    `;

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    return wallet;
  }

  export async function getWallets(): Promise<Array<Models.WalletAddress>> {
    return await Database.sql<Array<Readonly<Models.WalletAddress>>>`
      SELECT * FROM wallet_address;
    `;
  }

  export async function getFlows(): Promise<Array<Models.Flow>> {
    return await Database.sql<Array<Models.Flow>>`
      SELECT * FROM flow;
    `;
  }
}
