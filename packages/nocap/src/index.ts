import { CoverageCheckUsecase } from './application/coverage/coverage-check.usecase.js'
import { FileFsFinder } from './infrastructure/filesystem/file.fs.finder.js'
import { FileFsReader } from './infrastructure/filesystem/file.fs.reader.js'
import { SpecDocumentMarkdownParser } from './infrastructure/markdown/spec-document.markdown.parser.js'
import { TestFileTypescriptParser } from './infrastructure/typescript/test-file.typescript.parser.js'
import { CoverageCheckApi } from './presentation/library/coverage-check.api.js'
import type { CoverageCheckInput, CoverageCheckResult } from './presentation/library/coverage-check.public.js'

export type {
  CheckedCoverage,
  CoverageCheckInput,
  CoverageCheckResult,
  CoverageProblem,
  FileError,
  FormInvalidTag,
  InvalidIdCandidate,
  InvalidTag,
  Location,
  PositionInvalidTag,
  SpecItem,
  TestItem,
  UnmatchedPattern,
  UnmatchedPatterns,
  VocabularyInvalidTag,
} from './presentation/library/coverage-check.public.js'

const api = new CoverageCheckApi(
  (cwd) =>
    new CoverageCheckUsecase(
      new FileFsFinder(cwd),
      new FileFsReader(cwd),
      new SpecDocumentMarkdownParser(),
      new TestFileTypescriptParser(),
    ),
)

/**
 * Finds the spec documents and the test files, links spec items to test items by id, and returns the result.
 *
 * @remarks
 * It writes nothing to stdout or stderr.
 * It throws a `TypeError` when `spec` or `test` is not an array of one or more strings, or when `cwd` is given and is not a string.
 * Any other unexpected error is thrown to the caller as it is.
 *
 * @example
 * ```ts
 * const result = await checkCoverage({ spec: ['docs/**\/*.md'], test: ['src/**\/*.test.ts'] })
 * if (result.kind === 'checked') {
 *   const covered = result.specItems.filter((specItem) => specItem.status === 'covered')
 * }
 * ```
 */
export function checkCoverage(input: CoverageCheckInput): Promise<CoverageCheckResult> {
  return api.run(input)
}
