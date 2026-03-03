import { describe, it, expect } from "vitest";
import { CDNClient } from "@/lib/cdn";

describe("cdn", () => {
  const cdn = new CDNClient("https://cdn.example.com", "images");

  it("should generate image URL without params", () => {
    const url = cdn.getImageUrl("users/123/file.jpg");
    expect(url).toBe("https://cdn.example.com/images/users/123/file.jpg");
  });

  it("should add optimization params", () => {
    const url = cdn.getImageUrl("users/123/file.jpg", {
      width: 800,
      height: 600,
      quality: 85,
    });

    expect(url).toContain("w=800");
    expect(url).toContain("h=600");
    expect(url).toContain("q=85");
  });

  it("should generate thumbnail URL", () => {
    const url = cdn.getThumbnailUrl("users/123/file.jpg");

    expect(url).toContain("w=400");
    expect(url).toContain("h=300");
    expect(url).toContain("q=80");
    expect(url).toContain("f=webp");
  });

  it("should generate preview URL", () => {
    const url = cdn.getPreviewUrl("users/123/file.jpg");

    expect(url).toContain("w=1200");
    expect(url).toContain("h=900");
    expect(url).toContain("q=85");
  });

  it("should generate full resolution URL", () => {
    const url = cdn.getFullUrl("users/123/file.jpg");

    expect(url).toContain("q=92");
    // format is only added if not 'auto'
    expect(url).toContain("users/123/file.jpg");
  });

  it("should handle format selection", () => {
    const url = cdn.getImageUrl("users/123/file.jpg", {
      format: "avif",
    });

    expect(url).toContain("f=avif");
  });
});
