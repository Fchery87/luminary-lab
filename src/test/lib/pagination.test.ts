import { describe, it, expect } from "vitest";
import {
  calculatePagination,
  calculateOffset,
  getPaginatedResponse,
  PaginationQuerySchema,
  extractPaginationParams,
} from "@/lib/pagination";

describe("pagination", () => {
  describe("PaginationQuerySchema", () => {
    it("should validate valid pagination query", () => {
      const result = PaginationQuerySchema.parse({ page: 2, limit: 20 });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
    });

    it("should use defaults when not provided", () => {
      const result = PaginationQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it("should enforce max limit of 100", () => {
      expect(() => PaginationQuerySchema.parse({ limit: 101 })).toThrow();
    });

    it("should coerce string to number", () => {
      const result = PaginationQuerySchema.parse({ page: "3", limit: "50" });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(50);
    });
  });

  describe("calculatePagination", () => {
    it("should calculate correct pagination metadata", () => {
      const meta = calculatePagination(2, 20, 100);
      expect(meta.page).toBe(2);
      expect(meta.limit).toBe(20);
      expect(meta.total).toBe(100);
      expect(meta.pages).toBe(5);
      expect(meta.hasNext).toBe(true);
      expect(meta.hasPrev).toBe(true);
    });

    it("should detect first page", () => {
      const meta = calculatePagination(1, 20, 100);
      expect(meta.hasPrev).toBe(false);
      expect(meta.hasNext).toBe(true);
    });

    it("should detect last page", () => {
      const meta = calculatePagination(5, 20, 100);
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(true);
    });

    it("should handle single page", () => {
      const meta = calculatePagination(1, 100, 50);
      expect(meta.pages).toBe(1);
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(false);
    });
  });

  describe("calculateOffset", () => {
    it("should calculate correct offset", () => {
      expect(calculateOffset(1, 20)).toBe(0);
      expect(calculateOffset(2, 20)).toBe(20);
      expect(calculateOffset(3, 50)).toBe(100);
    });
  });

  describe("getPaginatedResponse", () => {
    it("should build paginated response", () => {
      const data = [{ id: "1" }, { id: "2" }];
      const response = getPaginatedResponse(data, 1, 20, 100);

      expect(response.data).toEqual(data);
      expect(response.meta.page).toBe(1);
      expect(response.meta.limit).toBe(20);
      expect(response.meta.total).toBe(100);
    });
  });

  describe("extractPaginationParams", () => {
    it("should extract pagination params from URL", () => {
      const url = new URL("https://example.com/api?page=2&limit=50");
      const params = extractPaginationParams(url);

      expect(params.page).toBe(2);
      expect(params.limit).toBe(50);
    });

    it("should use defaults when params missing", () => {
      const url = new URL("https://example.com/api");
      const params = extractPaginationParams(url);

      expect(params.page).toBe(1);
      expect(params.limit).toBe(20);
    });
  });
});
