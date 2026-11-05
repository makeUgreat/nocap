import type { IConfiguration } from 'dependency-cruiser'

const architecture = 'docs/architecture.md#의존성-규칙'
const contexts = 'docs/architecture.md#맥락-디렉토리'
const directories = 'docs/architecture.md#디렉토리-규칙'

const config: IConfiguration = {
  forbidden: [
    {
      name: 'domain-not-to-outer-layers',
      severity: 'error',
      comment: `domain is the innermost layer and must not import application, infrastructure, or presentation. See ${architecture}.`,
      from: { path: '^src/domain/' },
      to: { path: '^src/(application|infrastructure|presentation)/' },
    },
    {
      name: 'application-not-to-outer-layers',
      severity: 'error',
      comment: `application must not import infrastructure or presentation. See ${architecture}.`,
      from: { path: '^src/application/' },
      to: { path: '^src/(infrastructure|presentation)/' },
    },
    {
      name: 'infrastructure-not-to-presentation',
      severity: 'error',
      comment: `infrastructure must not import presentation. See ${architecture}.`,
      from: { path: '^src/infrastructure/' },
      to: { path: '^src/presentation/' },
    },
    {
      name: 'presentation-not-to-infrastructure',
      severity: 'error',
      comment: `presentation must not import infrastructure. Only the entry point src/index.ts wires adapters. See ${architecture}.`,
      from: { path: '^src/presentation/' },
      to: { path: '^src/infrastructure/' },
    },
    {
      name: 'presentation-only-api-to-domain',
      severity: 'error',
      comment: `In presentation only an api file may import domain. It turns the use case result into the public types. See ${architecture}.`,
      // An api test makes domain objects to build the use case result it passes in.
      from: { path: '^src/presentation/', pathNot: '[.]api([.]test)?[.]ts$' },
      to: { path: '^src/domain/' },
    },
    {
      name: 'presentation-api-to-domain-type-only',
      severity: 'error',
      comment: `An api file may import domain only as types. It reads domain objects and does not make or judge them. See ${architecture}.`,
      from: { path: '^src/presentation/.+[.]api[.]ts$' },
      to: { path: '^src/domain/', dependencyTypesNot: ['type-only'] },
    },
    {
      name: 'infrastructure-only-to-domain-boundary',
      severity: 'error',
      comment: `infrastructure may import only the boundary types of domain (*.boundary.ts), not the domain model. See ${architecture}.`,
      // A parser test may pass the boundary types it made to the domain model to check the spec items it verifies end to end.
      from: { path: '^src/infrastructure/', pathNot: '[.]test[.]ts$' },
      to: { path: '^src/domain/', pathNot: '[.]boundary[.]ts$' },
    },
    {
      name: 'domain-boundary-only-to-boundary',
      severity: 'error',
      comment: `A boundary type may use only other boundary types, so that it cannot carry the domain model out of domain. See ${architecture}.`,
      from: { path: '^src/domain/.+[.]boundary[.]ts$' },
      to: { path: '^src/domain/', pathNot: '[.]boundary[.]ts$' },
    },
    {
      name: 'presentation-adapters-only-to-public',
      severity: 'error',
      comment: `A driving adapter may use another driving adapter only through its public types (*.public.ts), as a package user does. See ${directories}.`,
      from: { path: '^src/presentation/([^/]+)/' },
      to: { path: '^src/presentation/', pathNot: ['^src/presentation/$1/', '[.]public[.]ts$'] },
    },
    {
      name: 'bin-not-to-inner-layers',
      severity: 'error',
      comment: `src/bin.ts must not wire adapters. Only src/index.ts wires them, and the CLI calls the library API. See ${architecture}.`,
      from: { path: '^src/bin[.]ts$' },
      to: { path: '^src/(domain|application|infrastructure)/' },
    },
    {
      name: 'public-only-to-public',
      severity: 'error',
      comment: `A public type (*.public.ts) may use only other public types, so that no internal type becomes part of the package API. See ${architecture}.`,
      from: { path: '[.]public[.]ts$' },
      to: { path: '^src/', pathNot: '[.]public[.]ts$' },
    },
    {
      name: 'lib-not-to-src',
      severity: 'error',
      comment: `lib is used by every layer and must import nothing in src outside lib. See ${architecture}.`,
      from: { path: '^src/lib/' },
      to: { path: '^src/', pathNot: '^src/lib/' },
    },
    {
      name: 'domain-shared-not-to-other-contexts',
      severity: 'error',
      comment: `domain/shared is used by every domain context and must not import them. See ${contexts}.`,
      from: { path: '^src/domain/shared/' },
      to: { path: '^src/domain/(spec|test|coverage)/' },
    },
    {
      name: 'domain-spec-not-to-test-or-coverage',
      severity: 'error',
      comment: `domain/spec must not know about tests or coverage. See ${contexts}.`,
      from: { path: '^src/domain/spec/' },
      to: { path: '^src/domain/(test|coverage)/' },
    },
    {
      name: 'domain-test-not-to-coverage',
      severity: 'error',
      comment: `domain/test must not know about coverage. See ${contexts}.`,
      from: { path: '^src/domain/test/' },
      to: { path: '^src/domain/coverage/' },
    },
    {
      name: 'application-contexts-not-to-each-other',
      severity: 'error',
      comment: `Only application/coverage may import the other application contexts. See ${contexts}.`,
      from: { path: '^src/application/(spec|test|file)/' },
      to: { path: '^src/application/', pathNot: '^src/application/$1/' },
    },
    {
      name: 'infrastructure-adapters-not-to-each-other',
      severity: 'error',
      comment: `Each infrastructure directory is one driven adapter and must not import another adapter. See ${contexts}.`,
      from: { path: '^src/infrastructure/([^/]+)/' },
      to: { path: '^src/infrastructure/', pathNot: '^src/infrastructure/$1/' },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      comment: 'The rules above cannot check an import that cannot be resolved.',
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: ['node_modules'] },
    parser: 'swc',
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
  },
}

export default config
