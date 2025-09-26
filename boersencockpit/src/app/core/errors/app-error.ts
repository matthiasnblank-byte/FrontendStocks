export class AppError extends Error {
  override readonly cause?: unknown;
  readonly code: string;

  constructor(message: string, code = 'APP/UNKNOWN', cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }
}

export const wrapZodError = (error: unknown, code: string, context?: string) =>
  new AppError(
    `Validation failed${context ? ` in ${context}` : ''}`,
    code,
    error
  );
