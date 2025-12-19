import { createEffect, createSignal, Match, Show, Switch } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import {
  InputRenderable,
  TabSelectRenderable,
  type SelectRenderable,
} from "@opentui/core";
import type { Models } from "#/database/models";
import { createStore } from "solid-js/store";
import { useAppState } from "../context/app-state";
import { SDK } from "#/sdk";
import { useToast } from "../ui/toast";

const tabs = [{ title: "Send" }, { title: "Request" }];
const inputs = [{ label: "amount" }, { label: "receiver" }];

export function Payments() {
  const [wallet, setWallet] = createSignal<Models.WalletAddress | undefined>();
  const [activeTab, setActiveTab] = createSignal(0);
  const toast = useToast();
  const appState = useAppState();
  const [store, setStore] = createStore({
    selected: 0,
  });
  let amountRef: InputRenderable | null = null;
  let receiverRef: InputRenderable | null = null;
  let tabSelectRef: TabSelectRenderable | null = null;

  createEffect(() => {
    if (wallet()) {
      appState.set("typing", true);
    } else {
      appState.set("typing", false);
    }
  });

  let fromRef: SelectRenderable | null = null;

  function move() {
    let next = store.selected + 1;
    if (next < 0) next = inputs.length - 1;
    if (next >= inputs.length) next = 0;
    setStore("selected", next);
  }

  async function handleSubmit() {
    const amount = amountRef!.value;
    const receiver = receiverRef!.value;

    try {
      await SDK.send(wallet()!.url, amount, receiver);
      toast.show({
        title: "Success",
        message: "Payment sent",
        variant: "success",
        duration: 3000,
      });
      setWallet();
      fromRef?.focus();
    } catch (err) {
      console.log(JSON.stringify(err, null, 2));
      toast.show({
        title: "Error",
        message: "Could not send payment",
        variant: "error",
        duration: 3000,
      });
    }
  }

  useKeyboard((e) => {
    if (wallet()) {
      if (e.name === "tab") {
        move();
      }
      if (e.name === "escape") {
        tabSelectRef?.focus();
        setWallet(undefined);
      }
    }
  });

  return (
    <box style={{ flexDirection: "column" }}>
      <tab_select
        ref={(r) => (tabSelectRef = r)}
        height={2}
        width={40}
        alignSelf="center"
        selectedTextColor="#FFFFFF"
        textColor="#333333"
        options={tabs.map((tab, index) => ({
          name: tab.title,
          value: index,
          description: "",
        }))}
        showDescription={false}
        onSelect={(index) => {
          if (index === 0) fromRef?.focus();
        }}
        onChange={(index) => {
          setActiveTab(index);
        }}
        focused
      />
      <Switch>
        <Match when={activeTab() === 0}>
          <Show
            when={appState.store.wallets.length > 0}
            fallback={
              <text alignSelf="center" marginTop={1}>
                No connected wallets
              </text>
            }
          >
            <box alignItems="center" justifyContent="center" marginTop={1}>
              <Switch
                fallback={
                  <box width={86} border title="from">
                    <select
                      showScrollIndicator
                      ref={(r) => (fromRef = r)}
                      selectedIndex={undefined}
                      onSelect={(_, option) => setWallet(option?.value)}
                      options={appState.store.wallets.map((w) => ({
                        name: w.url,
                        description: "",
                        value: w,
                      }))}
                      showDescription={false}
                      style={{
                        height: appState.store.wallets.length,
                        maxHeight: 12,
                        backgroundColor: "transparent",
                        focusedBackgroundColor: "transparent",
                        selectedBackgroundColor: "#333333",
                        selectedTextColor: "#FFFFFF",
                      }}
                      fastScrollStep={5}
                    />
                  </box>
                }
              >
                <Match when={wallet()}>
                  <box width={86}>
                    <box border title="sending from">
                      <text>{wallet()?.url}</text>
                    </box>
                    <box height={3} border title={`amount (asset)`}>
                      <input
                        value="10"
                        onSubmit={handleSubmit}
                        ref={(r) => (amountRef = r)}
                        focused={store.selected === 0}
                      />
                    </box>
                    <box height={3} border title="receiver">
                      <input
                        onSubmit={handleSubmit}
                        ref={(r) => (receiverRef = r)}
                        focused={store.selected === 1}
                        value="https://ilp.interledger-test.dev/fea976ad"
                        placeholder="https://ilp.interledger-test.dev/test"
                      />
                    </box>
                  </box>
                </Match>
              </Switch>
            </box>
          </Show>
        </Match>
        <Match when={activeTab() === 1}>
          <text>Coming soon</text>
        </Match>
      </Switch>
    </box>
  );
}
