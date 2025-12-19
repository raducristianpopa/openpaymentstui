import { createContext, useContext, type ParentProps, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { useTerminalDimensions } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";

interface ToastOptions {
  title?: string;
  message: string;
  variant: "info" | "success" | "warning" | "error";
  duration?: number;
}

export function Toast() {
  const toast = useToast();
  const dimensions = useTerminalDimensions();

  return (
    <Show when={toast.currentToast}>
      {/* @ts-expect-error */}
      {(current) => (
        <box
          position="absolute"
          justifyContent="center"
          alignItems="flex-start"
          top={2}
          right={2}
          maxWidth={Math.min(60, dimensions().width - 6)}
          paddingLeft={2}
          paddingRight={2}
          paddingTop={1}
          paddingBottom={1}
          border={["left", "right"]}
        >
          <Show when={current().title}>
            <text attributes={TextAttributes.BOLD} marginBottom={1}>
              {current().title}
            </text>
          </Show>
          <text wrapMode="word" width="100%">
            {current().message}
          </text>
        </box>
      )}
    </Show>
  );
}

function init() {
  const [store, setStore] = createStore({
    currentToast: null as ToastOptions | null,
  });

  let timeoutHandle: NodeJS.Timeout | null = null;

  const toast = {
    show(options: ToastOptions) {
      const { duration, ...currentToast } = options;
      setStore("currentToast", currentToast);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      timeoutHandle = setTimeout(() => {
        setStore("currentToast", null);
      }, duration).unref();
    },
    error: (err: any) => {
      if (err instanceof Error)
        return toast.show({
          variant: "error",
          message: err.message,
        });
      toast.show({
        variant: "error",
        message: "An unknown error has occurred",
      });
    },
    get currentToast(): ToastOptions | null {
      return store.currentToast;
    },
  };
  return toast;
}

export type ToastContext = ReturnType<typeof init>;

const ctx = createContext<ToastContext>();

export function ToastProvider(props: ParentProps) {
  const value = init();
  return <ctx.Provider value={value}>{props.children}</ctx.Provider>;
}

export function useToast() {
  const value = useContext(ctx);
  if (!value) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return value;
}
