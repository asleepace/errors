type ScopeOptions = {
  label?: string
}

export interface Scope<K extends string = string, T = any> {
  readonly isGlobal: boolean
  readonly label: string
  readonly index: number
  readonly path: string
  set(key: K, value: T): this
  values(options: { recursive?: boolean }): IterableIterator<T>
  subscopes(options: { recursive?: boolean }): IterableIterator<Scope<K, T>>
  scopes(): IterableIterator<Scope<K, T>>
  create(options: ScopeOptions): Scope<K, T>
  tree(): Record<string, any>
  findPath(...path: string[]): Scope<K, T> | undefined
}

export function initializeGlobalScope<T = any>(): Scope<string, T> {
  const scopes = new Map<string, Scope>()

  const globalScope = createScope({ label: 'global' }) // pass empty parent path

  function createScope<K extends string>(
    options: ScopeOptions = {}
  ): Scope<K, T> {
    const data = new Map<string, T>()
    const children: Scope<K, T>[] = []
    const index = scopes.size
    const label = options.label ?? String(`scope_${index}`)

    const local: Scope<K, T> = {
      label,
      index,
      path: '/',
      get isGlobal() {
        return this.path === '/' || this.label === 'global'
      },
      findPath(path: string) {
        if (path === '/') return globalScope
        return scopes.get(path)
      },
      set(key: K, value: T) {
        data.set(key, value)
        return this
      },
      create(childOptions: ScopeOptions = {}) {
        // ↓ Pass this.path as parent
        const childScope = createScope(childOptions)
        const value = [
          this.path,
          this.isGlobal ? '' : '/',
          childScope.label,
        ].join('')
        Object.defineProperty(childScope, 'path', { value })
        children.push(childScope)
        scopes.set(childScope.path, childScope)
        return childScope
      },
      *scopes() {
        yield this
        yield* this.subscopes({ recursive: true })
      },
      *subscopes({ recursive = true }) {
        for (const childScope of children) {
          yield childScope
          if (recursive) {
            yield* childScope.subscopes({ recursive: true })
          }
        }
      },
      *values({ recursive = true } = {}) {
        yield* data.values()
        if (!recursive) return
        for (const child of children) {
          yield* child.values({ recursive: true })
        }
      },
      tree() {
        return {
          name: this.label,
          data: Object.fromEntries(data.entries()),
          children: children.map((child) => child.tree()),
        }
      },
    }
    return local
  }

  return globalScope
}
