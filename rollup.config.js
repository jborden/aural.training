import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: {
    file: 'public/js/bundle.js',
    format: 'cjs',
    sourcemap: true
  },
  watch: true,
  plugins: [typescript()]
};
