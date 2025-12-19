import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/solid";
import { useRoute } from "../context/route";
import { useAppState } from "../context/app-state";
import { VERSION } from "#/version";

interface NavigationItemProps {
  label: string;
  shortcut: string;
  active: boolean;
}

function NavigationItem({ shortcut, label }: NavigationItemProps) {
  const route = useRoute();
  const active = () => route.current === label;

  return (
    <box alignItems="center" flexDirection="row" justifyContent="space-between">
      <text>{shortcut}</text>
      <text attributes={active() ? TextAttributes.NONE : TextAttributes.DIM}>
        {label.slice(1)}
      </text>
    </box>
  );
}

export function Navigation() {
  const route = useRoute();
  const appState = useAppState();

  useKeyboard((e) => {
    if (appState.store.typing) return;
    if (e.name === "w") {
      route.navigate("wallets");
    }
    if (e.name === "f") {
      route.navigate("flows");
    }
    if (e.name === "p") {
      route.navigate("payments");
    }
  });

  return (
    <>
      <ascii_font
        font="tiny"
        marginTop={1}
        alignSelf="center"
        text="openpaymentstui"
      />
      <text
        attributes={TextAttributes.DIM}
        position="absolute"
        top={0}
        left={0}
      >
        {VERSION}
      </text>

      <box
        flexDirection="row"
        alignItems="center"
        border
        justifyContent="center"
        marginTop={1}
        marginBottom={1}
        columnGap={8}
        marginLeft={34}
        marginRight={34}
      >
        <NavigationItem
          label="wallets"
          shortcut="w"
          active={route.current === "wallets"}
        />
        <NavigationItem
          label="payments"
          shortcut="p"
          active={route.current === "payments"}
        />
        <NavigationItem
          label="flows"
          shortcut="f"
          active={route.current === "flows"}
        />
      </box>
    </>
  );
}
