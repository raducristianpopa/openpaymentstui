import { render } from "@opentui/solid";
import { Match, Switch } from "solid-js";
import { RouteProvider, useRoute } from "./context/route";
import { Wallets } from "./routes/wallets";
import { Navigation } from "./components/navigation";
import { AppStateProvider } from "./context/app-state";
import { Payments } from "./routes/payments";
import { Toast, ToastProvider } from "./ui/toast";
import { Flows } from "./routes/flows";

const App = () => {
  const route = useRoute();

  return (
    <box height={"100%"} width={"100%"}>
      <Navigation />
      <Toast />
      <box margin={1} border flexGrow={1}>
        <Switch>
          <Match when={route.current === "wallets"}>
            <Wallets />
          </Match>
          <Match when={route.current === "payments"}>
            <Payments />
          </Match>
          <Match when={route.current === "flows"}>
            <Flows />
          </Match>
        </Switch>
      </box>
    </box>
  );
};

export function app() {
  render(() => {
    return (
      <AppStateProvider>
        <ToastProvider>
          <RouteProvider>
            <App />
          </RouteProvider>
        </ToastProvider>
      </AppStateProvider>
    );
  });
}
