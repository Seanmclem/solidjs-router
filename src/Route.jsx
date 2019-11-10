import { useContext, createState, createEffect } from "solid-js";
import { RouterContext } from "./RouterContext";

// updating on prop change
// https://github.com/ryansolid/solid/blob/master/documentation/components.md#components

const getRouteParam = path => {
    const result = !path || (path && !path.includes(':')) ? '' : path.split(':')[1]
    return { value: result }
}

const getQueryParams = path => {
    if (!path || (path && !path.includes('?'))) {
        return { value: null };
    }
    const paramsStringsArray = path.split('?');
    const paramsArray = paramsStringsArray[1].split('&');
    const paramsObjectsArray = paramsArray.map(param => [param.split('=')[0], param.split('=')[1]]);
    return Object.fromEntries(paramsObjectsArray);
}

export const Route = ({ path, component, exact }) => {

    const [state] = useContext(RouterContext);
    const [showRoute, setShowRoute] = createState({ showPath: false });
    const [routeParam, setRouteParam] = createState({ value: '' });
    const [queryParams, setQueryParams] = createState({ value: null });
    const TheComponent = component;

    createEffect(() => setShowRoute({
        showPath: exact ?
            path === state.currentRoute :
            state.currentRoute && path.startsWith(state.currentRoute)
    }));

    createEffect(() => {
        if (showRoute.showPath) {
            setRouteParam(getRouteParam(path));
            setQueryParams(getQueryParams(path));
        }
    });

    return (
        <Show when={showRoute.showPath}>
            <TheComponent
                routeParams={routeParam.value}
                queryParams={queryParams.value}
            />
        </Show>
    )
}