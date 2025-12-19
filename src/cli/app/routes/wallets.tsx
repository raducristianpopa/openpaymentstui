import { useKeyboard } from "@opentui/solid";
import { createEffect, createSignal, For, Match, Show, Switch } from "solid-js";
import { DialogWalletAddress } from "../components/dialog-wallet-address";
import { Keybinds } from "../components/keybinds";
import { useAppState } from "../context/app-state";
import type { SelectRenderable } from "@opentui/core";
import type { Models } from "#/database/models";
import type { OutgoingPayment } from "@interledger/open-payments";
import { SDK } from "#/sdk";

export function Wallets() {
  const [wallet, setWallet] = createSignal<Models.WalletAddress | undefined>();
  const [txs, setTxs] = createSignal<Array<OutgoingPayment>>([]);
  const [showWalletAddressDialog, setShowWalletAddressDialog] =
    createSignal(false);
  const appState = useAppState();
  let selectRef: SelectRenderable | null = null;

  createEffect(async () => {
    if (wallet()) {
      const latest = await SDK.getLatestPayments(wallet()!);
      setTxs(latest);
    }
  });

  useKeyboard((e) => {
    if (e.name === "tab" && !showWalletAddressDialog()) {
      setShowWalletAddressDialog(true);
    }
    if (e.name === "escape" && showWalletAddressDialog()) {
      setShowWalletAddressDialog(false);
      selectRef?.focus();
    }
    if (e.name === "escape" && wallet()) {
      setWallet();
      setTxs([]);
      selectRef?.focus();
    }
  });

  return (
    <>
      <Show when={showWalletAddressDialog()}>
        <DialogWalletAddress
          close={() => {
            setShowWalletAddressDialog(false);
            selectRef?.focus();
          }}
        />
      </Show>
      <Switch>
        <Match when={wallet() && txs()}>
          <scrollbox height="90%" flexDirection="row" border>
            <For each={txs()}>
              {(tx) => (
                <box
                  style={{
                    width: "100%",
                    padding: 1,
                    marginBottom: 1,
                  }}
                >
                  <text>Receiver: {tx.receiver}</text>
                  <text>
                    Amount:{" "}
                    {Number(tx.sentAmount.value) /
                      10 ** tx.sentAmount.assetScale}{" "}
                    {tx.sentAmount.assetCode}
                  </text>
                  <text>Date: {new Date(tx.createdAt).toLocaleString()}</text>
                </box>
              )}
            </For>
          </scrollbox>
        </Match>
        <Match when={!wallet()}>
          <Show
            when={appState.store.wallets.length > 0}
            fallback={<text alignSelf="center">No connected wallets</text>}
          >
            <select
              focused
              ref={(r) => (selectRef = r)}
              onSelect={(_, option) => setWallet(option?.value)}
              options={appState.store.wallets.map((w) => ({
                name: w.url,
                description:
                  "Added at: " + new Date(w.createdAt).toLocaleString(),
                value: w,
              }))}
              style={{
                height: "90%",
                backgroundColor: "transparent",
                focusedBackgroundColor: "transparent",
                selectedBackgroundColor: "#333333",
                selectedTextColor: "#FFFFFF",
              }}
              showScrollIndicator
              wrapSelection
              fastScrollStep={5}
            />
          </Show>
        </Match>
      </Switch>
      <Keybinds text="[tab] add wallet address | [enter] show transactions" />
    </>
  );
}
