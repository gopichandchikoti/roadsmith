import model from './help.model.json'

/**
 * The words of the Help screen and the summary a driver reads out. They live apart from `content` because only screens that are
 * loaded on demand use them, so they stay out of the first load (design record 3.1).
 */
export const help = model
export type HelpContent = typeof model
