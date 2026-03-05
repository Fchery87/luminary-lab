import { db } from "@/db";
import { projects, images, processingJobs, users, systemStyles } from "@/db/schema";
import { eq, desc, asc, sql, and, inArray } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function normalizeQueryOptions(options: QueryOptions): Required<QueryOptions> {
  return {
    limit: Math.min(Math.max(1, options.limit || DEFAULT_LIMIT), MAX_LIMIT),
    offset: Math.max(0, options.offset || 0),
    orderBy: options.orderBy || "desc",
  };
}

export async function getUserProjectsOptimized(
  userId: string,
  options: QueryOptions = {}
): Promise<PaginatedResult<typeof projects.$inferSelect>> {
  const { limit, offset, orderBy } = normalizeQueryOptions(options);
  
  const orderFn = orderBy === "desc" ? desc : asc;

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(orderFn(projects.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(eq(projects.userId, userId)),
  ]);

  const total = Number(countResult[0]?.count || 0);
  
  return {
    data,
    total,
    page: Math.floor(offset / limit) + 1,
    limit,
    hasMore: offset + limit < total,
  };
}

export async function getProjectImagesOptimized(
  projectId: string,
  options: QueryOptions & { type?: string } = {}
): Promise<PaginatedResult<typeof images.$inferSelect>> {
  const { limit, offset, orderBy } = normalizeQueryOptions(options);
  const orderFn = orderBy === "desc" ? desc : asc;
  
  const conditions = [eq(images.projectId, projectId)];
  if (options.type) {
    conditions.push(eq(images.type, options.type));
  }

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(images)
      .where(and(...conditions))
      .orderBy(orderFn(images.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(images)
      .where(and(...conditions)),
  ]);

  const total = Number(countResult[0]?.count || 0);
  
  return {
    data,
    total,
    page: Math.floor(offset / limit) + 1,
    limit,
    hasMore: offset + limit < total,
  };
}

export async function getUserProcessingJobsOptimized(
  userId: string,
  options: QueryOptions & { status?: string } = {}
): Promise<PaginatedResult<typeof processingJobs.$inferSelect>> {
  const { limit, offset, orderBy } = normalizeQueryOptions(options);
  const orderFn = orderBy === "desc" ? desc : asc;
  
  const conditions = [eq(processingJobs.userId, userId)];
  if (options.status) {
    conditions.push(eq(processingJobs.status, options.status));
  }

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(processingJobs)
      .where(and(...conditions))
      .orderBy(orderFn(processingJobs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(processingJobs)
      .where(and(...conditions)),
  ]);

  const total = Number(countResult[0]?.count || 0);
  
  return {
    data,
    total,
    page: Math.floor(offset / limit) + 1,
    limit,
    hasMore: offset + limit < total,
  };
}

export async function getActiveProjectsByStatus(
  status: string,
  options: QueryOptions = {}
): Promise<PaginatedResult<typeof projects.$inferSelect>> {
  const { limit, offset, orderBy } = normalizeQueryOptions(options);
  const orderFn = orderBy === "desc" ? desc : asc;
  
  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(eq(projects.status, status))
      .orderBy(orderFn(projects.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(eq(projects.status, status)),
  ]);

  const total = Number(countResult[0]?.count || 0);
  
  return {
    data,
    total,
    page: Math.floor(offset / limit) + 1,
    limit,
    hasMore: offset + limit < total,
  };
}

export async function batchGetProjects(
  projectIds: string[]
): Promise<typeof projects.$inferSelect[]> {
  if (projectIds.length === 0) return [];
  
  return db
    .select()
    .from(projects)
    .where(inArray(projects.id, projectIds));
}

export async function batchGetImages(
  imageIds: string[]
): Promise<typeof images.$inferSelect[]> {
  if (imageIds.length === 0) return [];
  
  return db
    .select()
    .from(images)
    .where(inArray(images.id, imageIds));
}

export async function getProjectWithImages(
  projectId: string
): Promise<{ project: typeof projects.$inferSelect; images: typeof images.$inferSelect[] } | null> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return null;

  const projectImages = await db
    .select()
    .from(images)
    .where(eq(images.projectId, projectId));

  return { project, images: projectImages };
}

export async function getUserStats(userId: string): Promise<{
  totalProjects: number;
  completedProjects: number;
  processingJobs: number;
  totalUploads: number;
}> {
  const [projectStats, jobStats, imageStats] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`count(*) filter (where ${projects.status} = 'completed')`,
      })
      .from(projects)
      .where(eq(projects.userId, userId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(processingJobs)
      .where(and(eq(processingJobs.userId, userId), eq(processingJobs.status, "processing"))),
    db
      .select({ count: sql<number>`count(*)` })
      .from(images)
      .innerJoin(projects, eq(images.projectId, projects.id))
      .where(and(eq(projects.userId, userId), eq(images.type, "original"))),
  ]);

  return {
    totalProjects: Number(projectStats[0]?.total || 0),
    completedProjects: Number(projectStats[0]?.completed || 0),
    processingJobs: Number(jobStats[0]?.count || 0),
    totalUploads: Number(imageStats[0]?.count || 0),
  };
}

export async function getPendingJobsCount(): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(processingJobs)
    .where(eq(processingJobs.status, "queued"));
  
  return Number(result?.count || 0);
}

export async function getActiveWorkersCount(): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(processingJobs)
    .where(eq(processingJobs.status, "processing"));
  
  return Number(result?.count || 0);
}
