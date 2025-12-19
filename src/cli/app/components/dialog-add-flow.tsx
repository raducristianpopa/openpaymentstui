import type { InputRenderable, TextareaRenderable } from "@opentui/core";
import { Dialog } from "../ui/dialog";
import { useToast } from "../ui/toast";
import { SDK } from "#/sdk";
import { Identifier } from "#/util/identifier";
import { useAppState } from "../context/app-state";

const defaultFlow = `select https://ilp.interledger-test.dev/uct-test-usd
send 5 https://ilp.interledger-test.dev/radu-test-3`;

interface DialogAddFlowProps {
  close: () => void;
}

export function DialogAddFlow({ close }: DialogAddFlowProps) {
  const toast = useToast();
  const appState = useAppState();
  let inputRef: InputRenderable | null = null;
  let flowRef: TextareaRenderable | null = null;

  async function onSubmit() {
    const name = inputRef!.value;
    const flow = flowRef!.plainText;

    try {
      const id = Identifier.create("flow");
      await SDK.createFlow(id, name, flow);
      appState.addFlow(id, name, flow);
      close();
      appState.set("typing", false);
    } catch (err) {
      toast.show({
        title: "Error",
        message: "Could not create flow",
        variant: "error",
        duration: 3000,
      });
    }
  }

  return (
    <Dialog title="create new flow">
      <box height={3} border title="name">
        <input
          onSubmit={onSubmit}
          ref={(r) => (inputRef = r)}
          height={1}
          focused
        />
      </box>
      <box border title="flow">
        <textarea
          onSubmit={onSubmit}
          initialValue={defaultFlow}
          ref={(r) => (flowRef = r)}
        />
      </box>
    </Dialog>
  );
}
