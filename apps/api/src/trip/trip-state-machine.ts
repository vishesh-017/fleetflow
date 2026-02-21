import { TripStatus } from '@prisma/client';

export type TripAction = 'DISPATCH' | 'START' | 'COMPLETE' | 'CANCEL';

/**
 * Pure function: (currentStatus, action) => newStatus or throws.
 * DRAFT → DISPATCHED → IN_PROGRESS → COMPLETED
 * DRAFT | DISPATCHED → CANCELLED
 */
export function transitionTripStatus(currentStatus: TripStatus, action: TripAction): TripStatus {
  switch (action) {
    case 'DISPATCH':
      if (currentStatus !== TripStatus.DRAFT) {
        throw new Error(`Cannot dispatch trip in status ${currentStatus}. Expected DRAFT.`);
      }
      return TripStatus.DISPATCHED;

    case 'START':
      if (currentStatus !== TripStatus.DISPATCHED) {
        throw new Error(`Cannot start trip in status ${currentStatus}. Expected DISPATCHED.`);
      }
      return TripStatus.IN_PROGRESS;

    case 'COMPLETE':
      if (currentStatus !== TripStatus.IN_PROGRESS) {
        throw new Error(`Cannot complete trip in status ${currentStatus}. Expected IN_PROGRESS.`);
      }
      return TripStatus.COMPLETED;

    case 'CANCEL':
      if (currentStatus !== TripStatus.DRAFT && currentStatus !== TripStatus.DISPATCHED) {
        throw new Error(`Cannot cancel trip in status ${currentStatus}. Only DRAFT or DISPATCHED can be cancelled.`);
      }
      return TripStatus.CANCELLED;

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export function isActiveStatus(status: TripStatus): boolean {
  return status === TripStatus.DISPATCHED || status === TripStatus.IN_PROGRESS;
}
