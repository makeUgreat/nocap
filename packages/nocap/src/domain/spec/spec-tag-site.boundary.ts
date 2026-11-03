import type { TagSite } from '../shared/tag-site.boundary.js'

/** The tag site of a list item. `text` is the spec sentence of the list item. */
export type SpecTagSite = TagSite & { readonly text: string }
