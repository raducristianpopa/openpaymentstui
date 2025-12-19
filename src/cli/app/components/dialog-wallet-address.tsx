import { Dialog } from "../ui/dialog";
import { createStore } from "solid-js/store";
import { batch, onCleanup, onMount, Show } from "solid-js";
import { useAppState } from "../context/app-state";
import { Crypto } from "#/util/crypto";
import { TextAttributes, type InputRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/solid";
import { Clipboard } from "#/util/clipboard";
import { Keybinds } from "./keybinds";
import { SDK } from "#/sdk";
import { Mutation } from "#/database/mutation";
import type { Models } from "#/database/models";
import { Identifier } from "#/util/identifier";

const defaultKeys = () => ({
  publicKey: "",
  privateKey: "",
  keyId: "",
});

interface DialogWalletAddressProps {
  close: () => void;
}

export function DialogWalletAddress({ close }: DialogWalletAddressProps) {
  const [store, setStore] = createStore<{
    walletAddress: string;
    keys: {
      publicKey: string;
      privateKey: string;
      keyId: string;
    };
  }>({
    walletAddress: "https://ilp.interledger-test.dev/uct-test-usd",
    keys: defaultKeys(),
  });

  const appState = useAppState();
  let inputRef: InputRenderable | null = null;

  onMount(() => {
    appState.set("typing", true);
    inputRef?.focus();
  });

  onCleanup(() => {
    appState.set("typing", false);
  });

  useKeyboard(async (e) => {
    if (
      appState.store.typing &&
      store.walletAddress != "" &&
      store.keys.publicKey != ""
    ) {
      if (e.name === "c") {
        Clipboard.copy(store.keys.publicKey);
      }
      if (e.name === "e") {
        inputRef?.focus();
        batch(() => {
          appState.set("typing", true);
          setStore("keys", defaultKeys());
        });
      }
      if (e.name === "r") {
        const keys = await Crypto.generateKeyPair();
        batch(() => {
          setStore("keys", keys);
        });
      }
      if (e.name === "return") {
        const grant = await SDK.connectWallet(
          store.walletAddress,
          store.keys.keyId,
          store.keys.privateKey,
        );

        const resource: Models.InsertableWalletAddress = {
          id: Identifier.create("wal"),
          url: store.walletAddress,
          keyId: store.keys.keyId,
          privateKey: store.keys.privateKey,
          publicKey: store.keys.publicKey,
          token: grant?.access_token.value!,
          manageUrl: grant?.access_token.manage!,
          continueToken: grant?.continue.access_token.value!,
          continueUri: grant?.continue.uri!,
        };

        const wallet = await Mutation.storeWallet(resource);
        appState.addWallet(wallet);
        close();
      }
    }
  });

  async function onWalletAddressSubmit(value: string) {
    const keys = await Crypto.generateKeyPair();
    batch(() => {
      setStore("walletAddress", value);
      setStore("keys", keys);
    });

    inputRef?.blur();
  }

  return (
    <Dialog title="add wallet address">
      <box height={3} border title="url">
        <input
          ref={(r) => (inputRef = r)}
          height={1}
          focused
          value={store.walletAddress}
          onSubmit={onWalletAddressSubmit}
        />
      </box>

      <Show when={store.walletAddress != "" && store.keys.publicKey != ""}>
        <text marginTop={1} alignSelf="center">
          add this public key to your specified wallet address
        </text>
        <box marginTop={1} border title="public key">
          <text attributes={TextAttributes.DIM}>{store.keys.publicKey}</text>
        </box>
        <Keybinds text="[c] copy | [r] regenerate | [e] edit wallet address" />
        <Keybinds text="[enter] connect wallet address" />
      </Show>
    </Dialog>
  );
}
