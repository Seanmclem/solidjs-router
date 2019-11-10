import { RouterContext } from "./RouterContext";
import { useContext } from "solid-js";

const navigate = (e, path, setRoute) => {
    e.preventDefault();
    path = path.indexOf('/') === 1 ? path.replace('/', '') : path;
    window.history.pushState("", "", `/${path}`);
    setRoute(path);
}

export const RouterLink = ({ activeClass, path, children }) => {
    const [state, { setRoute }] = useContext(RouterContext);

    return (
        <a
            className={path === state.currentRoute ? activeClass : ''}
            href={path}
            onClick={(e) => navigate(e, path, setRoute)}
        >
            {children}
        </a>
    )
}