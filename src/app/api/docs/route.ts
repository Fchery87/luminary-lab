import { NextResponse } from "next/server";
import { createOpenAPIDocument, addPathToDocument, addSchemaToDocument, zodToOpenAPI } from "@/lib/openapi";
import { z } from "zod";

const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const ProjectListSchema = z.object({
  projects: z.array(ProjectSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export async function GET() {
  const doc = createOpenAPIDocument("Luminary Lab API", "1.0.0");
  
  doc.info.description = `
# Luminary Lab API

Image processing and management API for Luminary Lab.

## Authentication

All endpoints require authentication using JWT Bearer tokens.
Include the token in the Authorization header:

\`Authorization: Bearer <your-token>\`

## Rate Limiting

API requests are rate limited to 100 requests per minute per user.
  `;

  addSchemaToDocument(doc, "Project", zodToOpenAPI(ProjectSchema));
  addSchemaToDocument(doc, "ProjectList", zodToOpenAPI(ProjectListSchema));

  addPathToDocument(doc, "/projects", "get", {
    summary: "List all projects",
    description: "Get a paginated list of user projects",
    tags: ["Projects"],
    parameters: [
      {
        name: "page",
        in: "query",
        required: false,
        description: "Page number (default: 1)",
        schema: { type: "integer" },
      },
      {
        name: "limit",
        in: "query",
        required: false,
        description: "Items per page (default: 20, max: 100)",
        schema: { type: "integer" },
      },
    ],
    responses: {
      "200": {
        description: "Successful response",
        content: {
          "application/json": {
            schema: { type: "object", $ref: "#/components/schemas/ProjectList" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  });

  return NextResponse.json(doc, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
