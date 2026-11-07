import { join } from 'node:path'
import { checkCoverage } from '../../../src/index.js'
import { CoverageCheckCommand } from '../../../src/presentation/cli/coverage-check.command.js'
import { CoverageCheckTextFormatter } from '../../../src/presentation/cli/coverage-check.text.formatter.js'

export function fixtureDir(name: 'success' | 'failure' | 'edge'): string {
  return join(import.meta.dirname, 'fixtures', name)
}

export function commandFor(rootDir: string): CoverageCheckCommand {
  return new CoverageCheckCommand((input) => checkCoverage({ ...input, cwd: rootDir }), new CoverageCheckTextFormatter())
}
