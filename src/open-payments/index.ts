import { Network } from "#/util/network";
import {
  createAuthenticatedClient,
  isFinalizedGrant,
  isPendingGrant,
  OpenPaymentsClientError,
  type AuthenticatedClient,
  type WalletAddress,
} from "@interledger/open-payments";
import { $ } from "bun";

export namespace OpenPayments {
  // This leaks memory, but it's fine for now. IT'S FINE!
  const clients = new Map<string, AuthenticatedClient>();

  interface Amount {
    value: string;
    assetScale: number;
    assetCode: string;
  }

  export function getClient(url: string) {
    return clients.get(url);
  }

  export async function init(
    url: string,
    privateKey: string,
    keyId: string,
  ): Promise<AuthenticatedClient> {
    const client = await createAuthenticatedClient({
      walletAddressUrl: url,
      keyId,
      privateKey: Buffer.from(privateKey, "base64"),
      validateResponses: false,
    });

    clients.set(url, client);

    return client;
  }

  export async function getWallet(client: AuthenticatedClient, url: string) {
    return await client.walletAddress.get({
      url,
    });
  }

  export async function connectWallet(
    url: string,
    keyId: string,
    privateKey: string,
  ) {
    const client = await OpenPayments.init(url, privateKey, keyId);

    const walletAddressInformation = await client.walletAddress.get({
      url: url.trim(),
    });

    const grant = await client.grant.request(
      {
        url: walletAddressInformation.authServer,
      },
      {
        access_token: {
          access: [
            {
              type: "outgoing-payment",
              actions: ["create", "read", "list", "list-all", "read-all"],
              identifier: walletAddressInformation.id,
            },
            {
              type: "incoming-payment",
              actions: [
                "create",
                "read",
                "list",
                "list-all",
                "read-all",
                "complete",
              ],
              identifier: walletAddressInformation.id,
            },
            {
              type: "quote",
              actions: ["create", "read", "read-all"],
            },
          ],
        },
        interact: {
          start: ["redirect"],
        },
      },
    );

    if (isFinalizedGrant(grant)) {
      throw new Error("Grant is already finalized");
    }

    const freqMs = grant.continue.wait ?? 3 * 1000;

    await $`open ${grant.interact.redirect}`;
    await Network.sleep(5000);

    try {
      const approvedGrant = await Network.poll(
        () =>
          continueOutgoingPaymentGrant(
            client,
            grant.continue.access_token.value,
            grant.continue.uri,
          ),
        freqMs,
      );

      if (!approvedGrant) {
        throw new Error("TODO: Unknown error");
      }

      return approvedGrant;
    } catch (err) {
      console.log(JSON.stringify(err, null, 2));
    }
  }

  async function continueOutgoingPaymentGrant(
    client: AuthenticatedClient,
    token: string,
    url: string,
  ) {
    const finalizedOutgoingPaymentGrant = await client.grant.continue({
      accessToken: token,
      url,
    });

    if (!isFinalizedGrant(finalizedOutgoingPaymentGrant)) {
      return;
    }

    return finalizedOutgoingPaymentGrant;
  }

  export async function createIncomingPaymentGrant(
    client: AuthenticatedClient,
    url: string,
    identifier: string,
  ) {
    const grant = await client.grant.request(
      {
        url,
      },
      {
        access_token: {
          access: [
            {
              type: "incoming-payment",
              actions: ["create"],
              identifier,
            },
          ],
        },
      },
    );

    if (isPendingGrant(grant)) {
      throw new Error("Received pending grant for incoming payment");
    }

    return grant;
  }

  export async function revokeGrant(
    client: AuthenticatedClient,
    url: string,
    accessToken: string,
  ) {
    await client.grant.cancel({
      url,
      accessToken,
    });
  }

  export async function createIncomingPayment(
    client: AuthenticatedClient,
    url: string,
    accessToken: string,
    walletAddress: string,
  ) {
    const expiresAt = new Date(Date.now() + 1000 * 15).toISOString();
    const incomingPayment = await client.incomingPayment.create(
      {
        url,
        accessToken,
      },
      {
        walletAddress,
        expiresAt,
      },
    );

    return incomingPayment;
  }

  export async function createOutgoingPayment(
    client: AuthenticatedClient,
    senderWalletInfo: WalletAddress,
    incomingPayment: string,
    amount: string | number,
    accessToken: string,
  ) {
    const debitAmount = {
      assetCode: senderWalletInfo.assetCode,
      assetScale: senderWalletInfo.assetScale,
    } as Amount;

    // Oookaaay
    if (typeof amount === "string") {
      debitAmount.value = (
        Number(amount) *
        10 ** senderWalletInfo.assetScale
      ).toString();
    } else {
      debitAmount.value = (
        amount *
        10 ** senderWalletInfo.assetScale
      ).toString();
    }

    await client.outgoingPayment.create(
      {
        url: senderWalletInfo.resourceServer,
        accessToken,
      },
      {
        walletAddress: senderWalletInfo.id,
        incomingPayment: incomingPayment,
        debitAmount: {
          value: (
            Number(amount) *
            10 ** senderWalletInfo.assetScale
          ).toString(),
          assetScale: senderWalletInfo.assetScale,
          assetCode: senderWalletInfo.assetCode,
        },
      },
    );
  }

  export async function rotateToken(
    client: AuthenticatedClient,
    accessToken: string,
    url: string,
  ) {
    return await client.token.rotate({
      url,
      accessToken,
    });
  }

  export async function listOutgoingPayments(
    client: AuthenticatedClient,
    url: string,
    walletAddress: string,
    accessToken: string,
  ) {
    return await client.outgoingPayment.list({
      walletAddress: walletAddress,
      url: url,
      accessToken,
    });
  }

  function isOpenPaymentsClientError(error: unknown) {
    return error instanceof OpenPaymentsClientError;
  }
  export function isTokenInvalidError(error: OpenPaymentsClientError) {
    return error.status === 401 && error.description === "Invalid Token";
  }
  export function isTokenInactiveError(error: OpenPaymentsClientError) {
    return error.status === 403 && error.description === "Inactive Token";
  }
  export function isTokenExpiredError(
    error: unknown,
  ): error is OpenPaymentsClientError {
    if (!isOpenPaymentsClientError(error)) return false;
    return isTokenInvalidError(error) || isTokenInactiveError(error);
  }
}
