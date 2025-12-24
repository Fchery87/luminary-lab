import { test, expect, describe } from 'bun:test';
import { FormValidator } from '@/lib/validation';

describe('FormValidator', () => {
  describe('required', () => {
    test('should return null for non-empty string', () => {
      const result = FormValidator.required('test value', 'Field Name');
      expect(result).toBeNull();
    });

    test('should return error for empty string', () => {
      const result = FormValidator.required('', 'Field Name');
      expect(result).toEqual({
        field: 'Field Name',
        message: 'Field Name is required',
      });
    });

    test('should return error for whitespace-only string', () => {
      const result = FormValidator.required('   ', 'Field Name');
      expect(result).toEqual({
        field: 'Field Name',
        message: 'Field Name is required',
      });
    });
  });

  describe('email', () => {
    test('should return null for valid email', () => {
      const result = FormValidator.email('test@example.com', 'Email');
      expect(result).toBeNull();
    });

    test('should return error for invalid email without @', () => {
      const result = FormValidator.email('testexample.com', 'Email');
      expect(result).toEqual({
        field: 'Email',
        message: 'Please enter a valid email address',
      });
    });

    test('should return error for invalid email without domain', () => {
      const result = FormValidator.email('test@', 'Email');
      expect(result).toEqual({
        field: 'Email',
        message: 'Please enter a valid email address',
      });
    });

    test('should return error for invalid email without local part', () => {
      const result = FormValidator.email('@example.com', 'Email');
      expect(result).toEqual({
        field: 'Email',
        message: 'Please enter a valid email address',
      });
    });
  });

  describe('minLength', () => {
    test('should return null for string meeting minimum length', () => {
      const result = FormValidator.minLength('password123', 8, 'Password');
      expect(result).toBeNull();
    });

    test('should return error for string shorter than minimum', () => {
      const result = FormValidator.minLength('pass', 8, 'Password');
      expect(result).toEqual({
        field: 'Password',
        message: 'Password must be at least 8 characters long',
      });
    });

    test('should return null for string exactly at minimum length', () => {
      const result = FormValidator.minLength('12345678', 8, 'Password');
      expect(result).toBeNull();
    });
  });

  describe('maxLength', () => {
    test('should return null for string within maximum length', () => {
      const result = FormValidator.maxLength('test', 10, 'Username');
      expect(result).toBeNull();
    });

    test('should return error for string exceeding maximum', () => {
      const result = FormValidator.maxLength('this-is-very-long-username', 10, 'Username');
      expect(result).toEqual({
        field: 'Username',
        message: 'Username must not exceed 10 characters',
      });
    });

    test('should return null for string exactly at maximum length', () => {
      const result = FormValidator.maxLength('1234567890', 10, 'Username');
      expect(result).toBeNull();
    });
  });

  describe('fileSize', () => {
    test('should return null for file within size limit', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 }); // 5MB

      const result = FormValidator.fileSize(file, 10 * 1024 * 1024, 'File');
      expect(result).toBeNull();
    });

    test('should return error for file exceeding size limit', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }); // 15MB

      const result = FormValidator.fileSize(file, 10 * 1024 * 1024, 'File');
      expect(result).toEqual({
        field: 'File',
        message: 'File size must be less than 10MB',
      });
    });
  });

  describe('fileType', () => {
    test('should return null for allowed file type', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const allowedTypes = ['image/jpeg', 'image/png'];

      const result = FormValidator.fileType(file, allowedTypes, 'File');
      expect(result).toBeNull();
    });

    test('should return error for disallowed file type', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const allowedTypes = ['image/jpeg', 'image/png'];

      const result = FormValidator.fileType(file, allowedTypes, 'File');
      expect(result).toEqual({
        field: 'File',
        message: 'Invalid file type',
      });
    });
  });

  describe('validateRules', () => {
    test('should return valid result when all rules pass', () => {
      const data = { name: 'Test User', age: 25 };
      const rules = [
        (value: any, fieldName: string) => {
          if (fieldName === 'name' && (typeof value !== 'string' || !value)) {
            return { field: 'name', message: 'Name required' };
          }
          if (fieldName === 'age' && (typeof value !== 'number' || value < 18)) {
            return { field: 'age', message: 'Must be 18 or older' };
          }
          return null;
        },
      ];

      const result = FormValidator.validateRules(data, rules);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should return invalid result when any rule fails', () => {
      const data = { name: '', age: 16 };
      const rules = [
        (value: any, fieldName: string) => {
          if (fieldName === 'name' && (typeof value !== 'string' || !value)) {
            return { field: 'name', message: 'Name required' };
          }
          if (fieldName === 'age' && (typeof value !== 'number' || value < 18)) {
            return { field: 'age', message: 'Must be 18 or older' };
          }
          return null;
        },
      ];

      const result = FormValidator.validateRules(data, rules);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
