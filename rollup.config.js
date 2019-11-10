import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';

const plugins = [
    babel({
        exclude: 'node_modules/**',
        presets: ["solid"]
    }),
    resolve({ extensions: ['.js', '.jsx'] })
];

if (process.env.production) {
    plugins.push(terser());
}

export default {
    external: ['solid-js', 'solid-js/dom'],
    input: 'src/index.jsx',
    output: {
        file: 'index.js',
        format: 'es'
    },
    plugins
};