import type {
  CheckedCoverage,
  CoverageProblem,
  FileError,
  InvalidIdCandidate,
  InvalidTag,
  Location,
} from '../library/coverage-check.public.js'

export type ColorSupport = { readonly stdout: boolean; readonly stderr: boolean }
export type FormattedOutput = { readonly stdout: string; readonly stderr: string }

const DIAGNOSTIC_KINDS = [
  'uncovered-spec',
  'unknown-id',
  'duplicate-id',
  'missing-id',
  'multiple-ids',
  'invalid-id',
  'block-comment',
  'no-sentence',
  'not-at-item-end',
  'outside-list-item',
  'after-code',
  'not-above-test-call',
  'repeated-id',
  'read-error',
  'unsupported-extension',
  'syntax-error',
] as const
type DiagnosticKind = (typeof DIAGNOSTIC_KINDS)[number]

type Paint = (codes: string[], text: string) => string
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
const ONE_ID_HINT = 'a tag takes 1 id; write one tag per id'
const FIXED_MESSAGES = {
  'missing-id': { message: 'missing id in the tag', hint: 'write an id, e.g. "nocap: AUTH-001"' },
  'block-comment': { message: 'test tag is in a block comment', hint: 'use a "//" line comment' },
  'no-sentence': { message: 'spec tag has no spec sentence before it', hint: 'write the spec sentence before the tag' },
  'not-at-item-end': {
    message: 'spec tag is not at the end of the first paragraph of a list item',
    hint: 'put the tag at the end of the first paragraph of the list item',
  },
  'outside-list-item': { message: 'spec tag is not in a list item', hint: 'put the tag at the end of a list item' },
  'after-code': { message: 'test tag is on the same line as code', hint: 'put the tag on its own line above the test call' },
  'not-above-test-call': {
    message: 'test tag is not above a test call',
    hint: 'put the tag right above the test call, with no blank line between',
  },
} as const satisfies Partial<Record<DiagnosticKind, { readonly message: string; readonly hint: string }>>

export class CoverageCheckTextFormatter {
  constructor(private readonly colors: ColorSupport = { stdout: false, stderr: false }) {}

  format(result: CheckedCoverage): FormattedOutput {
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
      .map((diagnostic, index) => diagnosticLine(diagnostic, index > 0 && diagnostics[index - 1]?.path === diagnostic.path, paint))
      .join('')
  }

  private stderrOf(diagnostics: readonly Diagnostic[], result: CheckedCoverage): string {
    const paint = painter(this.colors.stderr)
    const coverageLine = paint(
      [result.coveredSpecCount === result.specCount ? ANSI.green : ANSI.yellow],
      `${result.coveredSpecCount} of ${result.specCount} specs covered`,
    )
    if (diagnostics.length === 0) return `${coverageLine}\n`
    return `${paint([ANSI.red, ANSI.bold], errorsLineOf(diagnostics))}\n${coverageLine}\n`
  }
}

function diagnosticLine(diagnostic: Diagnostic, samePathAsPrevious: boolean, paint: Paint): string {
  const path = paint(samePathAsPrevious ? [ANSI.dim] : [ANSI.cyan], diagnostic.path)
  const line = diagnostic.line === undefined ? '' : `:${paint([ANSI.bold], String(diagnostic.line))}`
  const severity = paint([ANSI.red, ANSI.bold], 'error') + paint([ANSI.red], `[${diagnostic.kind}]`)
  const message = diagnostic.message.map((segment) => (segment.isValue ? paint([ANSI.yellow], segment.text) : segment.text)).join('')
  const hint = diagnostic.hint === undefined ? '' : paint([ANSI.dim], `; hint: ${diagnostic.hint}`)
  return `${path}${line}: ${severity}: ${message}${hint}\n`
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
  const { location } = invalidTag
  switch (invalidTag.kind) {
    case 'multiple-ids': {
      const values = invalidTag.values.flatMap((id, index) => (index === 0 ? [value(id)] : [plain(', '), value(id)]))
      const message = [plain(`tag has ${invalidTag.values.length} ids `), ...values]
      return [diagnosticAt(location, 'multiple-ids', message, ONE_ID_HINT)]
    }
    case 'id-rule-violation':
      return [invalidIdDiagnostic(location, invalidTag.invalidCandidate)]
    case 'missing-id':
    case 'block-comment':
    case 'no-sentence':
    case 'not-at-item-end':
    case 'outside-list-item':
    case 'after-code':
    case 'not-above-test-call': {
      const { message, hint } = FIXED_MESSAGES[invalidTag.kind]
      return [diagnosticAt(location, invalidTag.kind, [plain(message)], hint)]
    }
    case 'repeated-id':
      return [diagnosticAt(location, 'repeated-id', [value(invalidTag.id), plain(` is already tagged at line ${invalidTag.firstTagLine}`)])]
  }
}

function invalidIdDiagnostic(location: Location, invalidCandidate: InvalidIdCandidate): Diagnostic {
  switch (invalidCandidate.kind) {
    case 'invalid-whitespace':
      return diagnosticAt(location, 'invalid-id', [value(invalidCandidate.value), plain(' has a space')], ONE_ID_HINT)
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

function painter(enabled: boolean): Paint {
  return (codes, text) => (enabled ? `\u001b[${codes.join(';')}m${text}\u001b[0m` : text)
}

function choicesOf([first, ...rest]: readonly [string, ...string[]]): string {
  const last = rest.at(-1)
  if (last === undefined) return first
  return `${[first, ...rest.slice(0, -1)].join(', ')} or ${last}`
}
