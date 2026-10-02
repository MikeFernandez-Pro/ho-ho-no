// `vitest/config` re-exports vite's `defineConfig` with the `test` block typed,
// so one config serves the dev server, the build and the headless tests.
import { defineConfig } from 'vitest/config'

// The game is one page and one program, so this is a plain vite app.
export default defineConfig({
  // Relative asset URLs: Pages serves the game under `/ho-ho-no/`, and a
  // root-absolute `/models/...` would 404.
  base: './',
  resolve: {
    dedupe: ['three'],
  },
  build: {
    // Top-level await in the entry: the renderer and the assets are awaited.
    target: 'es2022',
    // The entry carries Rapier's WASM inline (the compat build, so the same
    // module runs in the browser and under vitest in Node): about 3 MB, 1 MB
    // gzipped. Known, and not a warning worth reading on every build.
    chunkSizeWarningLimit: 4096,
  },
  test: {
    // The simulation is below the renderer seam: no renderer, DOM or audio, so
    // it runs in plain Node with Rapier's WASM (the compat build inlines it).
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
