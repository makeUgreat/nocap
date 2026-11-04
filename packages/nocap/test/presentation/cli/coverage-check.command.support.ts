import { join } from 'node:path'
import { CoverageCheckUsecase } from '../../../src/application/coverage/coverage-check.usecase.js'
import { FileFsFinder } from '../../../src/infrastructure/filesystem/file.fs.finder.js'
import { FileFsReader } from '../../../src/infrastructure/filesystem/file.fs.reader.js'
import { SpecDocumentMarkdownParser } from '../../../src/infrastructure/markdown/spec-document.markdown.parser.js'
import { TestFileTypescriptParser } from '../../../src/infrastructure/typescript/test-file.typescript.parser.js'
import { CoverageCheckCommand } from '../../../src/presentation/cli/coverage-check.command.js'
import { CoverageCheckTextFormatter } from '../../../src/presentation/coverage-check.text.formatter.js'

export function fixtureDir(name: 'success' | 'failure' | 'edge'): string {
  return join(import.meta.dirname, 'fixtures', name)
}

export function commandFor(rootDir: string): CoverageCheckCommand {
  return new CoverageCheckCommand(
    new CoverageCheckUsecase(
      new FileFsFinder(rootDir),
      new FileFsReader(rootDir),
      new SpecDocumentMarkdownParser(),
      new TestFileTypescriptParser(),
    ),
    new CoverageCheckTextFormatter(),
  )
}
