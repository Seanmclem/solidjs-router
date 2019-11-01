import { RouterContext } from "./SolidjsRouter";
import { useContext } from "solid-js";

const navigate = (e, path, setRoute) => {
    e.preventDefault();
    path = path.indexOf('/') === 1 ? path.replace('/', '') : path;
    window.history.pushState("", "", `/${path}`);
    setRoute(path);
}

export const RouterLink = (props) => {
    const [state, { setRoute }] = useContext(RouterContext);

    return (
        <a href={props.path} onClick={(e) => navigate(e, props.path, setRoute)}>{props.children}</a>
    )
}