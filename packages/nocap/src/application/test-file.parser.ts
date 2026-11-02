import type { TestItem } from '../domain/test-item.js'

/** The whole file was read. */
export type TestFileParsed = {
  readonly kind: 'parsed'
  /** Test items in the order they appear in the file. Empty when the file has none. */
  readonly items: TestItem[]
}

/** The language of the file could not be determined from the extension of `fileName`. */
export type UnsupportedExtension = {
  readonly kind: 'unsupported-extension'
  /** The extension including the leading dot, for example `.py`. Empty when `fileName` has no extension. */
  readonly extension: string
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
  /** Error messages reported by the parser. Contains at least one message. */
  readonly messages: string[]
}

export type TestFileParseResult = TestFileParsed | UnsupportedExtension | TestFileSyntaxError

export interface TestFileParser {
  /**
   * Finds the test items in one test file.
   *
   * @param fileName - Name or path of the test file.
   * @param content - Full text of the test file.
   */
  parse(fileName: string, content: string): TestFileParseResult
}
