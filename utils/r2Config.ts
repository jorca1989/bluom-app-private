/**
 * utils/r2Config.ts
 * 
 * Centralized Cloudflare R2 base URLs for the application.
 */

export const R2_CONFIG = {
  /**
   * Account 1: General Storage
   * Used for Meditations, Recipes, and other general app assets.
   */
  generalBaseUrl: 'https://pub-df4415ed308d4c5c9617037ae2ddcbe9.r2.dev',

  /**
   * Account 2: Workout Media
   * Used for Exercise Thumbnails, Workout Videos, and all fitness-related assets.
   */
  workoutBaseUrl: 'https://pub-f21d719c948b41dd8ef5e188aceea102.r2.dev',
};
