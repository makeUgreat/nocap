<h1 align="center">nocap</h1>

<p align="center">Link spec docs to tests, and track which specs are not verified yet.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@makehash/nocap"><img src="https://img.shields.io/npm/v/@makehash/nocap.svg" alt="npm version" /></a>
  <a href="https://github.com/makeUgreat/nocap/actions/workflows/ci.yml"><img src="https://github.com/makeUgreat/nocap/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/makeUgreat/nocap/blob/master/npm/nocap/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="Package License" /></a>
</p>

<br />

<p align="center">
  🌐 <b>English</b> · <a href="https://github.com/makeUgreat/nocap/blob/master/npm/nocap/README.ko.md">한국어</a>
</p>

## Description

nocap links Markdown specs to tests by ID.

Tag each spec item with an ID. Tag each test with the IDs it covers. nocap then reports:

- spec items with no test
- tests that reference an unknown ID
- duplicate IDs
- malformed tags

> **Note:** nocap reads comments only. It does not run your tests, so it works with any runner that uses `it`, `test`, `describe`, or `suite`.

## Installation

```bash
$ npm i --save-dev @makehash/nocap
```

Requires Node.js 22.12 or later.

## Usage

```bash
$ nocap --spec <glob> --test <glob>
```

| Option | Value |
| --- | --- |
| `--spec <glob>` | Glob for spec documents. Required. Can be repeated. |
| `--test <glob>` | Glob for test files. Required. Can be repeated. |

nocap resolves the globs from the current directory. Put each glob in quotes so that your shell does not expand it first.

You can save the command as a script in `package.json`. For example:

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

> **Warning:** In `package.json`, use escaped double quotes as above. Single quotes do not work on Windows.

## Quick Start

For example, say your project has a login lockout feature with two rules:

1. Lock the account after 5 failed logins.
2. Unlock the account after 30 minutes.

You have written a test for the first rule only. Here is how nocap finds the missing one.

**Step 1.** Give each rule an ID in the spec document `docs/auth.md`:

```md
## Login lockout
- Lock the account after 5 failed logins <!-- nocap: AUTH-001 -->
- Unlock the account after 30 minutes <!-- nocap: AUTH-002 -->
```

**Step 2.** Mark the test with the ID of the rule it verifies, in `src/auth.test.ts`:

```ts
// nocap: AUTH-001
it('locks the account on the 5th failure', () => {})
```

**Step 3.** Run the `nocap` script from [Usage](#usage):

```bash
$ npm run nocap
docs/auth.md:3: error[uncovered-spec]: "AUTH-002" has no test: Unlock the account after 30 minutes
1 error in 1 file: 1 uncovered-spec
1 of 2 specs covered
```

nocap reports that the second rule (`AUTH-002`) has no test, and exits with `1`. Add a test marked `// nocap: AUTH-002`, and nocap exits with `0`.

> **Tip:** Run nocap in CI to block changes that leave a spec without a test.

## Documentation

The documentation is in Korean.

- [Syntax](https://github.com/makeUgreat/nocap/blob/master/docs/syntax.md) - where to put tags and which IDs are valid
- [CLI](https://github.com/makeUgreat/nocap/blob/master/docs/specs/cli.md) - options, output format, and exit codes

## Stay in touch

- Author - [hash_kim](https://github.com/makeUgreat)

## License

nocap is [MIT licensed](https://github.com/makeUgreat/nocap/blob/master/npm/nocap/LICENSE).
