/**
 * A test that a test framework runs, such as an `it()` call.
 *
 * @remarks
 * The adapter of each language decides what a test unit is.
 * `line` is the 1-based line where the test unit starts, including its annotations or decorators.
 * `endLine` is the 1-based line where the test unit ends.
 */
export type TestUnit = {
  readonly line: number
  readonly endLine: number
}
