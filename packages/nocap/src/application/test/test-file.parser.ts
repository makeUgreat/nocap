import type { TagSite } from '../../domain/shared/tag-site.boundary.js'

/** The whole file was read. */
export type TestFileParsed = {
  readonly kind: 'parsed'
  /** The tag sites of the test calls in the order they appear in the file. Empty when the file has none. */
  readonly sites: readonly TagSite[]
}

/** The language of the file could not be determined from the extension of `path`. */
export type UnsupportedExtension = {
  readonly kind: 'unsupported-extension'
  /** The extension including the leading dot, for example `.py`. Empty when `path` has no extension. */
  readonly extension: string
  /** The extensions the parser supports, including the leading dot, for example `.ts`. */
  readonly supportedExtensions: readonly [string, ...string[]]
}

/**
 * The file has a syntax error.
 *
 * @remarks
 * A test runner cannot load such a file either, so none of its tests run.
 * For that reason no test items are returned, even when part of the file could be read.
 */
export type TestFileSyntaxError = {
  readonly kind: 'syntax-error'
  /** Error messages reported by the parser. */
  readonly messages: readonly [string, ...string[]]
}

export type TestFileParseResult = TestFileParsed | UnsupportedExtension | TestFileSyntaxError

export interface TestFileParser {
  /**
   * Finds the tag sites of the test calls in one test file.
   *
   * @param path - Path of the test file. Its extension selects the language.
   * @param content - Full text of the test file.
   */
  parse(path: string, content: string): TestFileParseResult
}
