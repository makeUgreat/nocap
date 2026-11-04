---
title: 커버리지 판정
applies_to:
  - 명세 항목과 테스트 항목을 연결해 커버 여부를 정하는 nocap의 동작
read_when:
  - 커버리지 판정 규칙을 구현하거나 고칠 때
related:
  - ../syntax.md
  - spec-parsing.md
  - test-parsing.md
---

# 커버리지 판정

## 커버 여부
- nocap은 명세 항목의 ID를 가리키는 테스트 항목이 1개 이상 있으면 그 명세 항목을 커버됨으로 판정함 <!-- nocap: CV-001 -->
- nocap은 명세 항목의 ID를 가리키는 테스트 항목이 없으면 그 명세 항목을 커버되지 않음으로 판정함 <!-- nocap: CV-002 -->
- nocap은 테스트 항목 1개가 ID를 여러 개 가리키면 그 ID의 명세 항목을 모두 커버됨으로 판정함. 예: `// nocap: AUTH-001, AUTH-002`는 `AUTH-001`과 `AUTH-002`를 모두 커버함 <!-- nocap: CV-003 -->
- nocap은 테스트 파일의 경로와 관계없이 테스트 항목이 가리키는 명세 항목을 커버됨으로 판정함. 예: `e2e/login.test.ts`에만 `// nocap: AUTH-001`이 있어도 `AUTH-001`은 커버됨 <!-- nocap: CV-004 -->

## ID 일치
- nocap은 두 ID의 문자열이 정확히 같을 때만 같은 ID로 봄. 대소문자도 구분함. 예: `AUTH-001`과 `auth-001`은 다른 ID임 <!-- nocap: CV-005 -->

## 연결 문제 보고
- nocap은 어떤 명세 항목의 ID와도 같지 않은 ID를 보고함. 그 ID를 가리키는 테스트 항목도 함께 보고함. 예: 명세 항목에 `AUTH-999`가 없으면 `// nocap: AUTH-999`가 붙은 테스트 항목과 `AUTH-999`를 보고함 <!-- nocap: CV-006 -->
- nocap은 ID가 같은 명세 항목이 2개 이상이면 그 ID와 그 ID를 가진 명세 항목을 모두 보고함. 예: `auth.md`와 `login.md`에 둘 다 `<!-- nocap: AUTH-001 -->`가 있으면 `AUTH-001`과 두 명세 항목을 보고함 <!-- nocap: CV-007 -->
- nocap은 ID가 같은 명세 항목이 2개 이상이면 그 명세 항목들의 커버 여부를 판정하지 않음. 커버된 명세 항목으로 세지 않고, 커버되지 않은 명세 항목으로 보고하지도 않음. 예: `auth.md`와 `login.md`에 둘 다 `AUTH-001`이 있으면, `// nocap: AUTH-001` 테스트가 있어도 요약은 `0 of 2 specs covered`이고 진단은 `duplicate-id`뿐임 <!-- nocap: CV-008 -->
