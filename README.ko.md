<h1 align="center">nocap</h1>

<p align="center">명세 문서와 테스트를 연결해 어떤 명세가 아직 검증되지 않았는지 추적합니다.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@makehash/nocap"><img src="https://img.shields.io/npm/v/@makehash/nocap.svg" alt="npm version" /></a>
  <a href="https://github.com/makeUgreat/nocap/actions/workflows/ci.yml"><img src="https://github.com/makeUgreat/nocap/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/makeUgreat/nocap/blob/master/npm/nocap/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="Package License" /></a>
</p>

<br />

<p align="center">
  🌐 <a href="https://github.com/makeUgreat/nocap/blob/master/README.md">English</a> · <b>한국어</b>
</p>

## 소개

nocap은 Markdown 명세와 테스트를 ID로 연결합니다.  
명세 항목에 ID를 붙이고 테스트에는 그 테스트가 검증하는 ID를 붙입니다.

nocap은 아래와 같은 문제를 찾고 보고합니다.
- 테스트가 없는 명세 항목
- 없는 ID를 가리키는 테스트
- 중복 ID
- 형식이 틀린 태그

> **참고:** nocap은 주석만 읽고 테스트를 실행하지 않습니다.  
> 그래서 `it`, `test`, `describe`, `suite`를 쓰는 테스트 러너라면 어디서든 동작합니다.

## 설치

```bash
$ npm i --save-dev @makehash/nocap
```

Node.js 22.12 이상이 필요합니다.

## 사용법

```bash
$ nocap --spec <glob> --test <glob>
```

| 옵션 | 값 |
| --- | --- |
| `--spec <glob>` | 명세 문서의 glob 패턴. 필수. 여러 번 쓸 수 있음 |
| `--test <glob>` | 테스트 파일의 glob 패턴. 필수. 여러 번 쓸 수 있음 |

nocap은 명령을 실행한 디렉토리를 기준으로 패턴을 찾습니다. 셸이 패턴을 먼저 펼치지 않도록 패턴마다 따옴표로 감쌉니다.

자주 쓰는 명령은 `package.json`의 스크립트로 저장해 둘 수 있습니다. 예:

```json
{
  "scripts": {
    "nocap": "nocap --spec \"docs/**/*.md\" --test \"src/**/*.test.ts\""
  }
}
```

```bash
$ npm run nocap
```

> **주의:** `package.json`에서는 위처럼 이스케이프한 큰따옴표를 씁니다. 작은따옴표는 Windows에서 동작하지 않습니다.

## 빠른 시작

예를 들어 프로젝트에 로그인 잠금 기능이 있고, 규칙이 2개라고 합시다.

1. 5회 연속 실패하면 계정을 잠금
2. 잠금은 30분 후 풀림

그런데 테스트는 첫 번째 규칙에만 있습니다. nocap으로 빠진 테스트를 찾는 방법은 아래와 같습니다.

**1단계.** 명세 문서 `docs/auth.md`의 규칙마다 ID를 붙입니다.

```md
## 로그인 잠금
- 5회 연속 실패하면 계정을 잠금 <!-- nocap: AUTH-001 -->
- 잠금은 30분 후 풀림 <!-- nocap: AUTH-002 -->
```

**2단계.** `src/auth.test.ts`의 테스트에 그 테스트가 검증하는 규칙의 ID를 붙입니다.

```ts
// nocap: AUTH-001
it('5번째 실패에서 계정을 잠근다', () => {})
```

**3단계.** [사용법](#사용법)의 `nocap` 스크립트를 실행합니다.

```bash
$ npm run nocap
docs/auth.md:3: error[uncovered-spec]: "AUTH-002" has no test: 잠금은 30분 후 풀림
1 error in 1 file: 1 uncovered-spec
1 of 2 specs covered
```

nocap은 두 번째 규칙(`AUTH-002`)에 테스트가 없다고 보고하고 `1`로 끝납니다.  
`// nocap: AUTH-002`를 붙인 테스트를 추가하면 `0`으로 끝납니다.

> **팁:** CI에서 nocap을 실행하면 테스트 없는 명세를 남기는 변경을 막을 수 있습니다.

## 문서

- [문법](https://github.com/makeUgreat/nocap/blob/master/npm/nocap/docs/syntax.md) - 태그를 두는 위치와 ID 규칙
- [CLI](https://github.com/makeUgreat/nocap/blob/master/npm/nocap/docs/specs/cli.md) - 옵션, 출력 형식, 종료 코드

## 라이선스

nocap은 [MIT 라이선스](https://github.com/makeUgreat/nocap/blob/master/npm/nocap/LICENSE)를 따릅니다.
