import { defineConfig } from 'tsup';

export default defineConfig({
  target: 'node20',
  treeshake: true,
  clean: true,
  dts: true,
  entry: [
    './src/index.ts'
  ],
  minify: true,
  sourcemap: true
});
