import type { IConfiguration } from 'dependency-cruiser'

const architecture = 'docs/architecture.md#의존성-규칙'

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
