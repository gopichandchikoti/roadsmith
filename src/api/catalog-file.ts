import type { Catalog } from '../@types/catalog'
import raw from '../catalog.model.json'
import { parseCatalog } from '../validators/catalog'

/**
 * The bundled catalog, checked. This file is the lazy chunk: the JSON and the code that checks it are downloaded together,
 * and only when a screen needs the problems, so neither is part of the first load. A file that is not shaped as expected
 * throws here, which the loader reports as a failed load, never as a half-drawn screen.
 */
export const bundledCatalog: Catalog = parseCatalog(raw)
