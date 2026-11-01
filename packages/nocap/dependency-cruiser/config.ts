import type { IConfiguration } from 'dependency-cruiser'

const architecture = 'docs/architecture.md#의존성-규칙'

const config: IConfiguration = {
  forbidden: [
    {
      name: 'domain-not-to-outer-layers',
      severity: 'error',
      comment: `domain은 가장 안쪽 레이어라 application, infrastructure, presentation을 import하지 않는다. ${architecture} 참고.`,
      from: { path: '^src/domain/' },
      to: { path: '^src/(application|infrastructure|presentation)/' },
    },
    {
      name: 'application-not-to-outer-layers',
      severity: 'error',
      comment: `application은 infrastructure, presentation을 import하지 않는다. ${architecture} 참고.`,
      from: { path: '^src/application/' },
      to: { path: '^src/(infrastructure|presentation)/' },
    },
    {
      name: 'infrastructure-not-to-presentation',
      severity: 'error',
      comment: `infrastructure는 presentation을 import하지 않는다. ${architecture} 참고.`,
      from: { path: '^src/infrastructure/' },
      to: { path: '^src/presentation/' },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      comment: '해석할 수 없는 import가 있으면 위 규칙이 그 import를 검사하지 못한다.',
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
