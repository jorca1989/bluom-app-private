/**
 * Validation utility functions
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate numeric input (for age, weight, height)
 */
export function isValidNumber(
  value: string,
  min?: number,
  max?: number
): boolean {
  const num = parseFloat(value);

  if (isNaN(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;

  return true;
}

/**
 * Validate age (must be between 13-120)
 */
export function isValidAge(age: string): boolean {
  return isValidNumber(age, 13, 120);
}

/**
 * Validate weight in kg (must be between 20-300)
 */
export function isValidWeight(weight: string): boolean {
  return isValidNumber(weight, 20, 300);
}

/**
 * Validate height in cm (must be between 100-250)
 */
export function isValidHeight(height: string): boolean {
  return isValidNumber(height, 100, 250);
}

/**
 * Validate sleep hours (must be between 0-24)
 */
export function isValidSleepHours(hours: string): boolean {
  return isValidNumber(hours, 0, 24);
}

/**
 * Validate weekly workout time (must be between 0-168 hours)
 */
export function isValidWeeklyWorkoutTime(hours: string): boolean {
  return isValidNumber(hours, 0, 168);
}

/**
 * Validate meals per day (must be between 1-8)
 */
export function isValidMealsPerDay(meals: string): boolean {
  return isValidNumber(meals, 1, 8);
}

/**
 * Convert pounds to kilograms
 */
export function lbsToKg(lbs: number): number {
  return Math.round(lbs * 0.453592 * 10) / 10;
}

/**
 * Convert kilograms to pounds
 */
export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

/**
 * Convert feet/inches to centimeters
 */
export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * 2.54 * 10) / 10;
}

/**
 * Convert centimeters to feet/inches
 */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

/**
 * Sanitize string input (remove extra whitespace)
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

/**
 * Validate time format (HH:MM)
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}
