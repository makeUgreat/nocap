---
title: 용어집
applies_to:
  - packages/nocap/src/domain
read_when:
  - 도메인 용어의 정확한 뜻을 확인할 때
  - 코드, 출력 문구, 문서에 쓸 이름을 정할 때
related:
  - writing-guide.md
---

# 용어집

- 이 문서는 도메인 객체가 쓰는 용어만 정의한다.
- 도메인 객체를 만들 때 같은 커밋에서 그 용어를 추가한다.

## spec

- 명세 항목(`SpecItem`): 명세 문서에서 명세 태그로 ID를 받은 리스트 항목이다.
  - 명세 태그의 형식과 위치는 [nocap 문법](syntax.md)이 정한다.
- ID(`id`): 명세 항목을 가리키는 문자열이다. 명세 태그의 `@` 뒤에 쓴 값이다. 예: `<!--@AUTH-001-->`의 ID는 `AUTH-001`
  - 테스트 태그는 이 ID로 명세 항목을 가리킨다.
