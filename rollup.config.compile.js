import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import replace from '@rollup/plugin-replace';

export default {
  input: 'src/ts/index.tsx',
  output: {
    file: 'resources/public/js/bundle.js',
    format: 'iife',
    sourcemap: 'inline',
    inlineDynamicImports: true,
    globals: {
      "react/jsx-runtime":"jsxRuntime",
      "react-dom/client":"ReactDOM",
      "react":"React"},
  },
  watch: false,
  plugins: [typescript(),
            nodeResolve(),
            livereload(),
            // this should be 'production' for minified code
            replace({preventAssignment: true,
		     'process.env.NODE_ENV': JSON.stringify('production')}),
            commonjs(),
            babel({
            babelHelpers: "bundled",
               exclude: 'node_modules/**',
               presets: [["@babel/preset-react", {"runtime": "automatic"}]]})]};
