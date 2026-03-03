/**
 * Pagination utilities for list endpoints
 */

import { z } from "zod";

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const pages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
  };
}

/**
 * Calculate database offset from page and limit
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Build paginated response
 */
export function getPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResponse<T> {
  return {
    data,
    meta: calculatePagination(page, limit, total),
  };
}

/**
 * Extract pagination query params from request URL
 */
export function extractPaginationParams(url: URL): PaginationQuery {
  return PaginationQuerySchema.parse({
    page: url.searchParams.get("page") || undefined,
    limit: url.searchParams.get("limit") || undefined,
  });
}
