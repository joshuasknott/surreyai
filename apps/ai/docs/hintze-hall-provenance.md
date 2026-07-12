# Hintze Hall After Hours — provenance, processing, and runtime audit

## Source record

- Work: **Hintze Hall**
- Creator: **David Fletcher / artfletch**
- Original model: https://sketchfab.com/3d-models/hintze-hall-45f5e56887f44075bbf283977c99541f
- Sketchfab identifier: `45f5e56887f44075bbf283977c99541f`
- Licence: **Creative Commons Attribution 4.0 International (CC BY 4.0)**
- Licence URL: https://creativecommons.org/licenses/by/4.0/
- Local source date: **2026-07-11**
- Original archive: `hintze-hall.zip`
- Original archive size: **141,636,398 bytes**
- Original archive SHA-256: `A2947CAF138F479517518FC1C8CD42D0805A00B32B10A8B6B54D737AAD704D5B`
- The checksum was re-run after processing and remained unchanged.

The official Sketchfab page identifies the work as Hintze Hall by `artfletch`, gives approximately two million triangles and 1.4 million vertices, and describes 3,284 photographs taken in March 2023 using a Sony a7R III, processed in RealityCapture, then heavily cleaned manually. The creator also records that the gorilla in the north-east corner did not process properly. David Fletcher's identity as `artfletch` is independently corroborated by National Trust photogrammetry model credits.

## Original archive contents

The outer ZIP contains:

| Path | Bytes |
| --- | ---: |
| `source/NHMHintzeHall01.zip` | 103,599,558 |
| `textures/NHMHintzeHall02_Model_9_u1_v1_diffuse.jpeg` | 20,085,676 |
| `textures/NHMHintzeHall02_Model_9_u2_v1_diffuse.jpeg` | 17,950,658 |

The nested original-source ZIP has SHA-256 `0313CC4733EDE171083D3C258298C1DE539CE7DC17A47ACBD706C32FB0E09570` and contains:

| Path | Bytes |
| --- | ---: |
| `NHMHintzeHall01.obj` | 237,562,623 |
| `NHMHintzeHall01.mtl` | 400 |
| `NHMHintzeHall02_Model_9_u1_v1_diffuse.jpg` | 20,085,676 |
| `NHMHintzeHall02_Model_9_u2_v1_diffuse.jpg` | 17,950,658 |

Both texture atlases are 8192×8192 RGB JPEGs. No fallback download or substitute visual asset was required.

## Raw scan audit

The extracted OBJ loaded in Blender 5.1.2 as one mesh in 3.8 seconds. Direct OBJ counts were 991,194 position vertices, 1,926,071 UV records, 1,123,456 normal records, and 1,982,034 face records. Blender resolved 1,982,008 render triangles and three used material slots. Bounds were approximately 22.72 m wide, 45.48 m long, and 16.30 m high.

Four 1600×900 unlit audit views were rendered at an eye-level camera before any repository cleanup. They confirmed:

- A complete, high-detail central axis, principal staircase, suspended whale, roof structure, painted ceiling, and floor mosaic.
- Strong baked photographic illumination; extra directional light or heavy tone mapping would conflict with the source.
- Open scan boundaries and incomplete side-area capture at the outer perimeter.
- Flat or dark exhibit panels and blurred/fused scan remnants near some side openings.
- The reported north-east gorilla defect should not be exposed as a walkable destination.
- The central ground-floor nave is the strongest coherent route. Stairs, landings, side aisles, and the defective corner are intentionally outside the supported collision envelope.

## Transformations

`apps/ai/scripts/process_hintze_hall.py` performs the deterministic Blender stage:

1. Verifies the extracted working copy has one OBJ, one MTL, and two diffuse atlases.
2. Imports with the source's Z-up orientation and preserves the original UV mapping.
3. Moves the lowest captured surface from source Z `0.623439` to glTF floor Y `0`.
4. Keeps the baked colour textures in sRGB with a neutral, fully rough material setup.
5. Exports a lossless 122,987,332-byte normalized GLB intermediate.
6. Writes a separate analytic collision envelope for a 0.34 m radius, 1.70 m eye-height player.

Blender is used because it gives deterministic control over orientation, physical scale, material interpretation, floor registration, and authored collision boundaries without remeshing the captured Hall. It is not used to replace the scan with procedural architecture.

`apps/ai/scripts/optimize_hintze_hall.mjs` performs the dedicated delivery stage with glTF Transform 4.4.1:

1. Welds and simplifies geometry while locking topology borders and preserving UVs.
2. Compresses geometry with `EXT_meshopt_compression` for fast browser decoding.
3. Converts the baked atlases to WebP at tier-specific resolutions.
4. Flattens the single scene and prunes unused data.

glTF Transform is superior to a Blender-only export for this stage because its meshoptimizer pipeline provides browser-native geometry compression, explicit error-bounded simplification, and reproducible texture tiering. Both final GLBs pass glTF validation with zero errors and zero warnings; the validator only notes that it cannot introspect the otherwise supported Meshopt extension.

## Runtime derivatives

| Measurement | Raw normalized | Desktop | Mobile |
| --- | ---: | ---: | ---: |
| File bytes | 122,987,332 | 23,357,144 | 14,729,788 |
| Brotli transfer bytes (quality 6) | — | 20,256,145 | 12,604,441 |
| Triangles | 1,982,008 | 1,381,881 | 867,071 |
| Draw calls / material primitives | 3 | 3 | 3 |
| Texture resolution | 2 × 8192² | 2 × 4096² | 2 × 2048² |
| Decoded texture memory, including mip estimates | ~512 MiB before mips | ~170.7 MiB | ~42.7 MiB |
| Estimated geometry GPU upload | — | 40.11 MB | 27.60 MB |

Desktop preserves the highest practical texture and geometry fidelity. Mobile reduces texture dimensions, triangle count, device pixel ratio, antialiasing cost, and dust effects while remaining a fully three-dimensional scan.

Runtime initialization time and approximate frame rate are recorded by the live experience in `window.__hintzeHallMetrics` and are added to the QA section after browser measurement.

## Supported movement and defect treatment

The supported route is the central ground-floor nave, approximately 10.4 m wide by 32.3 m long after player-radius clearance. It includes long views to both ends and multiple viewpoints below the whale. A fixed ground plane and capsule-equivalent horizontal collider prevent falls through scan holes. Expanded collision boxes block the south central display and the north side boundaries. Stairs and landings are not enabled.

The incomplete north-east exhibit is outside the route, has a dedicated collision volume, a restrained physical barrier marker, and a contextual “unavailable in this scan” notice. No fake gorilla or invented room is present.

## Secondary assets and audio

There are no secondary models, generated façades, panoramas, people, museum photographs, or external textures. Quiet room tone, ventilation hum, and footstep transients are generated at runtime with the Web Audio API after user interaction; there is no external audio asset or music.

## Required visible credit

The modal and standalone experience display:

> Hintze Hall photogrammetry by David Fletcher / artfletch, licensed under Creative Commons Attribution.

The credit links to the original Sketchfab model and the CC BY 4.0 licence. The experience does not imply endorsement, partnership, or affiliation with the Natural History Museum, David Fletcher, or Sketchfab.

## Browser QA evidence

Pending final desktop and mobile runtime capture. This section is updated from the running application rather than inferred from build output.
