import { createState, createContext } from "solid-js";

export const RouterContext = createContext([{ currentRoute: '' }, {}]); // this for some sort of init? Why? What?

export function RouterProvider(props) {
    const getCurrentRoute = () => {
        const fullPath = document.location.href;
        const routeArray = fullPath.split(document.location.host);
        const route = routeArray.length > 1 ? routeArray[1].replace('/', '') : '';
        return route;
    };

    const adjustPath = (path) => {
        path = path.indexOf('/') === 0 ? path.replace('/', '') : path;
        console.log(path);
        path = path.split(':')[0];
        return path;
    }

    const navigate = (path, e) => {
        if (e) { e.preventDefault(); }
        path = adjustPath(path);
        window.history.pushState("", "", `/${path}`);
        setContextState({ currentRoute: path })
    }

    const [contextState, setContextState] = createState({ currentRoute: getCurrentRoute() });

    const store =
    {
        contextState,
        setRoute(path) {
            navigate(path);
        },
        navigate
    };

    return (
        <RouterContext.Provider value={store}>
            {props.children}
        </RouterContext.Provider>
    );
}