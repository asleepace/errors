import { describe, expect, test } from 'bun:test'
import { initializeGlobalScope, type Scope } from '../src/scope'

describe('Scope', () => {
  test('creates global scope with correct label and index', () => {
    const scope = initializeGlobalScope()
    expect(scope.label).toBe('global')
    expect(scope.index).toBe(0)
  })

  test('sets and retrieves values', () => {
    const scope = initializeGlobalScope<number>()
    scope.set('a', 1).set('b', 2)

    const values = Array.from(scope.values({ recursive: false }))
    expect(values).toEqual([1, 2])
  })

  test('creates child scopes with auto-generated labels', () => {
    const scope = initializeGlobalScope()
    const child1 = scope.create({})
    const child2 = scope.create({})

    expect(child1.label).toBe('scope_0')
    expect(child2.label).toBe('scope_1')
    expect(child1.index).toBe(0)
    expect(child2.index).toBe(1)
  })

  test('creates child scopes with custom labels', () => {
    const scope = initializeGlobalScope()
    const child = scope.create({ label: 'myScope' })

    expect(child.label).toBe('myScope')
  })

  test('values() with recursive=false returns only local values', () => {
    const scope = initializeGlobalScope<number>()
    scope.set('a', 1)
    const child = scope.create({})
    child.set('b', 2)

    const values = Array.from(scope.values({ recursive: false }))
    expect(values).toEqual([1])
  })

  test('values() with recursive=true returns all descendant values', () => {
    const scope = initializeGlobalScope<number>()
    scope.set('a', 1)
    const child1 = scope.create({})
    child1.set('b', 2)
    const child2 = child1.create({})
    child2.set('c', 3)

    const values = Array.from(scope.values({ recursive: true }))
    expect(values).toEqual([1, 2, 3])
  })

  test('subscopes() with recursive=false returns only direct children', () => {
    const scope = initializeGlobalScope()
    const child1 = scope.create({ label: 'a' })
    const child2 = scope.create({ label: 'b' })
    child1.create({ label: 'c' })

    const subscopes = Array.from(scope.subscopes({ recursive: false }))
    expect(subscopes.map((s) => s.label)).toEqual(['a', 'b'])
  })

  test('subscopes() with recursive=true returns all descendants', () => {
    const scope = initializeGlobalScope()
    const a = scope.create({ label: 'a' })
    const b = a.create({ label: 'b' })
    b.create({ label: 'c' })
    scope.create({ label: 'd' })

    const subscopes = Array.from(scope.subscopes({ recursive: true }))
    expect(subscopes.map((s) => s.label)).toEqual(['a', 'b', 'c', 'd'])
  })

  test('scopes() returns self and all descendants', () => {
    const scope = initializeGlobalScope()
    const a = scope.create({ label: 'a' })
    a.create({ label: 'b' })
    scope.create({ label: 'c' })

    const scopes = Array.from(scope.scopes())
    expect(scopes.map((s) => s.label)).toEqual(['global', 'a', 'b', 'c'])
  })

  test('tree() returns correct structure', () => {
    const scope = initializeGlobalScope<number>()
    scope.set('x', 10)
    const child = scope.create({ label: 'child' })
    child.set('y', 20)

    const tree = scope.tree()
    expect(tree).toEqual({
      name: 'global',
      data: { x: 10 },
      children: [
        {
          name: 'child',
          data: { y: 20 },
          children: [],
        },
      ],
    })
  })

  test('chaining create() works correctly', () => {
    const scope = initializeGlobalScope()
    const deepScope = scope
      .create({ label: 'a' })
      .create({ label: 'b' })
      .create({ label: 'c' })

    expect(deepScope.label).toBe('c')

    const allScopes = Array.from(scope.scopes())
    expect(allScopes.map((s) => s.label)).toEqual(['global', 'a', 'b', 'c'])
  })

  test('set() returns this for chaining', () => {
    const scope = initializeGlobalScope<number>()
    const result = scope.set('a', 1).set('b', 2).set('c', 3)

    expect(result).toBe(scope)
    const values = Array.from(scope.values({ recursive: false }))
    expect(values).toEqual([1, 2, 3])
  })

  test('paths are constructed correctly', () => {
    const scope = initializeGlobalScope()
    expect(scope.path).toBe('/')

    const a = scope.create({ label: 'a' })
    expect(a.path).toBe('/a')

    const b = a.create({ label: 'b' })
    expect(b.path).toBe('/a/b')

    const c = b.create({ label: 'c' })
    expect(c.path).toBe('/a/b/c')
  })

  test('findPath() finds scopes by path', () => {
    const scope = initializeGlobalScope()
    const a = scope.create({ label: 'a' })
    const b = a.create({ label: 'b' })
    const c = scope.create({ label: 'c' })

    expect(scope.findPath('/')).toBe(scope)
    expect(scope.findPath('/a')).toBe(a)
    expect(scope.findPath('/a/b')).toBe(b)
    expect(scope.findPath('/c')).toBe(c)
    expect(scope.findPath('/nonexistent')).toBeUndefined()
  })
})
