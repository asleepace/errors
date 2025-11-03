# Exception

Error handling which sucks less.

```bash
npm install @asleepace/exception
# or
bun i @asleepace/exception
```

### Goals

Exception handling is always treated as an after thought and not a first class citizen,
this project aims to modernize the APIs and provide much needed quality of life improvements such as:

1. Make exception handling easier & less verbose
2. Describe errors via explicit names vs. long messages
3. Allow passing multiple arguments as messages
4. Easier debugging and formatting

```ts
import { Exception } from '@asleepace/exception'

// example #1: create custom errors by destructuring
const { InvalidProperty, InvalidParameters, InvalidString } = Exception.enum()

// example #2: can also destructure like so:
const {
  404: NotFound,
  401: NotAuthorized,
  500: InternalServerError,
  scope,
} = Exception.enum({ label: 'http' })

function example(request: Request) {
  try {
    throw NotFound(request.url)
  } catch (e: unknown) {
    console.log(e instanceof Error) // true
    console.log(e instanceof NotFound) // true
    return NotFound.is(e)?.message ?? 'unknown error'
  }
}
```

## API

### 1. Enumeration

```ts
// you can destructure to any valid symbol name
const { Key1, Key2, Key3 } = Exception.enum()

// you can destructure to any valid symbol name
const {
  404: NotFound,
  401: NotAuthorized,
  500: InternalServerError,
  scope,
} = Exception.enum()

const error = new NotFound()

// scope is a special property which contains all definitions
const output = scope.match(error)?.into((exception): Response => {
  return Response.json(excp.toObject(), { status: excp.code ?? 500 })
})
```

### 2. Helpers

```ts
const { CustomError } = Exception.enum()

// static `.is(unknown): boolean` type-guard
if (CustomError.is(e)) {
  console.log(e.name === 'CustomError') // true!
}

// static method: `.cast(unknown): ExcpInstance` convert other data type to exception instance
const err: CustomError = CustomError.cast(new Error('normal error'))

// instance method: `.into<T>(transformFn): T` convert exception instance into other data type.
const out: string = new CustomError().into((err) => err.message)
```
