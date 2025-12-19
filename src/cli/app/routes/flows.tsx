import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import { useAppState } from "../context/app-state";
import { DialogAddFlow } from "../components/dialog-add-flow";
import { useKeyboard } from "@opentui/solid";
import { Keybinds } from "../components/keybinds";
import type { SelectOption, SelectRenderable } from "@opentui/core";
import type { Models } from "#/database/models";
import { iife } from "#/util/iife";
import { FlowEngine } from "#/flows/engine";

export function Flows() {
  // We set equals to false because we want to trigger a rerender
  // when the flow changes, even though the value might be the same.
  const appState = useAppState();
  const [flow, setFlow] = createSignal<Models.Flow | null>(
    appState.store.flows[0] ?? null,
    {
      equals: false,
    },
  );
  const [flowLogs, setFlowLogs] = createSignal<string[]>([]);
  const [showAddFlowDialog, setShowAddFlowDialog] = createSignal(false);

  let selectRef: SelectRenderable | null = null;

  createEffect(() => {
    if (showAddFlowDialog()) {
      appState.set("typing", true);
    } else {
      appState.set("typing", false);
    }
  });

  createEffect(() => {
    const length = appState.store.flows.length;
    if (length > 0) {
      setFlow(appState.store.flows[length - 1]!);
    }
  });

  useKeyboard((e) => {
    if (e.name === "tab" && !showAddFlowDialog()) {
      setShowAddFlowDialog(true);
    }
    if (e.name === "escape" && showAddFlowDialog()) {
      setShowAddFlowDialog(false);
      selectRef?.focus();
    }
  });

  async function onSelect(_: number, option: SelectOption | null) {
    if (!option) return;
    if (!option.value) return;
    setFlowLogs([]);
    const current = flow();
    if (!current) return;

    const ac = new AbortController();
    onCleanup(() => ac.abort());

    iife(async () => {
      try {
        // TODO: Pass the AbortController to the engine
        for await (const ev of FlowEngine.start(current.steps)) {
          if (ac.signal.aborted) break;
          if (ev.type === "log") setFlowLogs((p) => [...p, ev.message]);
          if (ev.type === "done") setFlowLogs((p) => [...p, "Done"]);
        }
      } catch (e: any) {
        console.log(e);
      }
    });
  }

  async function onFlowChange(_: number, option: SelectOption | null) {
    if (!option) return;
    if (!option.value) return;
    setFlow(option.value);
    if (flowLogs().length > 0) setFlowLogs([]);
  }

  return (
    <>
      <box flexDirection="row" height="90%">
        <box width="25%" flexDirection="column" border title="flows">
          <Show when={appState.store.flows.length === 0}>
            <text alignSelf="center">No flows</text>
          </Show>
          <select
            focused
            ref={(r) => (selectRef = r)}
            showDescription={false}
            onSelect={onSelect}
            options={appState.store.flows.map((f) => ({
              name: f.name,
              description: "",
              value: f,
            }))}
            style={{
              height: "90%",
              backgroundColor: "transparent",
              focusedBackgroundColor: "transparent",
              selectedBackgroundColor: "#333333",
              selectedTextColor: "#FFFFFF",
            }}
            onChange={onFlowChange}
            showScrollIndicator
            wrapSelection
            fastScrollStep={5}
          />
        </box>

        <box flexGrow={1} border>
          <box border title="steps">
            <Show when={flow()}>
              <For each={flow()!.steps.split(/\r?\n/)}>
                {(l) => <text>{l}</text>}
              </For>
            </Show>
          </box>
          <Show when={flowLogs().length > 0}>
            <box border title="logs">
              <For each={flowLogs()}>{(l) => <text>{l}</text>}</For>
            </box>
          </Show>
        </box>
      </box>
      <Show when={showAddFlowDialog()}>
        <DialogAddFlow
          close={() => {
            setShowAddFlowDialog(false);
            selectRef?.focus();
          }}
        />
      </Show>
      <Keybinds text="[tab] add flow" />
    </>
  );
}
