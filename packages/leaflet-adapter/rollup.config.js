import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import glsl from 'rollup-plugin-glsl';

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [
      glsl({
        include: '**/*.glsl',
        exclude: ['**/index.glsl'],
        sourceMap: false,
        compress: false,
      }),
      typescript({
        tsconfig: './tsconfig.json',
      }),
    ],
    external: [
      '@atmospherics-viz/types',
      '@atmospherics-viz/core',
      '@atmospherics-viz/shared',
      'leaflet',
    ],
  },
  {
    input: 'src/index.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [
      '@atmospherics-viz/types',
      '@atmospherics-viz/core',
      '@atmospherics-viz/shared',
      'leaflet',
    ],
  },
];
