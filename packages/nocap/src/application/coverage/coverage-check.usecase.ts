import { Coverage } from '../../domain/coverage/coverage.js'
import { SpecDocument } from '../../domain/spec/spec-document.js'
import type { InvalidTag } from '../../domain/spec/invalid-tag.js'
import type { SpecItem } from '../../domain/spec/spec-item.js'
import { TestFile } from '../../domain/test/test-file.js'
import type { TestItem } from '../../domain/test/test-item.js'
import type { FileFinder } from '../file/file.finder.js'
import type { FileReader, FileReadResult } from '../file/file.reader.js'
import type { SpecDocumentParser } from '../spec/spec-document.parser.js'
import type { TestFileParser } from '../test/test-file.parser.js'
import { isNonEmpty } from '../../lib/array-length.js'
import type { CoverageCheckResult, FileError, UnmatchedPattern } from './coverage-check.result.js'

/** Glob patterns of the spec documents and of the test files. */
export type CoverageCheckInput = {
  readonly specPatterns: readonly [string, ...string[]]
  readonly testPatterns: readonly [string, ...string[]]
}

type ReadAttempt = { readonly path: string; readonly result: FileReadResult }
type FoundFiles = { readonly paths: readonly string[]; readonly unmatchedPatterns: readonly string[] }
type FileOutcome<T> = { readonly kind: 'parsed'; readonly items: readonly T[]; readonly invalidTags: readonly InvalidTag[] } | FileError
type ParsedFiles<T> = { readonly items: T[]; readonly invalidTags: InvalidTag[]; readonly fileErrors: FileError[] }

export class CoverageCheckUsecase {
  constructor(
    private readonly fileFinder: FileFinder,
    private readonly fileReader: FileReader,
    private readonly specDocumentParser: SpecDocumentParser,
    private readonly testFileParser: TestFileParser,
  ) {}

  async run(input: CoverageCheckInput): Promise<CoverageCheckResult> {
    const [specPaths, testPaths] = await Promise.all([this.findFiles(input.specPatterns), this.findFiles(input.testPatterns)])
    const unmatchedPatterns: UnmatchedPattern[] = [
      ...specPaths.unmatchedPatterns.map((pattern) => ({ side: 'spec' as const, pattern })),
      ...testPaths.unmatchedPatterns.map((pattern) => ({ side: 'test' as const, pattern })),
    ]
    if (isNonEmpty(unmatchedPatterns)) {
      return { kind: 'unmatched-patterns', patterns: unmatchedPatterns }
    }

    const [specFiles, testFiles] = await Promise.all([this.readFiles(specPaths.paths), this.readFiles(testPaths.paths)])
    const specs = collect(specFiles, (path, content) => this.parseSpecDocument(path, content))
    const tests = collect(testFiles, (path, content) => this.parseTestFile(path, content))
    return {
      kind: 'checked',
      coverage: Coverage.of({ specItems: specs.items, testItems: tests.items }),
      invalidTags: [...specs.invalidTags, ...tests.invalidTags],
      fileErrors: [...specs.fileErrors, ...tests.fileErrors],
    }
  }

  private async findFiles(patterns: readonly [string, ...string[]]): Promise<FoundFiles> {
    const uniquePatterns = [...new Set(patterns)]
    const found = await Promise.all(uniquePatterns.map(async (pattern) => ({ pattern, paths: await this.fileFinder.find(pattern) })))
    const unmatchedPatterns = found.filter(({ paths }) => paths.length === 0).map(({ pattern }) => pattern)
    const uniquePaths = [...new Set(found.flatMap(({ paths }) => paths))]
    return { paths: uniquePaths.sort(), unmatchedPatterns }
  }

  private async readFiles(pathsInCodeUnitOrder: readonly string[]): Promise<ReadAttempt[]> {
    return Promise.all(pathsInCodeUnitOrder.map(async (path) => ({ path, result: await this.fileReader.read(path) })))
  }

  private parseSpecDocument(path: string, content: string): FileOutcome<SpecItem> {
    const { comments } = this.specDocumentParser.parse(content)
    const document = SpecDocument.of(path, comments)
    return { kind: 'parsed', items: document.specItems, invalidTags: document.invalidTags }
  }

  private parseTestFile(path: string, content: string): FileOutcome<TestItem> {
    const result = this.testFileParser.parse(path, content)
    switch (result.kind) {
      case 'parsed': {
        const testFile = TestFile.of(path, result.comments, result.testUnits)
        return { kind: 'parsed', items: testFile.testItems, invalidTags: testFile.invalidTags }
      }
      case 'unsupported-extension':
        return { kind: 'unsupported-extension', path, extension: result.extension, supportedExtensions: result.supportedExtensions }
      case 'syntax-error':
        return { kind: 'syntax-error', path, messages: result.messages }
    }
  }
}

function collect<T>(files: readonly ReadAttempt[], parse: (path: string, content: string) => FileOutcome<T>): ParsedFiles<T> {
  const collected: ParsedFiles<T> = { items: [], invalidTags: [], fileErrors: [] }
  for (const { path, result } of files) {
    const outcome: FileOutcome<T> =
      result.kind === 'read-error' ? { kind: 'read-error', path, message: result.message } : parse(path, result.content)
    if (outcome.kind === 'parsed') {
      collected.items.push(...outcome.items)
      collected.invalidTags.push(...outcome.invalidTags)
    } else {
      collected.fileErrors.push(outcome)
    }
  }
  return collected
}
