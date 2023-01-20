import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';


export default {
  input: 'src/ts/index.ts',
  output: {
    file: 'resources/public/js/bundle.js',
    format: 'iife',
    sourcemap: 'inline'
  },
  watch: false,
  plugins: [typescript(),
	    nodeResolve()]
};
