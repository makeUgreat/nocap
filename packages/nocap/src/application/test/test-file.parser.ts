import type { TestComment } from '../../domain/test/test-comment.boundary.js'
import type { TestUnit } from '../../domain/test/test-unit.boundary.js'

/**
 * The whole file was read.
 *
 * @remarks
 * `comments` holds every comment in source order. Comments in strings are not included.
 * `testUnits` is in line order and is empty when the file has none. No two test units start on the same line.
 */
export type TestFileParsed = {
  readonly kind: 'parsed'
  readonly comments: readonly TestComment[]
  readonly testUnits: readonly TestUnit[]
}

/**
 * The language of the file could not be determined from the extension of `path`.
 *
 * @remarks
 * Extensions include the leading dot, for example `.py`.
 * `extension` is empty when `path` has no extension.
 */
export type UnsupportedExtension = {
  readonly kind: 'unsupported-extension'
  readonly extension: string
  readonly supportedExtensions: readonly [string, ...string[]]
}

/**
 * The file has a syntax error.
 *
 * @remarks
 * A test runner cannot load such a file either, so none of its tests run.
 * For that reason no test items are returned, even when part of the file could be read.
 * `messages` are the error messages of the parser.
 */
export type TestFileSyntaxError = {
  readonly kind: 'syntax-error'
  readonly messages: readonly [string, ...string[]]
}

export type TestFileParseResult = TestFileParsed | UnsupportedExtension | TestFileSyntaxError

export interface TestFileParser {
  /**
   * Finds the comments and the test units of one test file.
   *
   * @param path - Path of the test file. Its extension selects the language.
   * @param content - Full text of the test file.
   */
  parse(path: string, content: string): TestFileParseResult
}
