import { inspect, parseArgs } from 'node:util'
import type { CheckedCoverage, CoverageCheckInput, CoverageCheckResult, UnmatchedPatterns } from '../library/coverage-check.public.js'
import type { CoverageCheckTextFormatter } from './coverage-check.text.formatter.js'
import { isNonEmpty } from '../../lib/array-length.js'

const USAGE = 'Usage: nocap --spec <glob> [--spec <glob> ...] --test <glob> [--test <glob> ...]'

export type CommandOutput = {
  readonly stdout: string
  readonly stderr: string
  readonly exitCode: 0 | 1 | 2
}

type CheckCoverage = (input: CoverageCheckInput) => Promise<CoverageCheckResult>
type ParsedArgs =
  | { readonly kind: 'parsed'; readonly input: CoverageCheckInput }
  | { readonly kind: 'usage-error'; readonly message: string }

export class CoverageCheckCommand {
  constructor(
    private readonly checkCoverage: CheckCoverage,
    private readonly formatter: CoverageCheckTextFormatter,
  ) {}

  async run(args: readonly string[]): Promise<CommandOutput> {
    const parsed = this.parse(args)
    if (parsed.kind === 'usage-error') return { stdout: '', stderr: `nocap: ${parsed.message}\n${USAGE}\n`, exitCode: 2 }

    try {
      const result = await this.checkCoverage(parsed.input)
      if (result.kind === 'unmatched-patterns') return { stdout: '', stderr: unmatchedPatternsMessage(result), exitCode: 2 }
      return { ...this.formatter.format(result), exitCode: hasProblems(result) ? 1 : 0 }
    } catch (error) {
      return { stdout: '', stderr: internalErrorMessage(error), exitCode: 2 }
    }
  }

  private parse(args: readonly string[]): ParsedArgs {
    try {
      const { values } = parseArgs({
        args: [...args],
        options: { spec: { type: 'string', multiple: true }, test: { type: 'string', multiple: true } },
        strict: true,
        allowPositionals: false,
      })
      if (!isNonEmpty(values.spec)) return { kind: 'usage-error', message: 'missing --spec' }
      if (!isNonEmpty(values.test)) return { kind: 'usage-error', message: 'missing --test' }
      return { kind: 'parsed', input: { spec: values.spec, test: values.test } }
    } catch (error) {
      return { kind: 'usage-error', message: error instanceof Error ? error.message : String(error) }
    }
  }
}

function hasProblems(result: CheckedCoverage): boolean {
  return result.coverageProblems.length > 0 || result.invalidTags.length > 0 || result.fileErrors.length > 0
}

const OPTION_OF_SIDE = { spec: '--spec', test: '--test' } as const

function unmatchedPatternsMessage({ patterns }: UnmatchedPatterns): string {
  return patterns.map(({ side, pattern }) => `nocap: no files match ${OPTION_OF_SIDE[side]} ${JSON.stringify(pattern)}\n`).join('')
}

function internalErrorMessage(error: unknown): string {
  const detail = error instanceof Error ? `${error.message}\n${inspect(error)}` : inspect(error)
  return `nocap: internal error: ${detail}\n`
}
