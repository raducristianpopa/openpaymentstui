import { createContext, useContext, type ParentProps } from "solid-js";

interface CustomContext<T, Props extends Record<string, any>> {
  /*
   * `name` is only used for debugging purposes.
   */
  name: string;

  /*
   * `load` provides the initial value of the context.
   */
  load: ((input: Props) => T) | (() => T);
}
export function createCustomContext<T, Props extends Record<string, any>>(
  input: CustomContext<T, Props>,
) {
  const ctx = createContext<T>();

  return {
    provider(props: ParentProps<Props>) {
      const load = input.load(props);
      return <ctx.Provider value={load}>{props.children}</ctx.Provider>;
    },
    use() {
      const value = useContext(ctx);
      if (!value)
        throw new Error(
          `${input.name} context must be used within a context provider`,
        );
      return value;
    },
  };
}
