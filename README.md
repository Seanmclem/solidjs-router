
# SolidJs Router

Desc

## Installation

Inside your project folder run:

```
npm install solidjsrouter
```


## Usage

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
Notice that certain Routes can be given an 'exact' prop. Since, by default, Routes will match their 'path' prop against the beginning of the URL. The 'exact' prop forces the condition to be based on a complete and exact match. 

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


## Contributing

Feel free to fork, make edits, submit pull requests, or create issues. 



## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details


