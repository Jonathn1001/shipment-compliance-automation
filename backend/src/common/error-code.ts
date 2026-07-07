import { HttpStatus } from '@nestjs/common';

/**
 * Canonical API error codes. The **code** is the stable contract a client
 * branches on; the human message beside it may change without breaking callers.
 * Codes are namespaced `SCA-<AREA>-<NNN>` (SCA = Shipment Compliance Automation)
 * and catalogued in one place — modelled on the companion-bot CBS-* catalog.
 *
 * Categories:
 *   SHIP - shipment resource + lifecycle
 *   VAL  - request-input validation
 *   GEN  - generic client error (framework 4xx we do not raise ourselves)
 *   INT  - uncategorised server fault
 */
export enum ErrorCode {
  // SCA-SHIP-*: shipment resource + lifecycle.
  SHIPMENT_NOT_FOUND = 'SCA-SHIP-001',
  SHIPMENT_BLOCKED = 'SCA-SHIP-002',

  // SCA-VAL-*: request-input validation. Paired with HTTP 422; the offending
  // fields ride in `error.details` so the client branches without parsing prose.
  VALIDATION_ERROR = 'SCA-VAL-001',

  // SCA-GEN-001: a client (4xx) error we did not raise deliberately (e.g. an
  // unmatched route). Carries the framework's real status; not a domain code.
  CLIENT_ERROR = 'SCA-GEN-001',

  // SCA-INT-001: uncategorised server fault. The raw cause is logged
  // server-side and never returned to the client.
  INTERNAL_ERROR = 'SCA-INT-001',
}

/** Default HTTP status + client-safe message for each code. */
export const ERROR_META: Record<
  ErrorCode,
  { status: HttpStatus; message: string }
> = {
  [ErrorCode.SHIPMENT_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Shipment not found.',
  },
  [ErrorCode.SHIPMENT_BLOCKED]: {
    status: HttpStatus.CONFLICT,
    message:
      'A BLOCKED shipment cannot be approved; resolve blocking issues first.',
  },
  [ErrorCode.VALIDATION_ERROR]: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    message: 'Request validation failed.',
  },
  [ErrorCode.CLIENT_ERROR]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Bad request.',
  },
  [ErrorCode.INTERNAL_ERROR]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error.',
  },
};
