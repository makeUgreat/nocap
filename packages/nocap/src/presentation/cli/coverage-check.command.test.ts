import { describe, expect, it } from 'vitest'
import { CoverageCheckResult, type UnmatchedPatterns } from '../../application/coverage/coverage-check.result.js'
import type { CoverageCheckInput } from '../../application/coverage/coverage-check.usecase.js'
import { CoverageCheckTextFormatter } from '../coverage-check.text.formatter.js'
import { CoverageCheckCommand } from './coverage-check.command.js'

const resultOf = (data: Partial<Parameters<typeof CoverageCheckResult.of>[0]>) =>
  CoverageCheckResult.of({ specCount: 0, coveredSpecCount: 0, coverageProblems: [], invalidTags: [], fileErrors: [], ...data })
const EMPTY_RESULT = resultOf({})

const commandReturning = (result: CoverageCheckResult | UnmatchedPatterns) => {
  const inputs: CoverageCheckInput[] = []
  const coverageCheck = {
    run: async (input: CoverageCheckInput) => {
      inputs.push(input)
      return result
    },
  }
  return { command: new CoverageCheckCommand(coverageCheck, new CoverageCheckTextFormatter()), inputs }
}

// nocap: CLI-001
describe('--spec과 --test로 받은 패턴으로 파일을 찾음', () => {
  it('--spec과 --test를 여러 번 쓰면 쓴 순서대로 패턴 목록으로 넘긴다', async () => {
    const { command, inputs } = commandReturning(EMPTY_RESULT)

    await command.run(['--spec', 'docs/*.md', '--test', 'a/*.test.ts', '--spec', 'specs/*.md', '--test', 'b/*.test.ts'])

    expect(inputs).toEqual([{ specPatterns: ['docs/*.md', 'specs/*.md'], testPatterns: ['a/*.test.ts', 'b/*.test.ts'] }])
  })
})

// nocap: CLI-003
describe('--spec이나 --test가 없으면 사용법을 쓰고 종료 코드 2', () => {
  it('--spec이 없으면 stderr에 사용법을 쓰고 종료 코드 2를 반환한다', async () => {
    const { command } = commandReturning(EMPTY_RESULT)

    const output = await command.run(['--test', 'a.test.ts'])

    expect([output.exitCode, output.stderr]).toEqual([2, expect.stringContaining('missing --spec')])
  })

  it('--test가 없으면 stderr에 사용법을 쓰고 종료 코드 2를 반환한다', async () => {
    const { command } = commandReturning(EMPTY_RESULT)

    const output = await command.run(['--spec', 'a.md'])

    expect([output.exitCode, output.stderr]).toEqual([2, expect.stringContaining('missing --test')])
  })

  it('사용법 오류이면 검사를 실행하지 않는다', async () => {
    const { command, inputs } = commandReturning(EMPTY_RESULT)

    await command.run([])

    expect(inputs).toEqual([])
  })
})

// nocap: CLI-004
describe('알 수 없는 옵션이나 위치 인자가 있으면 사용법을 쓰고 종료 코드 2', () => {
  it('알 수 없는 옵션이 있으면 종료 코드 2를 반환한다', async () => {
    const { command } = commandReturning(EMPTY_RESULT)

    expect((await command.run(['--spec', 'a.md', '--test', 'b.ts', '--verbose'])).exitCode).toBe(2)
  })

  it('위치 인자가 있으면 종료 코드 2를 반환한다', async () => {
    const { command } = commandReturning(EMPTY_RESULT)

    expect((await command.run(['--spec', 'a.md', '--test', 'b.ts', 'extra'])).exitCode).toBe(2)
  })
})

// nocap: CLI-012
describe('문제가 없으면 종료 코드 0, 하나라도 있으면 1', () => {
  const args = ['--spec', 'a.md', '--test', 'a.test.ts']

  it('문제가 하나도 없으면 종료 코드 0을 반환한다', async () => {
    expect((await commandReturning(EMPTY_RESULT).command.run(args)).exitCode).toBe(0)
  })

  it('커버되지 않은 명세 항목이 있으면 종료 코드 1을 반환한다', async () => {
    const result = resultOf({
      specCount: 1,
      coverageProblems: [{ kind: 'uncovered-spec', id: 'A-001', location: { path: 'a.md', line: 1 }, text: '' }],
    })

    expect((await commandReturning(result).command.run(args)).exitCode).toBe(1)
  })

  it('틀린 태그만 있어도 종료 코드 1을 반환한다', async () => {
    const result = resultOf({
      invalidTags: [
        {
          kind: 'id-rule-violation',
          location: { path: 'a.md', line: 1 },
          invalidCandidate: { kind: 'invalid-char', value: 'A.1', firstInvalidChar: '.' },
        },
      ],
    })

    expect((await commandReturning(result).command.run(args)).exitCode).toBe(1)
  })

  it('파일 오류만 있어도 종료 코드 1을 반환한다', async () => {
    const result = resultOf({ fileErrors: [{ kind: 'read-error', path: 'a.md', message: 'x' }] })

    expect((await commandReturning(result).command.run(args)).exitCode).toBe(1)
  })
})

// nocap: CLI-024
describe('파일을 찾지 못한 패턴이 있으면 패턴마다 1줄을 쓰고 종료 코드 2', () => {
  const args = ['--spec', 'a.md', '--test', 'a.test.ts']
  const unmatched: UnmatchedPatterns = {
    kind: 'unmatched-patterns',
    patterns: [
      { side: 'spec', pattern: 'dcos/*.md' },
      { side: 'spec', pattern: 'say "hi".md' },
      { side: 'test', pattern: 'tset/*.ts' },
    ],
  }

  it('파일을 찾지 못한 패턴이 있으면 종료 코드 2를 반환한다', async () => {
    expect((await commandReturning(unmatched).command.run(args)).exitCode).toBe(2)
  })

  it('파일을 찾지 못한 패턴이 있으면 stdout에 진단을 쓰지 않는다', async () => {
    expect((await commandReturning(unmatched).command.run(args)).stdout).toBe('')
  })

  it('파일을 찾지 못한 패턴이 있으면 stderr에 받은 순서대로 패턴마다 1줄을 쓰고 요약은 쓰지 않는다', async () => {
    const output = await commandReturning(unmatched).command.run(args)

    expect(output.stderr).toBe(
      [
        'nocap: no files match --spec "dcos/*.md"',
        'nocap: no files match --spec "say \\"hi\\".md"',
        'nocap: no files match --test "tset/*.ts"',
        '',
      ].join('\n'),
    )
  })
})

const commandThrowing = (error: unknown) =>
  new CoverageCheckCommand(
    {
      run: async () => {
        throw error
      },
    },
    new CoverageCheckTextFormatter(),
  )

// nocap: CLI-023
describe('예상하지 못한 오류가 나면 stderr에 오류와 stack trace를 쓰고 종료 코드 2', () => {
  const args = ['--spec', 'a.md', '--test', 'a.test.ts']

  it('검사 중 예외가 나면 종료 코드 2를 반환한다', async () => {
    expect((await commandThrowing(new Error('boom')).run(args)).exitCode).toBe(2)
  })

  it('검사 중 예외가 나면 stdout에 아무것도 쓰지 않는다', async () => {
    expect((await commandThrowing(new Error('boom')).run(args)).stdout).toBe('')
  })

  it('검사 중 예외가 나면 stderr에 오류 메시지와 stack trace를 쓴다', async () => {
    const error = new Error('boom')

    const output = await commandThrowing(error).run(args)

    expect(output.stderr).toBe(`nocap: internal error: boom\n${error.stack}\n`)
  })
})

describe('내부 오류의 상세 출력', () => {
  const args = ['--spec', 'a.md', '--test', 'a.test.ts']

  it('원인이 연결된 오류이면 stderr에 원인 오류도 쓴다', async () => {
    const error = new Error('boom', { cause: new Error('disk gone') })

    const output = await commandThrowing(error).run(args)

    expect(output.stderr).toContain('[cause]: Error: disk gone')
  })

  it('Error가 아닌 문자열이 던져지면 stderr에 그 값을 따옴표로 감싸 쓴다', async () => {
    expect((await commandThrowing('boom').run(args)).stderr).toBe("nocap: internal error: 'boom'\n")
  })

  it('문자열로 바꿀 수 없는 값이 던져져도 종료 코드 2를 반환한다', async () => {
    expect((await commandThrowing(Object.create(null)).run(args)).exitCode).toBe(2)
  })
})
