import { useContext, createState, createEffect } from "solid-js";
import { RouterContext } from "./RouterContext";

// updating on prop change
// https://github.com/ryansolid/solid/blob/master/documentation/components.md#components

const getRouteParam = (name, path) => {
    const paramName = !name || (name && !name.includes(':')) ? '' : name.split(':')[1]
    const pathVal = !name || (name && !name.includes(':')) ? '' : name.split(':')[0]
    const pathParam = !path || (path && !path.includes(pathVal)) ? '' : path.split(pathVal)[1]

    return { routeParam: { [paramName]: pathParam } }
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

    createEffect(() => {
        const matchPath = path.split(':')[0];
        setState({
            showPath: exact ?
                matchPath === context.currentRoute :
                context.currentRoute && context.currentRoute.startsWith(matchPath)
        })
    });

    createEffect(() => {
        if (state.showPath) {
            setState(getRouteParam(path, context.currentRoute));
            setState(getQueryParams(context.currentRoute));
        }
    });

    return (
        <Show when={state.showPath}>
            <TheComponent
                routeParam={state.routeParam}
                queryParams={state.queryParams}
            />
        </Show>
    )
}