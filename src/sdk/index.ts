import { Query } from "#/database/query";
import { OpenPayments } from "#/open-payments";
import { Mutation } from "#/database/mutation";
import type { Models } from "#/database/models";
import type { OutgoingPayment } from "@interledger/open-payments";

// TODO: This should be a proper SDK. Ideally, it should be generated from a schema,
// but for now, it is calling database directly.
// I am thinking about having the OpenPaymentsTUI client and the OpenPaymentsTUI local server.

export namespace SDK {
  export async function getWallets() {
    return await Query.getWallets();
  }

  export async function connectWallet(
    url: string,
    keyId: string,
    privateKey: string,
  ) {
    return await OpenPayments.connectWallet(url, keyId, privateKey);
  }

  export async function send(url: string, amount: string, receiver: string) {
    let wallet = await Query.getWallet(url);
    let client = OpenPayments.getClient(url);

    if (!client) {
      client = await OpenPayments.init(
        wallet.url,
        wallet.privateKey,
        wallet.keyId,
      );
    }

    const receiverWalletInfo = await OpenPayments.getWallet(client, receiver);
    const senderWalletInfo = await OpenPayments.getWallet(client, wallet.url);
    const incomingPaymentGrant = await OpenPayments.createIncomingPaymentGrant(
      client,
      receiverWalletInfo.authServer,
      receiverWalletInfo.id,
    );
    const incomingPayment = await OpenPayments.createIncomingPayment(
      client,
      receiverWalletInfo.resourceServer,
      incomingPaymentGrant.access_token.value,
      receiverWalletInfo.id,
    );

    let accessToken = wallet.token;
    while (true) {
      try {
        await OpenPayments.createOutgoingPayment(
          client,
          senderWalletInfo,
          incomingPayment.id,
          amount,
          accessToken,
        );
        break;
      } catch (err) {
        if (OpenPayments.isTokenExpiredError(err)) {
          const rotated = await OpenPayments.rotateToken(
            client,
            accessToken,
            wallet.manageUrl,
          );
          await Mutation.updateToken(
            wallet.url,
            accessToken,
            rotated.access_token.manage,
          );
          accessToken = rotated.access_token.value;
        }
      }
    }
  }

  export async function getFlows() {
    return await Query.getFlows();
  }

  export async function createFlow(id: string, name: string, steps: string) {
    return await Mutation.createFlow(id, name, steps);
  }

  export async function getLatestPayments(wallet: Models.WalletAddress) {
    let client = OpenPayments.getClient(wallet.url);

    if (!client) {
      client = await OpenPayments.init(
        wallet.url,
        wallet.privateKey,
        wallet.keyId,
      );
    }

    const walletInfo = await OpenPayments.getWallet(client, wallet.url);

    let accessToken = wallet.token;
    let outgoingPayments: Array<OutgoingPayment> = [];

    while (true) {
      try {
        const result = await OpenPayments.listOutgoingPayments(
          client,
          walletInfo.resourceServer,
          walletInfo.id,
          accessToken,
        );
        outgoingPayments = result.result;
        break;
      } catch (err) {
        if (OpenPayments.isTokenExpiredError(err)) {
          const rotated = await OpenPayments.rotateToken(
            client,
            accessToken,
            wallet.manageUrl,
          );
          await Mutation.updateToken(
            wallet.url,
            accessToken,
            rotated.access_token.manage,
          );
          accessToken = rotated.access_token.value;
          wallet.token = rotated.access_token.value;
          wallet.manageUrl = rotated.access_token.manage;
        }
      }
    }
    return outgoingPayments;
  }
}
