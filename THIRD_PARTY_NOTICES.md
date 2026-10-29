# Third party notices

Roadsmith bundles or ships the following. Versions are those in `pnpm-lock.yaml`. Licence texts are in each package's folder
under `node_modules` and are reproduced by their authors' terms.

| Component | Version | Licence | Copyright | Used for |
|-----------|---------|---------|-----------|----------|
| React and React DOM | 19.3.1 | MIT | Copyright (c) Meta Platforms, Inc. and affiliates | the client |
| Express | 5.3.0 | MIT | Copyright (c) 2009-2014 TJ Holowaychuk, and later contributors | the server |
| compression | 1.8.2 | MIT | Copyright (c) 2014 Jonathan Ong, and later contributors | the server |
| Tabler Icons for React | 3.50.0 | MIT | Copyright (c) 2020-2026 Paweł Kuna | the icons in the app, and the path of the tool glyph in `public/favicon.svg` |
| Archivo (variable, via `@fontsource-variable/archivo`) | 5.3.0 | SIL Open Font License 1.1 | Copyright 2020 The Archivo Project Authors (https://github.com/Omnibus-Type/Archivo) | the only typeface, self-hosted as WOFF2 |

The Archivo font files are served unmodified from `/assets`. The SIL Open Font License 1.1 allows this use; the font is not sold
by itself. The licence text is in `node_modules/@fontsource-variable/archivo/LICENSE`.

Development tools (Vite, TypeScript, Biome, oxlint, tsx, jsdom, Testing Library, concurrently) do not ship in the built output.
