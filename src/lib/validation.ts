import { z } from "zod";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export const UUIDSchema = z.string().uuid("Invalid UUID format");
export const ProjectIdSchema = z.string().min(1, "Project ID is required");
export const UserIdSchema = z.string().min(1, "User ID is required");
export const EmailSchema = z.string().email("Invalid email address");
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const ImageProcessingOptionsSchema = z.object({
  projectId: ProjectIdSchema,
  styleId: z.string().min(1, "Style ID is required"),
  intensity: z.number().min(0).max(100).default(50),
  format: z.enum(["jpeg", "png", "webp"]).default("jpeg"),
  quality: z.number().min(1).max(100).default(85),
});

export const BatchOperationSchema = z.object({
  projectIds: z.array(ProjectIdSchema).min(1, "At least one project required"),
  operation: z.enum(["process", "export", "delete"]),
  options: z.record(z.string(), z.unknown()).optional(),
});

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: ValidationError[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: ValidationError[] = result.error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
  
  return { success: false, errors };
}

export class FormValidator {
  static required(value: string, fieldName: string): ValidationError | null {
    if (!value || value.trim().length === 0) {
      return {
        field: fieldName,
        message: `${fieldName} is required`,
      };
    }
    return null;
  }

  static email(value: string, fieldName: string): ValidationError | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return {
        field: fieldName,
        message: "Please enter a valid email address",
      };
    }
    return null;
  }

  static minLength(
    value: string,
    minLength: number,
    fieldName: string,
  ): ValidationError | null {
    if (value.length < minLength) {
      return {
        field: fieldName,
        message: `${fieldName} must be at least ${minLength} characters long`,
      };
    }
    return null;
  }

  static maxLength(
    value: string,
    maxLength: number,
    fieldName: string,
  ): ValidationError | null {
    if (value.length > maxLength) {
      return {
        field: fieldName,
        message: `${fieldName} must not exceed ${maxLength} characters`,
      };
    }
    return null;
  }

  static fileSize(
    file: File,
    maxSize: number,
    fieldName: string,
  ): ValidationError | null {
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return {
        field: fieldName,
        message: `File size must be less than ${maxSizeMB}MB`,
      };
    }
    return null;
  }

  static fileType(
    file: File,
    allowedTypes: string[],
    fieldName: string,
  ): ValidationError | null {
    if (!allowedTypes.includes(file.type)) {
      return {
        field: fieldName,
        message: "Invalid file type",
      };
    }
    return null;
  }

  static validateRules<T extends Record<string, any>>(
    data: T,
    rules: Array<(value: any, fieldName: string) => ValidationError | null>,
  ): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [fieldName, value] of Object.entries(data)) {
      for (const rule of rules) {
        const error = rule(value, fieldName);
        if (error) {
          errors.push(error);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
