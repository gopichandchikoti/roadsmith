import model from './content.model.json'

/** Every visible string outside the problem catalog. Components read text from here, never from a literal. */
export const content = model
export type Content = typeof model
