import { RouterContext } from "./RouterContext";
import { useContext } from "solid-js";

const navigate = (e, path, setRoute) => {
    e.preventDefault();
    path = path.indexOf('/') === 1 ? path.replace('/', '') : path;
    path = path.split(':')[0];
    window.history.pushState("", "", `/${path}`);
    setRoute(path);
}

export const RouterLink = ({ activeClass, path, children }) => {
    const [context, { setRoute }] = useContext(RouterContext);

    return (
        <a
            className={path === context.currentRoute ? activeClass : ''}
            href={path}
            onClick={(e) => navigate(e, path, setRoute)}
        >
            {children}
        </a>
    )
}