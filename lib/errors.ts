export class AppError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message)
    this.name = this.constructor.name
  }
}

export class LockerUnavailableError extends AppError {
  constructor() {
    super('No available lockers fit the parcel dimensions', 'LOCKER_UNAVAILABLE')
  }
}

export class LockerNotHeldError extends AppError {
  constructor() {
    super('Locker is not in HOLD state — call hold first', 'LOCKER_NOT_HELD')
  }
}

export class HoldExpiredError extends AppError {
  constructor() {
    super('Locker hold has expired — please reserve again', 'HOLD_EXPIRED')
  }
}

export class ParcelTooLargeError extends AppError {
  constructor(dims: string) {
    super(`Parcel (${dims} cm) exceeds the largest locker`, 'PARCEL_TOO_LARGE')
  }
}

export class InvalidCodeError extends AppError {
  constructor() {
    super('Invalid or expired pickup code', 'INVALID_CODE')
  }
}
