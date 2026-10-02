# Ho Ho No

Santa against the skeleton horde. Hold the camp, throw snowballs, grab the
gifts, and see how long Christmas lasts.

**[Play it in your browser](https://mikefernandez-pro.github.io/ho-ho-no/)**

Built with [three.js](https://threejs.org) on `WebGPURenderer` (it falls back to
WebGL 2 where WebGPU is missing), with every crowd animated by
[three-vat](https://github.com/MikeFernandez-Pro/three-vat): the skeletons rise,
walk and die as vertex animation textures on one instanced mesh, crossfading
between clips on the GPU, with no skeleton or mixer on the CPU.

## Controls

| | Keyboard and mouse | Phone |
| --- | --- | --- |
| Move | WASD or the arrow keys | a stick, wherever your thumb lands |
| Aim | the cursor | Santa aims at the nearest skeleton |
| Throw | hold the left button or Space | Santa throws by himself |

Gifts drop into the arena and blink before they vanish. Each one grants a
boost: ghost, speed, or a faster throw. The run ends when a skeleton reaches
Santa.

## Run it locally

```bash
pnpm install
pnpm dev        # bakes the crowds, then serves the game
pnpm test       # the gameplay, headless in Node
pnpm build      # dist/, as deployed
```

`pnpm bake` writes the two crowds' baked files, `public/models/skeleton.vat.glb`
and `public/models/elf.vat.glb`, from the sources in `models/` with the
`three-vat bake` command. `dev`, `build` and `test` run it first, so the baked
files are never committed. `models/vat.config.json` names the clips and their
playback defaults.

Open the game on `#debug` (then reload) for three's inspector: frame timings,
draw calls, the look's parameters, and a few cheats.

## How it is cut

- **The simulation** (`src/simulation/`) is the gameplay: stepped by
  `(time, input)`, owning the Rapier world, with no renderer, DOM or audio.
  What each skeleton plays it writes into its row of the playback texture with
  three-vat's `setVATInstance`. Its tests drive it in Node on the real baked
  files and ask three-vat's `resolveVATFrame` what each skeleton shows.
- **The renderer seam** (`src/seam.ts`, `src/seams/webgpu.ts`) is everything
  that is the renderer's: the renderer, the toon and floor materials in TSL,
  the snow and burst particles, and the post pass with its vignette.
- **Above the seam**: the stage, the crowds (`src/crowds.ts`), Santa, the input,
  the start screen, the HUD and the sound (howler, on the simulation's events).

## Credits and licence

The code is MIT (see `LICENSE`). The assets are not, and keep their own terms:

- Models by [Kay Lousberg](https://kaylousberg.com/game-assets) (KayKit),
  released under CC0.
- Music and sound effects from [Pixabay](https://pixabay.com), under the
  Pixabay Content License; boost icons from [Flaticon](https://www.flaticon.com).
  Each author is credited in `public/licence.txt`, shown behind the start
  screen's Credits link.
