import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import glsl from 'rollup-plugin-glsl';
import {string} from 'rollup-plugin-string';
console.log('stringPlugin', string);

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
      // string({
      //   // 指定需要转换为字符串的文件扩展名
      //   include: ['**/*.glsl', '**/*.frag', '**/*.vert'],
      //   // 设置为false将避免为了压缩而删除空白字符
      //   exclude: 'node_modules/**',
      // }),
      // {
      //   name: 'glsl-plugin',
      //   transform(code, id) {
      //     console.log('transform', id);
      //     if (!/\.(glsl|frag|vert)$/.test(id)) return null;
      //     // 可在此处对代码进行预处理，例如删除注释
      //     const transformedCode = code
      //       .replace(/\/\/.*/g, '') // 删除行注释
      //       .replace(/\/\*[\s\S]*?\*\//g, ''); // 删除块注释
      //     return `export default ${JSON.stringify(transformedCode)};`;
      //   },
      // },
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
    external: ['@atmospherics-viz/types', '@atmospherics-viz/utils'], // 声明外部依赖
  },
  {
    input: 'src/index.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: ['@atmospherics-viz/types', '@atmospherics-viz/utils'],
  },
];
