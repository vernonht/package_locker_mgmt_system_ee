import {
  LockerUnavailableError,
  LockerNotHeldError,
  HoldExpiredError,
  ParcelTooLargeError,
  InvalidCodeError,
} from '@/lib/errors'

export const handleError = (err: unknown): Response => {
  if (err instanceof ParcelTooLargeError)
    return Response.json({ error: err.message, code: err.code }, { status: 422 })
  if (err instanceof LockerUnavailableError)
    return Response.json({ error: err.message, code: err.code }, { status: 409 })
  if (err instanceof LockerNotHeldError)
    return Response.json({ error: err.message, code: err.code }, { status: 409 })
  if (err instanceof HoldExpiredError)
    return Response.json({ error: err.message, code: err.code }, { status: 410 })
  if (err instanceof InvalidCodeError)
    return Response.json({ error: err.message, code: err.code }, { status: 404 })
  throw err
}
