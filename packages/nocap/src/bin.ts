#!/usr/bin/env node
import { CoverageCheckUsecase } from './application/coverage/coverage-check.usecase.js'
import { FileFsFinder } from './infrastructure/filesystem/file.fs.finder.js'
import { FileFsReader } from './infrastructure/filesystem/file.fs.reader.js'
import { SpecDocumentMarkdownParser } from './infrastructure/markdown/spec-document.markdown.parser.js'
import { TestFileTypescriptParser } from './infrastructure/typescript/test-file.typescript.parser.js'
import { CoverageCheckCommand } from './presentation/cli/coverage-check.command.js'
import { CoverageCheckTextFormatter } from './presentation/coverage-check.text.formatter.js'

function hasColors(stream: NodeJS.WriteStream): boolean {
  if (stream.isTTY) return stream.hasColors()
  const forceColor = process.env['FORCE_COLOR']
  return forceColor !== undefined && forceColor !== '0' && forceColor !== 'false'
}

const rootDir = process.cwd()
const command = new CoverageCheckCommand(
  new CoverageCheckUsecase(
    new FileFsFinder(rootDir),
    new FileFsReader(rootDir),
    new SpecDocumentMarkdownParser(),
    new TestFileTypescriptParser(),
  ),
  new CoverageCheckTextFormatter({ stdout: hasColors(process.stdout), stderr: hasColors(process.stderr) }),
)

const output = await command.run(process.argv.slice(2))
process.stdout.write(output.stdout)
process.stderr.write(output.stderr)
process.exitCode = output.exitCode
