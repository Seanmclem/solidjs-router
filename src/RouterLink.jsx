import { RouterContext } from "./RouterContext";
import { useContext } from "solid-js";

export const RouterLink = ({ activeClass, path, children }) => {
    const { contextState, navigate } = useContext(RouterContext);

    return (
        <a
            className={path === contextState.currentRoute ? activeClass : ''}
            href={path}
            onClick={(e) => navigate(path, e)}
        >
            {children}
        </a>
    )
}