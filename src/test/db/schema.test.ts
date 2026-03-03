import { test, expect } from "bun:test";
import { images } from "@/db/schema";

test("images table should have blurHash column", () => {
  const columnNames = Object.keys(images);
  expect(columnNames).toContain("blurHash");
});

test("images table should have isPreview column", () => {
  const columnNames = Object.keys(images);
  expect(columnNames).toContain("isPreview");
});

test("images table should have previewImageType column", () => {
  const columnNames = Object.keys(images);
  expect(columnNames).toContain("previewImageType");
});
