import { AppError } from './app-error';

export interface SerializableError {
  readonly message: string;
  readonly code: string;
  readonly cause?: string | null;
}

export const serializeError = (error: unknown, defaultCode = 'APP/UNKNOWN'): SerializableError => {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      cause: serializeCause(error.cause),
    };
  }
  if (error instanceof Error) {
    return {
      message: error.message,
      code: defaultCode,
      cause: error.name,
    };
  }
  return {
    message: typeof error === 'string' ? error : 'Unknown error',
    code: defaultCode,
    cause: null,
  };
};

const serializeCause = (cause: unknown): string | null => {
  if (cause instanceof AppError) {
    return `${cause.code}: ${cause.message}`;
  }
  if (cause instanceof Error) {
    return `${cause.name}: ${cause.message}`;
  }
  if (typeof cause === 'string') {
    return cause;
  }
  return null;
};
