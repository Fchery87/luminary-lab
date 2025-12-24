export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
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
        message: 'Please enter a valid email address',
      };
    }
    return null;
  }

  static minLength(value: string, minLength: number, fieldName: string): ValidationError | null {
    if (value.length < minLength) {
      return {
        field: fieldName,
        message: `${fieldName} must be at least ${minLength} characters long`,
      };
    }
    return null;
  }

  static maxLength(value: string, maxLength: number, fieldName: string): ValidationError | null {
    if (value.length > maxLength) {
      return {
        field: fieldName,
        message: `${fieldName} must not exceed ${maxLength} characters`,
      };
    }
    return null;
  }

  static fileSize(file: File, maxSize: number, fieldName: string): ValidationError | null {
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return {
        field: fieldName,
        message: `File size must be less than ${maxSizeMB}MB`,
      };
    }
    return null;
  }

  static fileType(file: File, allowedTypes: string[], fieldName: string): ValidationError | null {
    if (!allowedTypes.includes(file.type)) {
      return {
        field: fieldName,
        message: 'Invalid file type',
      };
    }
    return null;
  }

  static validateRules<T extends Record<string, any>>(
    data: T,
    rules: Array<(value: any, fieldName: string) => ValidationError | null>
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
