import type { TestItem } from '../domain/test-item.js'

export type TestFileParseResult =
  | { readonly kind: 'parsed'; readonly items: TestItem[] }
  | { readonly kind: 'unsupported-extension'; readonly extension: string }
  | { readonly kind: 'syntax-error'; readonly messages: string[] }

export interface TestFileParser {
  /**
   * 테스트 파일 1개의 내용에서 테스트 항목을 찾는다.
   * 언어는 `fileName`의 확장자로 정한다.
   * 테스트 항목은 파일에 나온 순서대로 반환한다. 테스트 항목이 없으면 빈 배열을 반환한다.
   * 확장자를 지원하지 않거나 문법 오류가 있으면 테스트 항목 없이 오류를 반환한다.
   */
  parse(fileName: string, content: string): TestFileParseResult
}
