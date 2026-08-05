import type { ApiError } from '../types';

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as ApiError;
  return apiError.response?.data?.message || apiError.message || fallback;
}
