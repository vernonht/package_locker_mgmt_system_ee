export const COMMON_LABELS = {
  REFRESH: 'Refresh',
  CANCEL: 'Cancel',
} as const

export const ERROR_MESSAGES = {
  CREATE_LOCKER_FAILED: 'Failed to create locker.',
  SOMETHING_WENT_WRONG: 'Something went wrong',
  SOMETHING_WENT_WRONG_RETRY: 'Something went wrong. Please try again.',
  INVALID_LOCKER_OR_PICKUP_CODE: 'Invalid locker number or pickup code.',
} as const

export const PICKUP_STEPS = {
  ENTER_CODE: 'enter-code',
  CHARGE_SCREEN: 'charge-screen',
  LOCKER_OPEN: 'locker-open',
} as const
