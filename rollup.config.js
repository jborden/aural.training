import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';


export default {
  input: 'src/index.ts',
  output: {
    file: 'public/js/bundle.js',
    format: 'iife',
    sourcemap: true
  },
  watch: true,
  plugins: [typescript(),
	    nodeResolve(),
	    livereload()]
};
