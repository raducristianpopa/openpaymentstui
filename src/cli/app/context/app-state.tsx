import { createStore } from "solid-js/store";
import { createCustomContext } from "./custom-context";
import type { Models } from "#/database/models";
import { SDK } from "#/sdk";
import { batch, onMount } from "solid-js";

interface AppState {
  typing: boolean;
  wallets: Array<Models.WalletAddress>;
  flows: Array<Models.Flow>;
}

export const { use: useAppState, provider: AppStateProvider } =
  createCustomContext({
    name: "AppState",
    load: () => {
      const [store, setStore] = createStore<AppState>({
        typing: false,
        wallets: [],
        flows: [],
      });

      async function bootstrap() {
        const [wallets, flows] = await Promise.all([
          SDK.getWallets(),
          SDK.getFlows(),
        ]);

        batch(() => {
          setStore("wallets", wallets);
          setStore("flows", flows);
        });
      }

      onMount(() => {
        bootstrap();
      });

      return {
        set: setStore,
        store,
        addWallet: (wallet: Models.WalletAddress) => {
          setStore("wallets", [...store.wallets, wallet]);
        },
        addFlow: (id: string, name: string, steps: string) => {
          setStore("flows", [...store.flows, { id, name, steps }]);
        },
      };
    },
  });
