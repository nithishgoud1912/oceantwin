# Delivery status — 28 September 2026

This is the current implementation record, superseding the earlier audit of the demonstration UI.

| Requested capability | Delivered locally | Qualification |
|---|---|---|
| Browser-native 3D field rendering | Geographic slices, translucent voxels and interpolated isosurfaces | Rectilinear grids; bounded, explicitly sampled reads. Voxels are not a ray-marched volume. |
| Model and instrument co-display | All available source markers, selected tracks, depth charts and selected profile samples within the 3D domain | Instrument dates remain independent; bundled archives are not simultaneous. |
| Variable/depth/time controls | Source-derived variables and levels; multiple timestamps and playback | Temperature has one timestamp; the derived MODIS sequence has three genuine composite intervals. |
| Custom colour controls | Palette, numeric min/max, linear/log scale, opacity, vertical exaggeration | Log scale excludes non-positive values. |
| Ingestion and extensibility | NetCDF discovery, protected uploads, CSV/TSV column adapters and opt-in directory refresh | No remote institutional feed has been configured. Curvilinear grids require regridding. |
| Independent validation | Time/location/depth matching, unit checks, QC rejection and RMSE/bias/MAE | Bundled model/instrument dates do not overlap; no real-data accuracy claim is possible. |
| Exports | Selected field JSON, bounded NetCDF, displayed table CSV, browser print/PDF | Sampling is recorded; PDF uses the browser print dialog. |
| Open standards | REST/OpenAPI and scoped WMS/WCS endpoints; CF coordinate decoding | Full OGC schema/conformance certification remains incomplete; these are interoperability subsets. |
| Outreach | In-app Learn page and beginner README | Uses the same source-backed workflow. |
| Deployment | Local runner, container recipe, read-only Compose profile, CI workflow | Docker engine was not running here; container execution is unverified. CI was authored, not run remotely. |

## Verification

15 backend regression tests passed with explicit synthetic fixtures. They check bounded reads, source values and timestamps, masked cells, numeric instrument identifiers, pressure conversion, genuinely independent comparison, current alignment, output formats, authenticated ingestion, source adapters, CF coordinate aliases and satellite composite intervals.

Three frontend mathematical tests passed (colour transfer, analytic isosurface and physical vertical exaggeration), and the production build passed. Live archive API checks found five catalogued fields, two observation sources and no catalog errors. Browser inspection confirmed source-backed rendering, actual Argo and glider profiles, switching back from glider chlorophyll to Argo temperature, isosurface geometry, table records and satellite playback advancing to a different timestamp. The export regression also verifies that NetCDF retains satellite composite interval ends. Synthetic tests establish algorithm behaviour; they do not establish operational model accuracy.

## External completion gates

Operational acceptance needs an authorized feed endpoint and its access arrangements, matching multi-depth/multi-time model and instrument data, source QC definitions, target infrastructure, and an agreed standards conformance profile. These inputs cannot be inferred from the pasted problem statement. No public deployment, live hazard advisory, OGC certification or air-gap certification is claimed.

The obsolete demo screens and old data loader were removed from the working tree; their original tracked versions remain recoverable from Git. Original ocean datasets were preserved. The new MODIS subset includes a provenance sidecar and can be reproduced with the converter documented in README.
