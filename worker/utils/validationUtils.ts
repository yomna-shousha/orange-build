/**
 * Centralized Validation Utilities
 * Provides consistent validation logic across the application
 * Eliminates code duplication and ensures consistent validation rules
 */

import type { PasswordValidationResult } from '../types/auth-types';

/**
 * Email validation configuration
 */
export interface EmailValidationConfig {
  allowPlusAddressing?: boolean; // Allow email+tag@domain.com
  allowInternational?: boolean;  // Allow international domains
  maxLength?: number;           // Maximum email length
  blockedDomains?: string[];    // Blocked email domains
}

/**
 * Default email validation configuration
 */
const DEFAULT_EMAIL_CONFIG: EmailValidationConfig = {
  allowPlusAddressing: true,
  allowInternational: true,
  maxLength: 254, // RFC 5321 limit
  blockedDomains: ['10minutemail.com', 'tempmail.org'] // Add known temp email domains
};

/**
 * Comprehensive email validation
 */
export function validateEmail(
  email: string, 
  config: EmailValidationConfig = DEFAULT_EMAIL_CONFIG
): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  // Length check
  const maxLength = config.maxLength || DEFAULT_EMAIL_CONFIG.maxLength!;
  if (email.length > maxLength) {
    return { valid: false, error: `Email must be less than ${maxLength} characters` };
  }

  // Basic format validation
  const emailRegex = config.allowInternational 
    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/ // Basic international-friendly regex
    : /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/; // ASCII only

  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Domain validation
  const domain = email.split('@')[1]?.toLowerCase();
  if (config.blockedDomains?.includes(domain)) {
    return { valid: false, error: 'Email domain is not allowed' };
  }

  // Plus addressing check (if disabled)
  if (!config.allowPlusAddressing && email.includes('+')) {
    return { valid: false, error: 'Plus addressing is not allowed' };
  }

  return { valid: true };
}

/**
 * Simple email format check (for backward compatibility)
 */
export function isValidEmailFormat(email: string): boolean {
  return validateEmail(email).valid;
}

/**
 * Password validation configuration
 */
export interface PasswordValidationConfig {
  minLength?: number;
  maxLength?: number;
  requireLowercase?: boolean;
  requireUppercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  forbidCommonPasswords?: boolean;
  forbidSequentialChars?: boolean;
  forbidRepeatingChars?: boolean;
  forbidUserInfo?: boolean; // Forbid email/username in password
  customRules?: Array<(password: string) => { valid: boolean; error?: string }>;
}

/**
 * Default password validation configuration
 */
const DEFAULT_PASSWORD_CONFIG: PasswordValidationConfig = {
  minLength: 8,
  maxLength: 128,
  requireLowercase: true,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
  forbidCommonPasswords: true,
  forbidSequentialChars: true,
  forbidRepeatingChars: true,
  forbidUserInfo: true
};

/**
 * Comprehensive password validation
 */
export function validatePassword(
  password: string,
  config: PasswordValidationConfig = DEFAULT_PASSWORD_CONFIG,
  _userInfo?: { email?: string; username?: string; name?: string }
): PasswordValidationResult {
  const errors: string[] = [];
  const requirements = {
    minLength: false,
    hasLowercase: false,
    hasUppercase: false,
    hasNumbers: false,
    hasSpecialChars: false,
    notCommon: false,
    noSequential: false
  };
  
  let score = 0;

  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      errors: ['Password is required'],
      score: 0,
      requirements
    };
  }

  // Length validation
  const minLength = config.minLength || DEFAULT_PASSWORD_CONFIG.minLength!;
  const maxLength = config.maxLength || DEFAULT_PASSWORD_CONFIG.maxLength!;
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  } else {
    requirements.minLength = true;
    score += password.length >= 12 ? 2 : 1;
  }

  if (password.length > maxLength) {
    errors.push(`Password must be less than ${maxLength} characters long`);
  }

  // Custom rules
  if (config.customRules) {
    for (const rule of config.customRules) {
      const result = rule(password);
      if (!result.valid && result.error) {
        errors.push(result.error);
      }
    }
  }

  // Generate suggestions
  const suggestions: string[] = [];
  if (password.length < 12) suggestions.push('Use at least 12 characters for better security');

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    score: Math.min(4, Math.max(0, score)),
    requirements,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  };
}

/**
 * Validate username format
 */
export function validateUsername(
  username: string,
  config?: {
    minLength?: number;
    maxLength?: number;
    allowSpecialChars?: boolean;
    reservedNames?: string[];
  }
): { valid: boolean; error?: string } {
  const {
    minLength = 3,
    maxLength = 30,
    allowSpecialChars = false,
    reservedNames = ['admin', 'root', 'api', 'www', 'mail', 'support']
  } = config || {};

  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  if (username.length < minLength) {
    return { valid: false, error: `Username must be at least ${minLength} characters` };
  }

  if (username.length > maxLength) {
    return { valid: false, error: `Username must be less than ${maxLength} characters` };
  }

  // Format validation
  const validPattern = allowSpecialChars 
    ? /^[a-zA-Z0-9_.-]+$/ 
    : /^[a-zA-Z0-9_]+$/;

  if (!validPattern.test(username)) {
    return { 
      valid: false, 
      error: allowSpecialChars 
        ? 'Username can only contain letters, numbers, underscores, dots, and hyphens'
        : 'Username can only contain letters, numbers, and underscores'
    };
  }

  // Reserved names check
  if (reservedNames.includes(username.toLowerCase())) {
    return { valid: false, error: 'Username is reserved' };
  }

  // Must start with letter or number
  if (!/^[a-zA-Z0-9]/.test(username)) {
    return { valid: false, error: 'Username must start with a letter or number' };
  }

  return { valid: true };
}

/**
 * Validate display name
 */
export function validateDisplayName(
  displayName: string,
  config?: {
    minLength?: number;
    maxLength?: number;
    allowSpecialChars?: boolean;
  }
): { valid: boolean; error?: string } {
  const {
    minLength = 2,
    maxLength = 50,
    allowSpecialChars = true
  } = config || {};

  if (!displayName || typeof displayName !== 'string') {
    return { valid: false, error: 'Display name is required' };
  }

  const trimmed = displayName.trim();
  
  if (trimmed.length < minLength) {
    return { valid: false, error: `Display name must be at least ${minLength} characters` };
  }

  if (trimmed.length > maxLength) {
    return { valid: false, error: `Display name must be less than ${maxLength} characters` };
  }

  if (!allowSpecialChars && !/^[a-zA-Z0-9\s]+$/.test(trimmed)) {
    return { valid: false, error: 'Display name can only contain letters, numbers, and spaces' };
  }

  return { valid: true };
}

/**
 * Batch validation utility
 */
export interface ValidationField<T extends readonly unknown[] = readonly unknown[]> {
  value: string;
  validator: (value: string, ...args: T) => { valid: boolean; error?: string };
  validatorArgs?: T;
  fieldName: string;
}

/**
 * Validate multiple fields at once
 */
export function validateFields(fields: ValidationField[]): {
  valid: boolean;
  errors: Record<string, string>;
  firstError?: string;
} {
  const errors: Record<string, string> = {};
  
  for (const field of fields) {
    const result = field.validator(field.value, ...(field.validatorArgs || []));
    if (!result.valid && result.error) {
      errors[field.fieldName] = result.error;
    }
  }
  
  const errorKeys = Object.keys(errors);
  
  return {
    valid: errorKeys.length === 0,
    errors,
    firstError: errorKeys.length > 0 ? errors[errorKeys[0]] : undefined
  };
}

/**
 * Sanitize input string
 */
export function sanitizeInput(
  input: string,
  config?: {
    maxLength?: number;
    allowHtml?: boolean;
    trimWhitespace?: boolean;
  }
): string {
  const {
    maxLength = 1000,
    allowHtml = false,
    trimWhitespace = true
  } = config || {};

  if (!input || typeof input !== 'string') {
    return '';
  }

  let result = input;
  
  if (trimWhitespace) {
    result = result.trim();
  }
  
  if (!allowHtml) {
    // Basic HTML entity encoding
    result = result
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
  
  if (result.length > maxLength) {
    result = result.substring(0, maxLength);
  }
  
  return result;
}