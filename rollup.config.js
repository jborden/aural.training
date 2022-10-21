import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';


export default {
  input: 'src/ts/index.ts',
  output: {
    file: 'resources/public/js/bundle.js',
    format: 'iife',
    sourcemap: true
  },
  watch: true,
  plugins: [typescript(),
	    nodeResolve(),
	    livereload()]
};
