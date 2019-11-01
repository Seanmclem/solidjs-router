import { createState, createContext } from "solid-js";

export const RouterContext = createContext([{ currentRoute: '' }, {}]); // this for some sort of init? Why? What?

export function RouterProvider(props) {
    const getCurrentRoute = () => {
        const fullPath = document.location.href;
        const routeArray = fullPath.split(document.location.host);
        const route = routeArray.length > 1 ? routeArray[1].replace('/', '') : '';
        return route;
    };

    const [state, setState] = createState({ currentRoute: getCurrentRoute() });
    const store = [
        state,
        {
            setRoute(path) {
                setState({ currentRoute: path });
            }
        }
    ];

    return (
        <RouterContext.Provider value={store}>
            {props.children}
        </RouterContext.Provider>
    );
}