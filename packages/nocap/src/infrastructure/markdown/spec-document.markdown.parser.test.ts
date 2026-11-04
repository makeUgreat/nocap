import { describe, expect, it } from 'vitest'
import { SpecDocument } from '../../domain/spec/spec-document.js'
import { SpecDocumentMarkdownParser } from './spec-document.markdown.parser.js'

const parser = new SpecDocumentMarkdownParser()
const documentOf = (path: string, content: string) => SpecDocument.of(path, parser.parse(content))
const ids = (content: string) => documentOf('a.md', content).specItems.map((item) => item.id.value)
const parse = (content: string) => documentOf('docs/a.md', content)
const textOf = (content: string) => parse(content).specItems[0]?.text

// nocap: MD-001
describe('명세 태그가 있는 리스트 항목마다 명세 항목 생성', () => {
  it('명세 태그가 있는 리스트 항목이 2개이면 명세 항목 2개를 반환한다', () => {
    const content = ['- 계정을 잠금 <!-- nocap: A-001 -->', '- 잠금을 풂 <!-- nocap: A-002 -->'].join('\n')

    expect(ids(content)).toEqual(['A-001', 'A-002'])
  })

  it('하위 리스트 항목에 명세 태그가 있으면 상위 항목과 별개로 명세 항목을 만든다', () => {
    const content = ['- 로그인 실패 처리 <!-- nocap: A-001 -->', '  - 5회 실패하면 잠금 <!-- nocap: A-002 -->'].join('\n')

    expect(ids(content)).toEqual(['A-001', 'A-002'])
  })

  it('리스트 밖의 문단과 헤딩에 있는 명세 태그로는 명세 항목을 만들지 않는다', () => {
    const content = ['# 제목 <!-- nocap: A-001 -->', '', '문단 <!-- nocap: A-002 -->'].join('\n')

    expect(ids(content)).toEqual([])
  })
})

// nocap: MD-002
describe('명세 태그의 ID를 명세 항목의 ID로 사용', () => {
  it('명세 태그의 nocap: 뒤 값을 명세 항목의 ID로 반환한다', () => {
    expect(ids('- 계정을 잠금 <!-- nocap: AUTH-001 -->')).toEqual(['AUTH-001'])
  })
})

// nocap: MD-003
describe('명세 태그가 없는 리스트 항목은 명세 항목이 아님', () => {
  it('명세 태그가 없는 리스트 항목만 있으면 빈 목록을 반환한다', () => {
    expect(ids('- 계정을 잠금\n- 잠금을 풂')).toEqual([])
  })

  it('nocap:으로 시작하지 않는 주석은 명세 태그로 보지 않는다', () => {
    expect(ids('- 계정을 잠금 <!-- TODO-123 -->')).toEqual([])
  })
})

// nocap: MD-008
describe('문장 없이 명세 태그만 있는 리스트 항목은 명세 항목이 아님', () => {
  it('명세 태그만 있는 리스트 항목이면 명세 항목을 만들지 않는다', () => {
    expect(ids('- <!-- nocap: A-001 -->')).toEqual([])
  })

  it('명세 태그만 있는 항목에 하위 리스트가 있으면 하위 항목만 명세 항목이 된다', () => {
    const content = ['- <!-- nocap: A-001 -->', '  - 5회 실패하면 잠금 <!-- nocap: A-002 -->'].join('\n')

    expect(ids(content)).toEqual(['A-002'])
  })
})

// nocap: MD-016
describe('본문이 nocap:으로 시작하는 HTML 주석만 명세 태그로 인식', () => {
  it('@로 시작하는 주석은 명세 태그로 보지 않는다', () => {
    expect(ids('- 계정을 잠금 <!-- @A-001 -->')).toEqual([])
  })

  it('접두어가 대문자이면 명세 태그로 보지 않는다', () => {
    expect(ids('- 계정을 잠금 <!-- NOCAP: A-001 -->')).toEqual([])
  })

  it('nocap과 콜론 사이에 공백이 있으면 명세 태그로 보지 않는다', () => {
    expect(ids('- 계정을 잠금 <!-- nocap : A-001 -->')).toEqual([])
  })

  it('닫히지 않은 주석은 명세 태그로 보지 않는다', () => {
    expect(ids('- 계정을 잠금 <!-- nocap: A-001')).toEqual([])
  })

  it('명세 태그가 아닌 주석은 틀린 태그로 보고하지 않는다', () => {
    expect(parse('- 계정을 잠금 <!-- @A.1 -->').invalidTags).toEqual([])
  })
})

// nocap: MD-004
describe('주석 안쪽 앞뒤와 콜론 뒤 공백과 무관하게 명세 태그 인식', () => {
  it('주석 안쪽과 콜론 뒤에 공백이 없어도 공백이 있을 때와 같은 ID를 반환한다', () => {
    expect(ids('- 계정을 잠금 <!--nocap:A-001-->')).toEqual(['A-001'])
  })

  it('주석 안쪽과 콜론 뒤에 공백이 여러 개 있어도 같은 ID를 반환한다', () => {
    expect(ids('- 계정을 잠금 <!--   nocap:   A-001   -->')).toEqual(['A-001'])
  })
})

// nocap: MD-017
describe('ID 뒤의 쉼표와 무관하게 명세 태그 인식', () => {
  it('ID 뒤에 쉼표가 있어도 쉼표가 없을 때와 같은 ID를 반환한다', () => {
    expect(ids('- 계정을 잠금 <!-- nocap: A-001, -->')).toEqual(['A-001'])
  })
})

// nocap: MD-005
describe('코드 안의 명세 태그 무시', () => {
  it('인라인 코드 안의 명세 태그는 명세 태그로 보지 않는다', () => {
    expect(ids('- 형식은 `<!-- nocap: A-001 -->`임')).toEqual([])
  })

  it('코드 블록 안의 명세 태그는 명세 태그로 보지 않는다', () => {
    const content = ['```md', '- 계정을 잠금 <!-- nocap: A-001 -->', '```'].join('\n')

    expect(ids(content)).toEqual([])
  })

  it('리스트 항목 안의 코드 블록에 있는 명세 태그는 명세 태그로 보지 않는다', () => {
    const content = ['- 예시', '', '  ```md', '  - 계정을 잠금 <!-- nocap: A-001 -->', '  ```'].join('\n')

    expect(ids(content)).toEqual([])
  })
})

// nocap: MD-006
describe('리스트 항목 텍스트 맨 끝의 명세 태그만 인식', () => {
  it('명세 태그가 텍스트 맨 앞에 있으면 명세 항목을 만들지 않는다', () => {
    expect(ids('- <!-- nocap: A-001 --> 계정을 잠금')).toEqual([])
  })

  it('명세 태그 뒤에 공백만 있으면 맨 끝의 명세 태그로 본다', () => {
    expect(ids('- 계정을 잠금 <!-- nocap: A-001 -->   ')).toEqual(['A-001'])
  })

  it('명세 태그가 텍스트 중간에 있으면 명세 항목을 만들지 않는다', () => {
    expect(ids('- 계정을 <!-- nocap: A-001 --> 잠금')).toEqual([])
  })
})

// nocap: MD-007
describe('리스트 항목의 첫 문단 끝을 맨 끝으로 봄', () => {
  it('명세 태그가 둘째 문단 끝에 있으면 명세 항목을 만들지 않는다', () => {
    const content = ['- 계정을 잠금', '', '  관리자에게도 적용함 <!-- nocap: A-001 -->'].join('\n')

    expect(ids(content)).toEqual([])
  })

  it('하위 리스트 항목 끝의 명세 태그는 상위 항목의 명세 태그로 보지 않는다', () => {
    const content = ['- 로그인 실패 처리', '  - 5회 실패하면 잠금 <!-- nocap: A-002 -->'].join('\n')

    expect(ids(content)).toEqual(['A-002'])
  })

  it('명세 태그를 첫 문단 다음 줄에 따로 쓰면 명세 항목을 만들지 않는다', () => {
    const content = ['- 계정을 잠금', '  <!-- nocap: A-001 -->'].join('\n')

    expect(ids(content)).toEqual([])
  })

  it.todo('명세 태그를 첫 문단 다음 줄에 따로 쓰면 위치가 틀린 태그로 보고한다')
})

describe('빈 항목', () => {
  it('내용 없는 리스트 항목이면 빈 목록을 반환한다', () => {
    expect(ids('-')).toEqual([])
  })
})

describe('빈 문서', () => {
  it('빈 문자열이면 빈 목록을 반환한다', () => {
    expect(ids('')).toEqual([])
  })
})

// nocap: MD-009
describe('명세 문서 경로와 리스트 항목이 시작하는 줄을 명세 항목의 위치로 사용', () => {
  it('리스트 항목이 3번째 줄에서 시작하면 명세 문서 경로와 줄 3을 위치로 반환한다', () => {
    const content = ['# 제목', '', '- 계정을 잠금 <!-- nocap: A-001 -->'].join('\n')

    expect(parse(content).specItems[0]?.location).toEqual({ path: 'docs/a.md', line: 3 })
  })

  it('첫 문단이 여러 줄이면 명세 태그가 있는 줄이 아니라 리스트 항목이 시작하는 줄을 반환한다', () => {
    const content = ['- 5회 연속 실패하면', '  계정을 잠금 <!-- nocap: A-001 -->'].join('\n')

    expect(parse(content).specItems[0]?.location.line).toBe(1)
  })
})

// nocap: MD-010
describe('첫 문단에서 명세 태그를 뺀 부분을 명세 문장으로 사용', () => {
  it('명세 태그 앞의 문장을 명세 문장으로 반환한다', () => {
    expect(textOf('- 계정을 잠금 <!-- nocap: A-001 -->')).toBe('계정을 잠금')
  })

  it('첫 문단이 여러 줄이면 각 줄의 앞뒤 공백을 지우고 공백 1개로 이은 명세 문장을 반환한다', () => {
    expect(textOf(['- 5회 실패하면', '    계정을  잠금 <!-- nocap: A-001 -->'].join('\n'))).toBe('5회 실패하면 계정을  잠금')
  })

  it('하위 리스트는 명세 문장에 넣지 않는다', () => {
    expect(textOf(['- 계정을 잠금 <!-- nocap: A-001 -->', '  - 하위 항목'].join('\n'))).toBe('계정을 잠금')
  })

  it('둘째 문단은 명세 문장에 넣지 않는다', () => {
    expect(textOf(['- 계정을 잠금 <!-- nocap: A-001 -->', '', '  둘째 문단'].join('\n'))).toBe('계정을 잠금')
  })
})

// nocap: MD-011
describe('명세 문장의 줄바꿈을 공백 1개로 바꾸고 각 줄의 앞뒤 공백을 지움', () => {
  it('첫 문단이 여러 줄이면 각 줄의 앞뒤 공백을 지우고 공백 1개로 이어 붙인다', () => {
    const content = ['- 5회 연속 실패하면  ', '    계정을 잠금 <!-- nocap: A-001 -->'].join('\n')

    expect(textOf(content)).toBe('5회 연속 실패하면 계정을 잠금')
  })

  it('줄바꿈이 CRLF이면 줄 끝의 \\r을 남기지 않고 공백 1개로 이어 붙인다', () => {
    const content = ['- 5회 연속 실패하면', '  계정을 잠금 <!-- nocap: A-001 -->'].join('\r\n')

    expect(textOf(content)).toBe('5회 연속 실패하면 계정을 잠금')
  })
})

// nocap: MD-012
describe('명세 문장의 Markdown 서식을 원문 그대로 둠', () => {
  it('인라인 코드와 강조 표시를 지우지 않고 반환한다', () => {
    expect(textOf('- `SpecItem`을 **반드시** 만듦 <!-- nocap: A-001 -->')).toBe('`SpecItem`을 **반드시** 만듦')
  })
})

// nocap: MD-014
describe('ID 규칙을 어긴 명세 태그로는 명세 항목을 만들지 않음', () => {
  it('ID에 규칙 밖의 문자가 있는 명세 태그는 명세 항목이 되지 않는다', () => {
    const content = ['- 잠금 <!-- nocap: A.1 -->', '- 해제 <!-- nocap: A-002 -->'].join('\n')

    expect(ids(content)).toEqual(['A-002'])
  })

  it('쉼표 없이 공백으로 나뉜 ID가 있는 명세 태그는 명세 항목이 되지 않는다', () => {
    expect(ids('- 잠금 <!-- nocap: A-001 A-002 -->')).toEqual([])
  })
})

// nocap: MD-018
describe('ID가 누락된 명세 태그로는 명세 항목을 만들지 않음', () => {
  it('nocap: 뒤에 ID가 없는 명세 태그는 명세 항목이 되지 않는다', () => {
    expect(ids('- 잠금 <!-- nocap: -->')).toEqual([])
  })

  it('쉼표 사이가 빈 명세 태그는 명세 항목이 되지 않는다', () => {
    expect(ids('- 잠금 <!-- nocap: A-001,,A-002 -->')).toEqual([])
  })
})

// nocap: MD-019
describe('ID가 2개 이상인 명세 태그로는 명세 항목을 만들지 않음', () => {
  it('ID가 2개인 명세 태그는 명세 항목이 되지 않는다', () => {
    expect(ids('- 잠금 <!-- nocap: A-001, A-002 -->')).toEqual([])
  })
})

// nocap: MD-015
describe('틀린 명세 태그의 위치와 틀린 이유를 보고', () => {
  it('ID 규칙을 어긴 명세 태그가 있으면 태그가 있는 줄과 규칙을 어긴 ID를 반환한다', () => {
    const content = ['- 잠금 <!-- nocap: A-001 -->', '- 5회 실패하면', '  잠금 <!-- nocap: A.1 -->'].join('\n')

    expect(parse(content).invalidTags).toEqual([
      {
        kind: 'id-rule-violation',
        location: { path: 'docs/a.md', line: 3 },
        invalidCandidates: [{ kind: 'invalid-char', value: 'A.1', firstInvalidChar: '.' }],
      },
    ])
  })

  it('ID가 누락된 명세 태그가 있으면 태그가 있는 줄과 ID 누락을 반환한다', () => {
    expect(parse('- 잠금 <!-- nocap: -->').invalidTags).toEqual([{ kind: 'missing-id', location: { path: 'docs/a.md', line: 1 } }])
  })

  it('ID가 2개인 명세 태그가 있으면 태그가 있는 줄과 그 ID들을 반환한다', () => {
    expect(parse('- 잠금 <!-- nocap: A-001, A-002 -->').invalidTags).toEqual([
      { kind: 'multiple-ids', location: { path: 'docs/a.md', line: 1 }, ids: [{ value: 'A-001' }, { value: 'A-002' }] },
    ])
  })

  it('모든 명세 태그의 ID가 규칙을 지키면 보고할 태그가 없다', () => {
    expect(parse('- 잠금 <!-- nocap: A-001 -->').invalidTags).toEqual([])
  })
})

// nocap: MD-021
describe('명세 태그가 시작하는 줄을 틀린 명세 태그의 위치로 사용', () => {
  it('1줄에서 시작한 리스트 항목의 2줄 끝에 틀린 명세 태그가 있으면 위치의 줄은 2다', () => {
    const content = ['- 5회 실패하면', '  잠금 <!-- nocap: A.1 -->'].join('\n')

    expect(parse(content).invalidTags.map((invalidTag) => invalidTag.location)).toEqual([{ path: 'docs/a.md', line: 2 }])
  })
})

// nocap: MD-020
describe('틀린 명세 태그 1개에 틀린 이유 1개를 정해진 순서로 보고', () => {
  const kindsOf = (content: string) => parse(content).invalidTags.map((invalidTag) => invalidTag.kind)

  it('ID 누락과 ID 개수 초과를 함께 어기면 ID 누락만 보고한다', () => {
    expect(kindsOf('- 잠금 <!-- nocap: A-001,,A-002 -->')).toEqual(['missing-id'])
  })

  it('ID 누락과 ID 규칙 위반을 함께 어기면 ID 누락만 보고한다', () => {
    expect(kindsOf('- 잠금 <!-- nocap: A.1,, -->')).toEqual(['missing-id'])
  })

  it('ID 규칙 위반과 ID 개수 초과를 함께 어기면 ID 규칙 위반만 보고한다', () => {
    expect(kindsOf('- 잠금 <!-- nocap: A.1, A-002 -->')).toEqual(['id-rule-violation'])
  })
})
