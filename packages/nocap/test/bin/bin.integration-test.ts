import { beforeAll, describe, expect, it } from 'vitest'
import { projectWith } from '../support/project.support.js'
import { buildCli, runCli } from './bin.support.js'

beforeAll(() => buildCli(), 60_000)

// nocap: CLI-002
describe('명령을 실행한 디렉토리를 기준 디렉토리로 씀', () => {
  it('실행한 디렉토리에 대한 상대 경로 패턴으로 파일을 찾고 상대 경로로 출력한다', () => {
    const dir = projectWith({
      'docs/auth.md': ['- 5회 실패하면 잠금 <!-- nocap: A-001 -->', '- 30분 후 잠금 해제 <!-- nocap: A-002 -->'].join('\n'),
      'src/auth.test.ts': ['// nocap: A-001', "it('5번 실패하면 잠근다', () => {})"].join('\n'),
    })

    const run = runCli(dir, ['--spec', 'docs/**/*.md', '--test', 'src/**/*.test.ts'])

    expect(run).toEqual({
      stdout: 'docs/auth.md:2: error[uncovered-spec]: "A-002" has no test: 30분 후 잠금 해제\n',
      stderr: ['1 error in 1 file: 1 uncovered-spec', '1 of 2 specs covered', ''].join('\n'),
      exitCode: 1,
    })
  })
})

describe('빌드한 CLI 실행', () => {
  it('모든 명세 항목이 커버되면 stdout을 비우고 stderr에 요약만 쓰고 종료 코드 0으로 끝난다', () => {
    const dir = projectWith({
      'docs/auth.md': '- 5회 실패하면 잠금 <!-- nocap: A-001 -->',
      'src/auth.test.ts': ['// nocap: A-001', "it('5번 실패하면 잠근다', () => {})"].join('\n'),
    })

    expect(runCli(dir, ['--spec', 'docs/**/*.md', '--test', 'src/**/*.test.ts'])).toEqual({
      stdout: '',
      stderr: '1 of 1 specs covered\n',
      exitCode: 0,
    })
  })

  it('사용법 오류이면 stderr에 사용법을 쓰고 종료 코드 2로 끝난다', () => {
    const run = runCli(projectWith({}), [])

    expect([run.exitCode, run.stderr.split('\n')[0]]).toEqual([2, 'nocap: missing --spec'])
  })
})

// nocap: CLI-021
describe('stdout과 stderr마다 색 사용 여부를 정함', () => {
  const uncoveredProject = () => projectWith({ 'docs/auth.md': '- 5회 실패하면 잠금 <!-- nocap: A-001 -->', 'src/auth.test.ts': '' })
  const args = ['--spec', 'docs/**/*.md', '--test', 'src/**/*.test.ts']

  it('파이프로 출력하면 색 코드를 쓰지 않는다', () => {
    const run = runCli(uncoveredProject(), args)

    expect(`${run.stdout}${run.stderr}`).not.toContain('\u001b[')
  })

  it('FORCE_COLOR가 있으면 파이프여도 stdout과 stderr에 색 코드를 쓴다', () => {
    const run = runCli(uncoveredProject(), args, { FORCE_COLOR: '1' })

    expect([run.stdout.includes('\u001b['), run.stderr.includes('\u001b[')]).toEqual([true, true])
  })

  it('FORCE_COLOR가 0이면 색 코드를 쓰지 않는다', () => {
    const run = runCli(uncoveredProject(), args, { FORCE_COLOR: '0' })

    expect(`${run.stdout}${run.stderr}`).not.toContain('\u001b[')
  })
})
