import { createCustomContext } from "./custom-context";
import { createSignal } from "solid-js";

export type Route = "wallets" | "contacts" | "flows" | "payments";

export const { use: useRoute, provider: RouteProvider } = createCustomContext({
  name: "Route",
  load: () => {
    const [route, setRoute] = createSignal<Route>("wallets");

    return {
      get current() {
        return route();
      },
      navigate(route: Route) {
        setRoute(route);
      },
    };
  },
});
