import { describe, expect, it } from 'vitest'
import { projectWith } from '../../support/project.support.js'
import { commandFor, fixtureDir } from './coverage-check.command.support.js'

describe('실제 파일로 커버리지 검사 실행', () => {
  it('모든 명세 항목이 커버된 프로젝트이면 stdout을 비우고 stderr에 요약만 쓰고 종료 코드 0을 반환한다', async () => {
    const output = await commandFor(fixtureDir('success')).run(['--spec', 'docs/**/*.md', '--test', 'src/**/*.test.*'])

    expect(output).toEqual({ stdout: '', stderr: '3 of 3 specs covered\n', exitCode: 0 })
  })

  it('커버 누락, 중복 ID, 틀린 태그, 알 수 없는 ID, 문법 오류, 지원하지 않는 확장자가 섞인 프로젝트이면 문제마다 진단을 경로와 줄 순서로 쓰고 종료 코드 1을 반환한다', async () => {
    const output = await commandFor(fixtureDir('failure')).run(['--spec', 'docs/**/*.md', '--test', 'src/**/*.test.*'])

    expect(output).toEqual({
      stdout: [
        'docs/auth.md:2: error[duplicate-id]: "A-001" is also defined at docs/auth.md:4',
        'docs/auth.md:3: error[uncovered-spec]: "A-002" has no test: 30분 후 잠금 해제',
        'docs/auth.md:4: error[duplicate-id]: "A-001" is also defined at docs/auth.md:2',
        'docs/auth.md:5: error[invalid-id]: "A.3" has "."; hint: use only A-Z, a-z, 0-9, "-", "_"',
        'src/auth.test.ts:7: error[unknown-id]: "Z-999" is not defined in any spec',
        'src/broken.test.ts: error[syntax-error]: Expected `}` but found `EOF`',
        'src/old.test.coffee: error[unsupported-extension]: ".coffee" is not a supported test file extension; hint: use .ts, .mts, .cts, .tsx, .js, .mjs, .cjs or .jsx',
        '',
      ].join('\n'),
      stderr: [
        '7 errors in 4 files: 1 uncovered-spec, 1 unknown-id, 2 duplicate-id, 1 invalid-id, 1 unsupported-extension, 1 syntax-error',
        '0 of 3 specs covered',
        '',
      ].join('\n'),
      exitCode: 1,
    })
  })

  it('겹치는 패턴, 빈 파일, 태그만 있는 항목, 대문자 파일 이름이 있는 프로젝트이면 파일을 한 번씩 코드 단위 순서로 읽어 진단을 쓴다', async () => {
    const output = await commandFor(fixtureDir('edge')).run(['--spec', 'docs/*.md', '--spec', 'docs/a.md', '--test', 'src/*.test.ts'])

    expect(output).toEqual({
      stdout: [
        'docs/B.md:1: error[uncovered-spec]: "B-001" has no test: 해제',
        'docs/a.md:1: error[uncovered-spec]: "A-001" has no test: 잠금',
        '',
      ].join('\n'),
      stderr: ['2 errors in 2 files: 2 uncovered-spec', '0 of 2 specs covered', ''].join('\n'),
      exitCode: 1,
    })
  })

  it('파일이 없는 패턴과 node_modules 안의 파일에만 맞는 패턴이 있으면 진단 없이 그 패턴들을 쓰고 종료 코드 2를 반환한다', async () => {
    const dir = projectWith({
      'docs/auth.md': '- 5회 실패하면 잠금 <!-- nocap: A-001 -->',
      'node_modules/pkg/auth.test.ts': ['// nocap: A-001', "it('5번 실패하면 잠근다', () => {})"].join('\n'),
    })

    const output = await commandFor(dir).run(['--spec', 'docs/*.md', '--spec', 'dcos/*.md', '--test', '**/node_modules/**/*.test.ts'])

    expect(output).toEqual({
      stdout: '',
      stderr: ['nocap: no files match --spec "dcos/*.md"', 'nocap: no files match --test "**/node_modules/**/*.test.ts"', ''].join('\n'),
      exitCode: 2,
    })
  })
})
