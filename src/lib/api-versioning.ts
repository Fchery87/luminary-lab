export const API_VERSION = "v1";
export const API_BASE_PATH = `/api/${API_VERSION}`;

export type ApiVersion = "v1" | "v2";

export interface ApiVersionConfig {
  version: ApiVersion;
  deprecated?: boolean;
  sunsetDate?: string;
  features: string[];
}

export const API_VERSIONS: Record<ApiVersion, ApiVersionConfig> = {
  v1: {
    version: "v1",
    features: [
      "project-management",
      "image-upload",
      "image-processing",
      "batch-processing",
    ],
  },
  v2: {
    version: "v2",
    features: [
      "project-management",
      "image-upload",
      "image-processing",
      "batch-processing",
      "edit-history",
      "advanced-exports",
    ],
  },
};

export function getVersionFromHeader(acceptHeader: string): ApiVersion {
  const match = acceptHeader.match(/application\/vnd\.luminary\.v(\d+)\+json/);
  if (match) {
    const version = parseInt(match[1], 10);
    if (version === 2) return "v2";
  }
  return "v1";
}

export function getVersionFromPath(path: string): ApiVersion {
  if (path.includes("/v2/")) return "v2";
  return "v1";
}

export function createVersionedResponse<T>(
  data: T,
  version: ApiVersion = "v1"
): Response {
  const config = API_VERSIONS[version];
  
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": `application/vnd.luminary.${version}+json`,
      "X-API-Version": version,
      "X-API-Features": config.features.join(","),
    },
  });
}

export function isVersionSupported(version: string): version is ApiVersion {
  return version === "v1" || version === "v2";
}

export function getDeprecationHeader(version: ApiVersion): Record<string, string> {
  const config = API_VERSIONS[version];
  if (config.deprecated || config.sunsetDate) {
    return {
      Deprecation: "true",
      "Sunset": config.sunsetDate || "",
      Link: '</api/v2/>; rel="successor-version"',
    };
  }
  return {};
}
