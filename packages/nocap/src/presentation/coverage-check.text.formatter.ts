import type {
  CoverageCheckResult,
  CoverageProblem,
  FileError,
  InvalidIdCandidate,
  InvalidTag,
  Location,
} from '../application/coverage/coverage-check.result.js'

export type ColorSupport = { readonly stdout: boolean; readonly stderr: boolean }
export type FormattedOutput = { readonly stdout: string; readonly stderr: string }

const DIAGNOSTIC_KINDS = [
  'uncovered-spec',
  'unknown-id',
  'duplicate-id',
  'invalid-id',
  'missing-id',
  'multiple-ids',
  'read-error',
  'unsupported-extension',
  'syntax-error',
] as const
type DiagnosticKind = (typeof DIAGNOSTIC_KINDS)[number]

type Segment = { readonly text: string; readonly isValue: boolean }
type Diagnostic = {
  readonly path: string
  readonly line: number | undefined
  readonly kind: DiagnosticKind
  readonly message: readonly Segment[]
  readonly hint: string | undefined
}

const ANSI = { bold: '1', dim: '2', red: '31', green: '32', yellow: '33', cyan: '36' } as const
const ID_CHARS_HINT = 'use only A-Z, a-z, 0-9, "-", "_"'

export class CoverageCheckTextFormatter {
  constructor(private readonly colors: ColorSupport = { stdout: false, stderr: false }) {}

  format(result: CoverageCheckResult): FormattedOutput {
    const diagnostics = inReportOrder([
      ...result.coverageProblems.flatMap((problem) => coverageProblemDiagnostics(problem)),
      ...result.invalidTags.flatMap((invalidTag) => invalidTagDiagnostics(invalidTag)),
      ...result.fileErrors.flatMap((fileError) => fileErrorDiagnostics(fileError)),
    ])
    return { stdout: this.stdoutOf(diagnostics), stderr: this.stderrOf(diagnostics, result) }
  }

  private stdoutOf(diagnostics: readonly Diagnostic[]): string {
    const paint = painter(this.colors.stdout)
    return diagnostics
      .map((diagnostic, index) => {
        const samePathAsPrevious = index > 0 && diagnostics[index - 1]?.path === diagnostic.path
        const location =
          paint(samePathAsPrevious ? [ANSI.dim] : [ANSI.cyan], diagnostic.path) +
          (diagnostic.line === undefined ? '' : `:${paint([ANSI.bold], String(diagnostic.line))}`)
        const message = diagnostic.message.map((segment) => (segment.isValue ? paint([ANSI.yellow], segment.text) : segment.text)).join('')
        const hint = diagnostic.hint === undefined ? '' : paint([ANSI.dim], `; hint: ${diagnostic.hint}`)
        return `${location}: ${paint([ANSI.red, ANSI.bold], 'error')}${paint([ANSI.red], `[${diagnostic.kind}]`)}: ${message}${hint}\n`
      })
      .join('')
  }

  private stderrOf(diagnostics: readonly Diagnostic[], result: CoverageCheckResult): string {
    const paint = painter(this.colors.stderr)
    const coverageLine = paint(
      [result.isFullyCovered() ? ANSI.green : ANSI.yellow],
      `${result.coveredSpecCount} of ${result.specCount} specs covered`,
    )
    if (diagnostics.length === 0) return `${coverageLine}\n`
    return `${paint([ANSI.red, ANSI.bold], errorsLineOf(diagnostics))}\n${coverageLine}\n`
  }
}

function coverageProblemDiagnostics(problem: CoverageProblem): Diagnostic[] {
  switch (problem.kind) {
    case 'uncovered-spec': {
      const text = singleLine(problem.text)
      const message = [value(problem.id), plain(' has no test'), ...(text === '' ? [] : [plain(`: ${text}`)])]
      return [diagnosticAt(problem.location, 'uncovered-spec', message)]
    }
    case 'unknown-id':
      return problem.testLocations.map((location) =>
        diagnosticAt(location, 'unknown-id', [value(problem.id), plain(' is not defined in any spec')]),
      )
    case 'duplicate-id':
      return problem.specLocations.map((location, index) => {
        const others = problem.specLocations.filter((_, otherIndex) => otherIndex !== index).map(locationText)
        return diagnosticAt(location, 'duplicate-id', [value(problem.id), plain(` is also defined at ${others.join(', ')}`)])
      })
  }
}

function invalidTagDiagnostics(invalidTag: InvalidTag): Diagnostic[] {
  switch (invalidTag.kind) {
    case 'id-rule-violation':
      return invalidTag.invalidCandidates.map((invalidCandidate) => invalidIdDiagnostic(invalidTag.location, invalidCandidate))
    case 'missing-id':
      return [diagnosticAt(invalidTag.location, 'missing-id', [plain('missing id in the tag')], 'write an id, e.g. "nocap: AUTH-001"')]
    case 'multiple-ids': {
      const ids = invalidTag.ids.flatMap((id, index) => (index === 0 ? [value(id)] : [plain(', '), value(id)]))
      const message = [plain(`spec tag has ${invalidTag.ids.length} ids `), ...ids]
      return [diagnosticAt(invalidTag.location, 'multiple-ids', message, 'a spec item takes 1 id')]
    }
  }
}

function invalidIdDiagnostic(location: Location, invalidCandidate: InvalidIdCandidate): Diagnostic {
  switch (invalidCandidate.kind) {
    case 'invalid-whitespace':
      return diagnosticAt(location, 'invalid-id', [value(invalidCandidate.value), plain(' has a space')], 'separate ids with ","')
    case 'invalid-char':
      return diagnosticAt(
        location,
        'invalid-id',
        [value(invalidCandidate.value), plain(' has '), value(invalidCandidate.firstInvalidChar)],
        ID_CHARS_HINT,
      )
  }
}

function fileErrorDiagnostics(fileError: FileError): Diagnostic[] {
  switch (fileError.kind) {
    case 'read-error':
      return [diagnosticOfFile(fileError.path, 'read-error', [plain(`cannot read file: ${singleLine(fileError.message)}`)])]
    case 'unsupported-extension':
      return [
        diagnosticOfFile(
          fileError.path,
          'unsupported-extension',
          [value(fileError.extension), plain(' is not a supported test file extension')],
          `use ${choicesOf(fileError.supportedExtensions)}`,
        ),
      ]
    case 'syntax-error':
      return fileError.messages.map((message) => diagnosticOfFile(fileError.path, 'syntax-error', [plain(singleLine(message))]))
  }
}

function errorsLineOf(diagnostics: readonly Diagnostic[]): string {
  const fileCount = new Set(diagnostics.map((diagnostic) => diagnostic.path)).size
  const kindCounts = DIAGNOSTIC_KINDS.map((kind) => ({
    kind,
    count: diagnostics.filter((diagnostic) => diagnostic.kind === kind).length,
  }))
    .filter(({ count }) => count > 0)
    .map(({ kind, count }) => `${count} ${kind}`)
  return `${countOf(diagnostics.length, 'error')} in ${countOf(fileCount, 'file')}: ${kindCounts.join(', ')}`
}

function diagnosticAt(location: Location, kind: DiagnosticKind, message: Segment[], hint?: string): Diagnostic {
  return { path: location.path, line: location.line, kind, message, hint }
}

function diagnosticOfFile(path: string, kind: DiagnosticKind, message: Segment[], hint?: string): Diagnostic {
  return { path, line: undefined, kind, message, hint }
}

function inReportOrder(diagnostics: Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort((a, b) => {
    if (a.path !== b.path) return a.path < b.path ? -1 : 1
    return (a.line ?? 0) - (b.line ?? 0)
  })
}

function value(text: string): Segment {
  return { text: JSON.stringify(text), isValue: true }
}

function plain(text: string): Segment {
  return { text, isValue: false }
}

function singleLine(text: string): string {
  return text.replace(/\r\n|\r|\n/g, ' ')
}

function locationText(location: Location): string {
  return `${location.path}:${location.line}`
}

function countOf(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

function painter(enabled: boolean): (codes: string[], text: string) => string {
  return (codes, text) => (enabled ? `\u001b[${codes.join(';')}m${text}\u001b[0m` : text)
}

function choicesOf([first, ...rest]: readonly [string, ...string[]]): string {
  const last = rest.at(-1)
  if (last === undefined) return first
  return `${[first, ...rest.slice(0, -1)].join(', ')} or ${last}`
}
