import { useContext, createState, createEffect } from "solid-js";
import { RouterContext } from "./RouterContext";

// updating on prop change
// https://github.com/ryansolid/solid/blob/master/documentation/components.md#components

const getRouteParam = path => {
    const result = !path || (path && !path.includes(':')) ? '' : path.split(':')[1]
    return { routeParam: result }
}

const getQueryParams = path => {
    if (!path || (path && !path.includes('?'))) {
        return { value: null };
    }

    const paramsStringsArray = path.split('?');
    const paramsArray = paramsStringsArray[1].split('&');
    const paramsObjectsArray = paramsArray.map(param => [param.split('=')[0], param.split('=')[1]]);

    return { queryParams: Object.fromEntries(paramsObjectsArray) };
}

export const Route = ({ path, component, exact }) => {
    const [context] = useContext(RouterContext);
    const [state, setState] = createState({ showPath: false, routeParam: '', queryParams: null });
    const TheComponent = component;

    createEffect(() => setState({
        showPath: exact ?
            path === context.currentRoute :
            context.currentRoute && context.currentRoute.startsWith(path)
    }));

    createEffect(() => {
        if (state.showPath) {
            setState(getRouteParam(path));
            setState(getQueryParams(context.currentRoute));
        }
    });

    return (
        <Show when={state.showPath}>
            <TheComponent
                routeParams={state.routeParam}
                queryParams={state.queryParams}
            />
        </Show>
    )
}