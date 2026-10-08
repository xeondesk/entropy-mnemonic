import pkg from './package.json' with { type: 'json' };
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.browser,
      format: 'umd',
      name: 'entropy-mnemonic',
      sourcemap: true,
    },
    {
      dir: 'es',
      format: 'es',
      sourcemap: true,
      preserveModules: true,
    },
  ],
  external: [...Object.keys(pkg.dependencies ?? {})],
  plugins: [
    json(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false,
    }),
    terser(),
  ],
};
