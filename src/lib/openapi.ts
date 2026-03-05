import type { ZodSchema } from "zod";

export interface OpenAPIPath {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  delete?: OpenAPIOperation;
}

export interface OpenAPIOperation {
  summary: string;
  description?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  security?: Array<Record<string, string[]>>;
}

export interface OpenAPIParameter {
  name: string;
  in: "query" | "path" | "header";
  required?: boolean;
  description?: string;
  schema: OpenAPISchema;
}

export interface OpenAPIRequestBody {
  required?: boolean;
  content: Record<string, OpenAPIMediaType>;
}

export interface OpenAPIResponse {
  description: string;
  content?: Record<string, OpenAPIMediaType>;
}

export interface OpenAPIMediaType {
  schema: OpenAPISchema;
}

export interface OpenAPISchema {
  type?: string;
  properties?: Record<string, OpenAPISchema>;
  items?: OpenAPISchema;
  required?: string[];
  enum?: unknown[];
  format?: string;
  $ref?: string;
}

export interface OpenAPIDocument {
  openapi: string;
  info: OpenAPIInfo;
  servers: OpenAPIServer[];
  paths: Record<string, OpenAPIPath>;
  components: OpenAPIComponents;
  security: Array<Record<string, string[]>>;
}

export interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
  contact?: {
    name: string;
    email: string;
  };
}

export interface OpenAPIServer {
  url: string;
  description?: string;
}

export interface OpenAPIComponents {
  schemas: Record<string, OpenAPISchema>;
  securitySchemes: Record<string, OpenAPISecurityScheme>;
}

export interface OpenAPISecurityScheme {
  type: string;
  scheme?: string;
  bearerFormat?: string;
  flows?: Record<string, OpenAPIOAuthFlows>;
}

export interface OpenAPIOAuthFlows {
  authorizationUrl?: string;
  tokenUrl?: string;
  scopes: Record<string, string>;
}

export function createOpenAPIDocument(title: string, version: string): OpenAPIDocument {
  return {
    openapi: "3.0.3",
    info: {
      title,
      version,
      contact: {
        name: "Luminary Lab Support",
        email: "support@luminarylab.com",
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        description: process.env.NODE_ENV || "development",
      },
    ],
    paths: {},
    components: {
      schemas: {},
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  };
}

export function zodToOpenAPI(schema: ZodSchema): OpenAPISchema {
  const parsed = schema._def as any;
  
  if (parsed.typeName === "ZodObject") {
    const objDef = parsed;
    const properties: Record<string, OpenAPISchema> = {};
    const required: string[] = [];
    
    for (const [key, value] of Object.entries(objDef.shape())) {
      properties[key] = zodToOpenAPI(value as ZodSchema);
      const valueDef = (value as any)._def;
      if (valueDef.required) {
        required.push(key);
      }
    }
    
    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }
  
  if (parsed.typeName === "ZodString") {
    return { type: "string" };
  }
  
  if (parsed.typeName === "ZodNumber") {
    return { type: "number" };
  }
  
  if (parsed.typeName === "ZodBoolean") {
    return { type: "boolean" };
  }
  
  if (parsed.typeName === "ZodArray") {
    const arrDef = parsed as any;
    return {
      type: "array",
      items: zodToOpenAPI(arrDef.type),
    };
  }
  
  return { type: "string" };
}

export function addPathToDocument(
  doc: OpenAPIDocument,
  path: string,
  method: "get" | "post" | "put" | "patch" | "delete",
  operation: OpenAPIOperation
): void {
  if (!doc.paths[path]) {
    doc.paths[path] = {};
  }
  doc.paths[path][method] = operation;
}

export function addSchemaToDocument(
  doc: OpenAPIDocument,
  name: string,
  schema: OpenAPISchema
): void {
  doc.components.schemas[name] = schema;
}
