import type { IConfiguration } from 'dependency-cruiser'

const architecture = 'docs/architecture.md#의존성-규칙'
const contexts = 'docs/architecture.md#맥락-디렉토리'

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
      comment: `presentation must not import infrastructure. Only the entry points src/bin.ts and src/index.ts wire adapters. See ${architecture}.`,
      from: { path: '^src/presentation/' },
      to: { path: '^src/infrastructure/' },
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
