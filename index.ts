import { Exception } from "./src"

const {
  UnknownError,
  InvalidProperty,
  InvalidParameters,
  InvalidString,
} = Exception.enum()

const {
  NotFound,
  NotAuthorized,
  InternalServerError
} = Exception.enum({ scope: 'http' })

function example(request: Request) {
  try {
    throw new NotFound(request.url)
  } catch (e: unknown) {


    // makes it easier to handle
    return Exception.pattern([
      NotAuthorized,
      NotFound,
      Exception.any
    ]).match(e)
}