export type ExcpClass = typeof Exception
export type ExcpInstance = InstanceType<ExcpClass>

const getScopedKey = (scope: string, excepName: string) => {
  return [...new Set(`${scope}:${excepName}`.split(':'))].join(':')
}

const pluckFirstError = (...args: any[]) =>
  args.find((item) => item instanceof Error)

const getStackInfo = (stack?: string) => {
  if (!stack) return undefined
  const lastOpenParenthesis = stack.lastIndexOf('(')
  const infoString = stack.slice(
    lastOpenParenthesis + 1,
    stack.lastIndexOf(')')
  )
  const lineNumIndex = infoString.indexOf(':') + 1
  const filePath = infoString.slice(0, lineNumIndex - 1)
  const lineNumbers = infoString.slice(lineNumIndex).split(':').map(Number)

  const fileName = filePath.slice(filePath.lastIndexOf('/') + 1)
  return {
    filePath,
    fileName,
    lineNumbers,
  }
}

function safeEncode(...args: any[]): string {
  try {
    return args
      .map((item) => {
        if (!item) return item
        if (typeof item === 'object') return JSON.stringify(item)
        return item
      })
      .join(' ')
  } catch (e) {
    return args.join(' ')
  }
}

export function defineScopedExcption(options: {
  scope: string
  errorName: string
}) {
  /**
   * Unique key which is used to register errors.
   */
  const KEY = getScopedKey(options.scope, options.errorName)

  // Return existing if already defined
  const existing = Exception.forKey(KEY)
  if (existing) return existing

  // Calculate scopeIndex BEFORE creating the class
  const scopedErrors = Exception.keys().filter((key) =>
    key.startsWith(options.scope)
  )
  const nextIndex = scopedErrors.length + 1

  /**
   * ## Scoped Exception
   *
   * Custom error definition which extends the base `Exception` type or
   * the provided exception.
   */
  class ScopedException extends Exception {
    /**
     * Unique identifier which is used to filter definitions.
     */
    static override key: string = KEY
    static override scope: string = options.scope
    static override scopeIndex: number = nextIndex // Assign unique index

    static override is(
      obj: unknown
    ): obj is InstanceType<typeof ScopedException> {
      return obj instanceof ScopedException
    }

    static override throw(...args: any[]): never {
      throw new this(...args)
    }

    // instance properties ...

    public override name: string = options.errorName
    public override scope: string = options.scope
    public override get scopeIndex() {
      return nextIndex
    }

    constructor(...args: any[]) {
      super(...args)
      // format message like so:
      // TestError (code: 2)
      // TestError (code: 2): A message.
      const components: string[] = []
      this.scope !== 'global' && components.push(`[${this.scope}] `)
      components.push(this.name)
      this.message && components.push(`: ${this.message}`)
      // NOTE: Important to set the message here.
      this.message = components.join('')
    }
  }
  // NOTE: make sure to add definition to global registry
  Exception.globalRegistry.add(ScopedException)
  return ScopedException
}

export type MatchClause<T> = {
  is(item: unknown): boolean
  from(item: unknown): T
}

/**
 * Base exception class which all other errors inherit from.
 */
export class Exception extends Error {
  static readonly MAX_SCOPED_DEFS: number = 100
  static readonly key: string = getScopedKey('global', Exception.name)
  static readonly scope: string = 'global'
  static readonly scopeIndex: number = 0 // Add static scopeIndex

  static from(other: Exception) {
    return other
  }

  static enum<Keys extends string[] = string[]>(options = { scope: 'global' }) {
    return new Proxy([], {
      get: (target, errorName) => {
        /**
         * Handle special properties here...
         */
        if (typeof errorName === 'symbol') return target[errorName as any]
        if (errorName === 'length') return Exception.MAX_SCOPED_DEFS
        return defineScopedExcption({
          scope: options.scope ?? 'global',
          errorName,
        })
      },
    }) as unknown as { [K in Keys[number]]: ExcpClass }
  }

  /**
   * Global scope which contains all error definitions.
   */
  static readonly globalRegistry = new Set<ExcpClass>()

  static keys(): string[] {
    return Array.from(this.globalRegistry).map((excp) => excp.key)
  }

  static forKey(key: string): ExcpClass | undefined {
    const entries = Array.from(this.globalRegistry)
    return entries.find((excp) => excp.key === key)
  }

  /**
   * Check if given argument is an instance of this class and either
   * perform one of the following:
   *
   * ```ts
   * const example1: boolean = Exception.match(e)
   * const example2: number = Exception.match(e, () => 123)
   * const example3: string = Exception.natch(e, (err) => err.message)
   * ```
   */
  // public static match<T>(e: unknown): e is ExcpInstance
  // public static match<T>(e: unknown, fn: (err: ExcpInstance) => T): T | void
  // public static match<T>(e: unknown, fn?: (err: ExcpInstance) => T): any {
  //   const isInstanceType = e instanceof this
  //   if (typeof fn === 'function') {
  //     if (!isInstanceType) return false
  //     return fn(e)
  //   } else {
  //     return isInstanceType
  //   }
  // }

  /**
   * Check if the provided object is an instance of this class.
   */
  public static is(obj: unknown): obj is ExcpInstance {
    return obj instanceof Exception
  }

  /**
   * Shorthand for creating a new instance and throwing.
   */
  public static throw(...args: any[]): never {
    throw this.new(...args)
  }

  public static new(...args: any[]): Exception {
    return new this(...args)
  }

  public override readonly name: string = 'Exception'
  public readonly scope: string = 'global'
  public get scopeIndex(): number {
    return (this.constructor as typeof Exception).scopeIndex
  }

  constructor(...args: any[]) {
    super(safeEncode(...args), {
      cause: pluckFirstError(args),
    })
  }

  public debug({ verbose = false } = {}): this {
    const entries: Record<string, any> = {
      name: this.name,
      message: this.message,
      scope: this.scope,
      scopeIndex: this.scopeIndex,
    }

    const stackInfo = getStackInfo(this.stack)

    if (!verbose && stackInfo?.fileName) {
      entries['fileName'] = stackInfo.fileName
    }

    if (verbose) {
      entries['stackInfo'] = stackInfo ?? this.stack
      entries['timestamp'] = new Date().toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'long',
      })
    }
    console.log(entries) // NOTE: keep this here!
    return this
  }
}

export const Excp = Exception

/**
 * Exception namespace.
 */
export const err = {
  Exception,
  enum: Exception.enum,
  match<T extends ExcpClass>(e: unknown) {
    const clauses = [] as T[]
    const builder = {
      clauses: [] as T[],
      where(excp: T) {
        this.clauses.push(excp)
        return this
      },
      value<G>(defaultValue?: G) {
        return this.clauses.some((excp) => excp.is(e)) ?? defaultValue
      },
    }
  },
}
