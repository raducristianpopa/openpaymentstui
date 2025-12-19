export namespace Models {
  export interface WalletAddress {
    id: string;
    url: string;
    keyId: string;
    privateKey: string;
    publicKey: string;
    token: string;
    manageUrl: string;
    continueToken: string;
    continueUri: string;
    createdAt: number;
    updatedAt: number;
  }

  export type InsertableWalletAddress = Omit<
    WalletAddress,
    "id" | "createdAt" | "updatedAt"
  > & {
    id?: string;
  };

  export interface Flow {
    id: string;
    name: string;
    steps: string;
  }
}
