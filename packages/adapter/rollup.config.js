import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import { nodeResolve } from '@rollup/plugin-node-resolve';

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
      nodeResolve({
        // 解析工作区包
        modulePaths: ['../../node_modules', '../node_modules', 'node_modules']
      }),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false, // Rollup 插件不生成声明文件
        declarationMap: false,
      }),
    ],
    external: [
      '@atmospherics-viz/types',
      '@atmospherics-viz/utils'
    ],
  },
  {
    input: 'src/index.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [
      '@atmospherics-viz/types',
      '@atmospherics-viz/utils'
    ],
  },
];