import { useContext, createState, createEffect } from "solid-js";
import { RouterContext } from "./RouterContext";

// updating on prop change
// https://github.com/ryansolid/solid/blob/master/documentation/components.md#components

export const Route = ({ path, component, exact }) => {
    const [state] = useContext(RouterContext);
    const [showRoute, setShowRoute] = createState({ showPath: false });
    const TheComponent = component;
    createEffect(() => setShowRoute({
        showPath: exact ? path === state.currentRoute : state.currentRoute.startsWith(path)
    }));

    return (
        <Show when={showRoute.showPath}>
            <TheComponent />
        </Show>
    )
}