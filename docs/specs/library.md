---
title: 라이브러리 API
applies_to:
  - nocap 패키지가 내보내는 함수의 입력, 결과, 실패
read_when:
  - 라이브러리 API를 구현하거나 고칠 때
  - 공개 타입을 바꿀 때
related:
  - coverage.md
  - coverage-check.md
  - cli.md
---

# 라이브러리 API

## 함수
- nocap은 패키지 진입점 `@makehash/nocap`에서 async 함수 `checkCoverage`를 내보냄 <!-- nocap: LIB-001 -->

## 입력
- nocap은 `spec`으로 받은 패턴으로 명세 문서를, `test`로 받은 패턴으로 테스트 파일을 찾음. 파일을 찾는 규칙은 [커버리지 검사](coverage-check.md#파일-찾기)를 따름 <!-- nocap: LIB-002 -->
- nocap은 `cwd`로 받은 디렉토리를 기준 디렉토리로 씀. `cwd`가 없으면 `process.cwd()`를 기준 디렉토리로 씀 <!-- nocap: LIB-003 -->
- nocap은 `spec`이나 `test`가 문자열 1개 이상을 담은 배열이 아니면 `TypeError`를 던짐. 예: `spec: []`, `test: 'src/*.test.ts'` <!-- nocap: LIB-004 -->
- nocap은 `cwd`가 있고 문자열이 아니면 `TypeError`를 던짐 <!-- nocap: LIB-005 -->

## 출력과 내부 오류
- nocap은 `checkCoverage`를 실행하는 동안 stdout과 stderr에 아무것도 쓰지 않음 <!-- nocap: LIB-017 -->
- nocap은 실행 중 예상하지 못한 오류가 나면 그 오류를 잡지 않고 호출자에게 그대로 던짐 <!-- nocap: LIB-018 -->

## 결과
- nocap은 파일을 찾지 못한 패턴이 있으면 파일을 읽지 않고 `kind`가 `unmatched-patterns`인 결과를 돌려줌. 결과는 그 패턴마다 `side`와 `pattern`을 가짐. 예: `{ side: 'spec', pattern: 'dcos/*.md' }` <!-- nocap: LIB-006 -->
- nocap은 `unmatched-patterns` 결과에 명세 패턴을 먼저, 테스트 패턴을 나중에 넣음. 각 쪽은 받은 순서를 따르고, 같은 패턴은 1번만 넣음 <!-- nocap: LIB-007 -->
- nocap은 모든 패턴이 파일을 찾으면 `kind`가 `checked`인 결과를 돌려줌. 결과는 명세 항목 수, 커버된 명세 항목 수, 커버리지 문제, 틀린 태그, 파일 오류, 명세 항목 목록 `specItems`를 가짐 <!-- nocap: LIB-008 -->

## 명세 항목 목록
- nocap은 `specItems`에 모든 명세 항목을 넣음. `specItems`의 길이는 명세 항목 수와 같음 <!-- nocap: LIB-009 -->
- nocap은 `specItems`의 명세 항목마다 ID, 명세 문장, 위치, 상태 `status`, 연결된 테스트 항목 목록 `testItems`를 줌 <!-- nocap: LIB-010 -->
- nocap은 [커버리지 판정](coverage.md#커버-여부)이 커버됨으로 판정한 명세 항목의 `status`를 `covered`로 줌 <!-- nocap: LIB-011 -->
- nocap은 [커버리지 판정](coverage.md#커버-여부)이 커버되지 않음으로 판정한 명세 항목의 `status`를 `uncovered-spec`으로 줌 <!-- nocap: LIB-012 -->
- nocap은 ID가 같은 명세 항목이 2개 이상이면 그 명세 항목들의 `status`를 `duplicate-id`로 주고 `testItems`를 비움. 예: `auth.md`와 `login.md`에 둘 다 `AUTH-001`이 있으면, `// nocap: AUTH-001` 테스트가 있어도 두 명세 항목의 `testItems`는 비어 있음 <!-- nocap: LIB-013 -->
- nocap은 `status`가 `covered`인 명세 항목의 `testItems`에 그 ID를 가리키는 테스트 항목을 모두 넣음. 테스트 항목마다 위치를 줌 <!-- nocap: LIB-014 -->
- nocap은 `testItems`의 테스트 항목마다 끝 줄 `endLine`을 줌 <!-- nocap: LIB-019 -->

## 목록 순서
- nocap은 `specItems`를 위치의 경로의 코드 단위 순서로 놓고, 같은 경로 안에서는 줄 순서로 놓음. 예: `docs/B.md`의 명세 항목이 `docs/a.md`의 명세 항목보다 앞섬 <!-- nocap: LIB-015 -->
- nocap은 `testItems`를 위치의 경로의 코드 단위 순서로 놓고, 같은 경로 안에서는 줄 순서로 놓음. 예: `src/auth.test.ts:2`, `src/auth.test.ts:5`, `src/e2e.test.ts:1` 순서 <!-- nocap: LIB-016 -->
