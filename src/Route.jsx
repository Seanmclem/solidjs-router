import { useContext } from "solid-js";
import { RouterContext } from "./RouterContext";

// updating on prop change
// https://github.com/ryansolid/solid/blob/master/documentation/components.md#components

export const Route = ({ path, component, children }) => {
    const TheComponent = component;
    const [state] = useContext(RouterContext);

    return (
        <Show when={path === state.currentRoute}>
            <TheComponent />
        </Show>
    )
}