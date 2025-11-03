# Exception

Error handling which sucks less.

```ts
import { Exception } from '@asleepace/exception'

// example #1: create custom errors by destructuring
const { InvalidProperty, InvalidParameters, InvalidString } = Exception.enum()

// example #2: can also destructure like so:
const {
  404: NotFound,
  401: NotAuthorized,
  500: InternalServerError,
} = Exception.enum({ label: 'http' })

function example(request: Request) {
  try {
    throw NotFound(request.url)
  } catch (e: unknown) {
    console.log(e instanceof Error) // true
    console.log(e instanceof NotFound) // true
    return http.match(e).transform({})
  }
}
```

## API

```ts
// you can destructure to any valid symbol name
const { Key1, Key2, Key3 } = Exception.enum()

// you can destructure to any valid symbol name
const { 404: NotFound, Key2, Key3 } = Exception.enum()
```
