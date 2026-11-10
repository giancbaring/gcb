export type ContractKind = 'primitive' | 'function' | 'composition' | 'module' | 'api'
export type ContractStatus = 'valid' | 'error'

export type DependencyBucket = 'primitives' | 'functions' | 'compositions' | 'modules'

export type ContractInterface = {
  inputs: { name: string; type: string; required?: boolean }[]
  outputs: { type: string }[]
}

export type ContractNode = {
  id: string
  kind: ContractKind
  domain: string
  api?: string
  module?: string
  status: ContractStatus
  sourcePath: string
  requires: string[]
  requiredBy: string[]
  interface?: ContractInterface
}

export type DependencyDeclarations = Partial<Record<DependencyBucket, string[]>>

export type IndexedContract = {
  node: ContractNode
  dependencies: DependencyDeclarations
}

export type ContractSource = {
  path: string
  status?: ContractStatus
}

const contractKinds = new Set<ContractKind>(['primitive', 'function', 'composition', 'module', 'api'])
const dependencyBuckets: DependencyBucket[] = ['primitives', 'functions', 'compositions', 'modules']

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label} must be a string`)
  return value
}

function stringList(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`)
  return value.map((item, index) => stringValue(item, `${label}[${index}]`))
}

function normalizeInterface(value: unknown): ContractInterface {
  const source = record(value, 'interface')
  if (!Array.isArray(source.inputs)) throw new Error('interface.inputs must be an array')
  if (!Array.isArray(source.outputs)) throw new Error('interface.outputs must be an array')

  const inputs = source.inputs.map((input, index) => {
    const item = record(input, `interface.inputs[${index}]`)
    const normalized: ContractInterface['inputs'][number] = {
      name: stringValue(item.name, `interface.inputs[${index}].name`),
      type: stringValue(item.type, `interface.inputs[${index}].type`),
    }
    if (Object.hasOwn(item, 'required')) {
      if (typeof item.required !== 'boolean') throw new Error(`interface.inputs[${index}].required must be a boolean`)
      normalized.required = item.required
    }
    return normalized
  })

  const outputs = source.outputs.map((output, index) => {
    const item = record(output, `interface.outputs[${index}]`)
    return { type: stringValue(item.type, `interface.outputs[${index}].type`) }
  })

  return { inputs, outputs }
}

export function normalizeContract(value: unknown, source: ContractSource): IndexedContract {
  const contract = record(value, source.path)
  const id = stringValue(contract.id, `${source.path}.id`)
  const kindValue = stringValue(contract.kind, `${source.path}.kind`)
  if (!contractKinds.has(kindValue as ContractKind)) throw new Error(`${source.path}.kind is unsupported: ${kindValue}`)

  const dependencies: DependencyDeclarations = {}
  if (Object.hasOwn(contract, 'depends_on')) {
    const dependsOn = record(contract.depends_on, `${source.path}.depends_on`)
    for (const bucket of dependencyBuckets) {
      if (Object.hasOwn(dependsOn, bucket)) {
        dependencies[bucket] = stringList(dependsOn[bucket], `${source.path}.depends_on.${bucket}`)
      }
    }
  }

  const node: ContractNode = {
    id,
    kind: kindValue as ContractKind,
    domain: stringValue(contract.domain, `${source.path}.domain`),
    status: source.status ?? 'valid',
    sourcePath: source.path,
    requires: [...new Set(Object.values(dependencies).flat())],
    requiredBy: [],
  }

  if (Object.hasOwn(contract, 'api')) node.api = stringValue(contract.api, `${source.path}.api`)
  if (Object.hasOwn(contract, 'module')) node.module = stringValue(contract.module, `${source.path}.module`)
  if (Object.hasOwn(contract, 'interface')) node.interface = normalizeInterface(contract.interface)

  return { node, dependencies }
}