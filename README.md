
# SolidJs Router

This is a simple SPA router for SolidJS that uses plain URLs and not #hash-urls. Although, it has no shared code with React-Router -it is partially based on the basic syntax of it. 

## Installation

Inside your project folder run:

```
npm install solidjsrouter
```


## Usage
### `<RouterProvider>`

Your entire app should be wrapped in RouterProvider to make sure it has access to routing functionality everywhere.

```javascript
// App.jsx
import { RouterProvider } from 'solidjsrouter';

export const App = () => (
  <RouterProvider>
    <Navigation />
    <Main />
  </RouterProvider>
);
```

### `<Route>`
To register a route -import and add a Route component. These Route components should be added where ever you expect your router-output to render.

Each Route component should get at least 2 props. A 'component' prop whose value is a Component reference that will render if the path matches, and a 'path' prop that is basically the condition on which we will match the URL to render the component.

```javascript
// Main.jsx
import { Route } from 'solidjsrouter';
import { Home } from './Home';
import { Profile } from './Profile';
import { Settings } from './Settings';

export const Main = () => (
    <>
        <Route component={Home} exact path='' />
        <Route component={Profile} path='profile' />
        <Route component={Settings} path='settings' />
    </>
)
```
Notice that certain Routes can be given an 'exact' prop. Since, by default, Routes will match their 'path' prop against the beginning of the URL. 

The 'exact' prop forces the condition to be based on a complete and exact match.

### `<RouterLink>`

```javascript
// Navigation.jsx
import { RouterLink } from 'solidjsrouter';

export const Navigation = () => (
    <nav className="nav">
        <RouterLink path="" activeClass="bold">Home</RouterLink>
        <RouterLink path="profile" activeClass="bold">Profile</RouterLink>
        <RouterLink path="settings" activeClass="bold">Settings</RouterLink>
    </nav>
)
```

The RouterLink component generates an anchor tag that can be used to trigger page-routing through solidjsrouter based on its 'path' prop. Without this -an anchor tag will trigger a full re-render of the app.

The inner contents of the RouterLink tag will be passed into the inner content of the resulting anchor tag. 

To render the presence of a certain css class in the case of a path-match, use the 'activeClass' prop to indicate this class.

## Query String parameters
Query String parameters are automatically extracted from the url and added to the resulting component as a `queryParams` prop. Example:

```javascript
// Main.jsx
const Main = () => (
  <>
      <Route component={Search} path='search' />
  </>
);

// Navigation.jsx
const Navigation = () => (
    <nav className="nav">
        <RouterLink path="search?sort=date&order=descending">Search<RouterLink>
    </nav>
);

// Search.jsx
const Search = (props) => {
    console.log(props.queryParams.sort) // 'date'
    console.log(props.queryParams.order) // 'descending'
    return (
        <>
            <h1>Search page</h1>
        </>
    )
};
```

## Route-params
Route-params are named within a `<Route>` component path prop. They are preceded with a colon `:` shown in the following example as `blog/:detail_path`. The name of the route-param is 'detail_path'
```javascript
// Main.jsx
const Main = () => (
  <>
      <Route component={BlogDetail} path='blog/:detail_path' />
  </>
);

// Navigation.jsx
const Navigation = () => (
    <nav className="nav">
        <RouterLink path="blog/fancy-blogpost-1">Post 1</RouterLink>
        <RouterLink path="blog/my-blogpost-two">Post Two</RouterLink>
    </nav>
)
```

A value is provided for the route-param in a `<RouterLink>` path prop. The route-param value is used in place of the name. The examples above provide the BlogDetail component with `detail_path='fancy-blogpost-1'` and `detail_path='my-blogpost-two'` respectively.

The route-param become available to the designated component, BlogDetail in this example, as a prop called `routeParam`.
```javascript
const BlogDetail = (props) => {
    const detailPath = props.routeParam.detail_path;

    return (
        <>
            <h1>Blog Detail</h1>
        </>
    )
};
```

## Nested Routes
any If you need to have several routes with the same beginning - you can use 'exact' for any generic route, and leave it off for the rest.

Like this:
```javascript
const Main = () => (
  <>
      <Route component={Blog} exact path='blog' />
      <Route component={BlogDetail} path='blog/detail' />
      <Route component={BlogList} path='blog/list' />
  </>
);
```
Alternatively, you could not use 'exact' at all to always render the 'blog' `Route` inside your main file, and put additional `Route`s inside your Blog component.

Like this:
```javascript
const Main = () => (
  <>
      <Route component={Blog} path='blog' />
  </>
);

const Blog = () => (
    <>
        <h1>Blog</h1>
        <Route component={BlogDetail} path='blog/detail' />
        <Route component={BlogList} path='blog/list' />
    </>
);
```



## Contributing

Feel free to fork, make edits, submit pull requests, or create issues. 



## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details


