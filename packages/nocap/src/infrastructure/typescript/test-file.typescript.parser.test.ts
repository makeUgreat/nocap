import { describe, expect, it } from 'vitest'
import { TestFileTypescriptParser } from './test-file.typescript.parser.js'

const parser = new TestFileTypescriptParser()
const idsOf = (content: string, fileName = 'a.test.ts') => {
  const result = parser.parse(fileName, content)
  if (result.kind !== 'parsed') throw new Error(`expected parsed but got ${result.kind}`)
  return result.items.map((item) => item.ids)
}
const code = (...lines: string[]) => lines.join('\n')

// @TP-001
describe('테스트 태그가 붙은 테스트 호출마다 테스트 항목 생성', () => {
  it('테스트 태그가 붙은 테스트 호출이 2개이면 테스트 항목 2개를 반환한다', () => {
    const content = code('// @A-001', "it('a', () => {})", '// @A-002', "it('b', () => {})")

    expect(idsOf(content)).toEqual([['A-001'], ['A-002']])
  })

  it('테스트 묶음과 그 안의 테스트에 각각 태그가 있으면 각각 테스트 항목을 만든다', () => {
    const content = code('// @A-001', "describe('a', () => {", '  // @A-002', "  it('b', () => {})", '})')

    expect(idsOf(content)).toEqual([['A-001'], ['A-002']])
  })
})

// @TP-002
describe('테스트 태그의 모든 ID를 쓴 순서대로 테스트 항목의 ID로 사용', () => {
  it('테스트 태그에 ID가 2개이면 두 ID를 쓴 순서대로 가진 테스트 항목 1개를 반환한다', () => {
    const content = code('// @A-002, @A-001', "it('a', () => {})")

    expect(idsOf(content)).toEqual([['A-002', 'A-001']])
  })
})

// @TP-003
describe('테스트 태그가 없는 테스트 호출은 테스트 항목이 아님', () => {
  it('테스트 태그가 없는 테스트 호출만 있으면 빈 목록을 반환한다', () => {
    expect(idsOf(code("describe('a', () => {", "  it('b', () => {})", '})'))).toEqual([])
  })

  it('@가 없는 라인 주석은 테스트 태그로 보지 않는다', () => {
    expect(idsOf(code('// TODO-123', "it('a', () => {})"))).toEqual([])
  })
})

// @TP-004
describe('it, test, describe, suite 호출만 테스트 호출로 인식', () => {
  it('it, test, describe, suite 위의 테스트 태그는 모두 테스트 항목이 된다', () => {
    const content = ['it', 'test', 'describe', 'suite'].flatMap((name, i) => [`// @A-00${i}`, `${name}('x', () => {})`]).join('\n')

    expect(idsOf(content)).toEqual([['A-000'], ['A-001'], ['A-002'], ['A-003']])
  })

  it('목록에 없는 이름의 호출 위의 테스트 태그는 테스트 항목이 되지 않는다', () => {
    expect(idsOf(code('// @A-001', "context('x', () => {})"))).toEqual([])
  })
})

// @TP-005
describe('수식자가 붙은 호출도 테스트 호출로 인식', () => {
  it('멤버 수식자가 붙은 호출 위의 테스트 태그는 테스트 항목이 된다', () => {
    expect(idsOf(code('// @A-001', "describe.concurrent.only('x', () => {})"))).toEqual([['A-001']])
  })

  it('each 호출로 이어진 테스트 호출은 테스트 항목 1개가 된다', () => {
    expect(idsOf(code('// @A-001', "test.each([1, 2])('x %i', () => {})"))).toEqual([['A-001']])
  })

  it('태그된 템플릿으로 이어진 테스트 호출은 테스트 항목 1개가 된다', () => {
    const content = code('// @A-001', 'it.each`', '  a', '  ${1}', "`('x', () => {})")

    expect(idsOf(content)).toEqual([['A-001']])
  })
})

// @TP-006
describe('테스트 호출 바로 위 줄의 라인 주석만 테스트 태그로 인식', () => {
  it('테스트 태그와 테스트 호출 사이에 빈 줄이 있으면 테스트 항목을 만들지 않는다', () => {
    expect(idsOf(code('// @A-001', '', "it('a', () => {})"))).toEqual([])
  })

  it('테스트 태그와 테스트 호출 사이에 다른 주석이 있으면 테스트 항목을 만들지 않는다', () => {
    expect(idsOf(code('// @A-001', '// 설명', "it('a', () => {})"))).toEqual([])
  })

  it('다른 주석 아래 바로 위 줄에 있는 테스트 태그는 인식한다', () => {
    expect(idsOf(code('// 설명', '// @A-001', "it('a', () => {})"))).toEqual([['A-001']])
  })
})

// @TP-007
describe('블록 주석과 코드 뒤에 붙은 라인 주석은 테스트 태그가 아님', () => {
  it('바로 위 줄의 블록 주석은 테스트 태그로 보지 않는다', () => {
    expect(idsOf(code('/* @A-001 */', "it('a', () => {})"))).toEqual([])
  })

  it('테스트 호출과 같은 줄 끝의 라인 주석은 테스트 태그로 보지 않는다', () => {
    expect(idsOf("it('a', () => {}) // @A-001")).toEqual([])
  })

  it('바로 위 줄에서 다른 코드 뒤에 붙은 라인 주석은 테스트 태그로 보지 않는다', () => {
    expect(idsOf(code('foo() // @A-001', "it('a', () => {})"))).toEqual([])
  })
})

// @TP-008
describe('쉼표 앞뒤 공백과 무관하게 테스트 태그 인식', () => {
  it('쉼표 앞뒤에 공백이 없어도 공백이 있을 때와 같은 ID를 반환한다', () => {
    expect(idsOf(code('//@A-001,@A-002', "it('a', () => {})"))).toEqual([['A-001', 'A-002']])
  })
})

// @TP-009
describe('형식이 어긋난 여러 ID 주석은 테스트 태그가 아님', () => {
  it('ID 하나에 @가 없으면 주석 전체를 테스트 태그로 보지 않는다', () => {
    expect(idsOf(code('// @A-001, A-002', "it('a', () => {})"))).toEqual([])
  })

  it('ID 사이에 쉼표가 없으면 주석 전체를 테스트 태그로 보지 않는다', () => {
    expect(idsOf(code('// @A-001 @A-002', "it('a', () => {})"))).toEqual([])
  })
})

// @TP-010
describe('문자열과 템플릿 리터럴 안의 태그 무시', () => {
  it('바로 위 줄이 템플릿 리터럴 안의 // @ID이면 테스트 항목을 만들지 않는다', () => {
    const content = code('const s = `', '// @A-001', "`; it('a', () => {})")

    expect(idsOf(content)).toEqual([])
  })

  it('바로 위 줄이 문자열 안의 // @ID이면 테스트 항목을 만들지 않는다', () => {
    const content = code("const s = '\\", "// @A-001'", "it('a', () => {})")

    expect(idsOf(content)).toEqual([])
  })
})

// @TP-011
describe('파일 확장자로 언어 결정', () => {
  it('.ts 파일의 <T> 형 변환을 TypeScript로 읽는다', () => {
    expect(idsOf(code('const x = <number>y', '// @A-001', "it('a', () => {})"), 'a.test.ts')).toEqual([['A-001']])
  })

  it('.tsx 파일의 JSX를 읽는다', () => {
    expect(idsOf(code('const x = <div />', '// @A-001', "it('a', () => {})"), 'a.test.tsx')).toEqual([['A-001']])
  })

  it('.js 파일의 타입 주석은 문법 오류로 본다', () => {
    expect(parser.parse('a.test.js', 'const x: number = 1').kind).toBe('syntax-error')
  })

  it('.jsx 파일의 JSX를 읽는다', () => {
    expect(idsOf(code('const x = <div />', '// @A-001', "it('a', () => {})"), 'a.test.jsx')).toEqual([['A-001']])
  })

  it('.mts, .cts, .mjs, .cjs 파일을 읽는다', () => {
    const content = code('// @A-001', "it('a', () => {})")

    expect(['a.mts', 'a.cts', 'a.mjs', 'a.cjs'].map((name) => idsOf(content, name))).toEqual([
      [['A-001']],
      [['A-001']],
      [['A-001']],
      [['A-001']],
    ])
  })
})

// @TP-012
describe('지원하지 않는 확장자는 오류', () => {
  it('지원하지 않는 확장자이면 그 확장자를 담은 오류를 반환한다', () => {
    expect(parser.parse('a.test.py', '// @A-001\nit()')).toEqual({ kind: 'unsupported-extension', extension: '.py' })
  })
})

// @TP-013
describe('문법 오류가 있는 테스트 파일은 오류', () => {
  it('문법 오류가 있으면 테스트 항목 없이 오류 메시지를 반환한다', () => {
    const result = parser.parse('a.test.ts', code('// @A-001', "it('a', () => {})", 'const = 1'))

    expect(result.kind === 'syntax-error' && result.messages.length > 0).toBe(true)
  })
})

describe('빈 파일', () => {
  it('빈 문자열이면 빈 목록을 반환한다', () => {
    expect(idsOf('')).toEqual([])
  })
})

describe('파일 마지막 줄의 라인 주석', () => {
  it('줄바꿈 없이 끝나는 마지막 줄의 테스트 태그는 첫 줄의 테스트 호출에 연결하지 않는다', () => {
    expect(idsOf(code("it('a', () => {})", '// @A-001'))).toEqual([])
  })
})
