import { Request, Response, NextFunction } from 'express';

// SECURITY: Maximum allowed lengths for input fields to prevent oversized payloads
// These limits are generous enough for legitimate use but block abuse
const FIELD_LIMITS: Record<string, number> = {
  // Auth fields
  email: 254,            // RFC 5321 max
  username: 100,
  password: 128,         // bcrypt truncates at 72 bytes, but allow longer input
  currentPassword: 128,
  newPassword: 128,
  display_name: 200,
  phone_number: 30,
  token: 256,            // invitation/reset tokens

  // Company/user fields
  name: 200,
  custom_role_name: 100,
  role: 50,
  language_preference: 10,
  theme_preference: 20,

  // Category fields
  color_id: 50,

  // Criteria fields
  description: 2000,
  category: 200,

  // Call fields
  summary: 10000,
  content: 5000,         // notes
  direction: 20,
  phoneNumber: 30,
  audioUrl: 2000,
  callDate: 50,

  // Analysis fields
  nextStepRecommendation: 5000,
  scoreJustification: 5000,
  whatWentWell: 5000,
  whatWentWrong: 5000,
  responseImprovementExample: 5000,
  topPerformerComparison: 5000,
  detected_category: 200,

  // Transcription (can be large)
  transcription: 500000,  // ~500KB for long calls

  // Stripe
  plan: 50,

  // Twilio webhook fields
  CallSid: 100,
  From: 50,
  To: 50,
  Direction: 20,
  CallDuration: 20,
  RecordingUrl: 2000,
  AccountSid: 100,
  ConferenceSid: 100,
  RecordingSid: 100,
  RecordingStatus: 50,
};

// Default max length for unlisted string fields
const DEFAULT_MAX_LENGTH = 1000;

// Max array length for array fields
const MAX_ARRAY_LENGTH = 500;

/**
 * Validates string field lengths and array sizes in req.body.
 * Returns an error message if any field exceeds its limit, or null if all valid.
 */
// SECURITY: Max number of fields per object level
const MAX_FIELDS_PER_LEVEL = 100;

export function checkInputLengths(body: Record<string, unknown>, depth: number = 0): string | null {
  if (!body || typeof body !== 'object') return null;
  // SECURITY: Prevent deeply nested payloads (max 5 levels)
  if (depth > 5) return 'Request body is too deeply nested';
  // SECURITY: Prevent objects with excessive fields
  if (Object.keys(body).length > MAX_FIELDS_PER_LEVEL) return 'Too many fields in request body';

  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') {
      const maxLen = FIELD_LIMITS[key] || DEFAULT_MAX_LENGTH;
      if (value.length > maxLen) {
        return `Field '${key}' exceeds maximum length of ${maxLen} characters`;
      }
    } else if (Array.isArray(value)) {
      if (value.length > MAX_ARRAY_LENGTH) {
        return `Field '${key}' exceeds maximum array length of ${MAX_ARRAY_LENGTH}`;
      }
      // Check string items and nested objects in arrays
      for (const item of value) {
        if (typeof item === 'string' && item.length > DEFAULT_MAX_LENGTH) {
          return `Item in '${key}' exceeds maximum length of ${DEFAULT_MAX_LENGTH} characters`;
        }
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const nestedError = checkInputLengths(item as Record<string, unknown>, depth + 1);
          if (nestedError) return nestedError;
        }
      }
    } else if (value && typeof value === 'object') {
      // SECURITY: Recurse into nested objects
      const nestedError = checkInputLengths(value as Record<string, unknown>, depth + 1);
      if (nestedError) return nestedError;
    }
  }

  return null;
}

/**
 * Express middleware that validates input lengths on all POST/PUT/PATCH requests.
 */
export function inputLengthValidation(req: Request, res: Response, next: NextFunction): void {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && typeof req.body === 'object') {
    const error = checkInputLengths(req.body);
    if (error) {
      res.status(400).json({ error });
      return;
    }
  }
  next();
}
