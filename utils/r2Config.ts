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
   * Used for Workout Videos and all fitness-related video assets.
   */
  workoutBaseUrl: 'https://pub-f21d719c948b41dd8ef5e188aceea102.r2.dev',

  /**
   * Account 2: Exercise Library
   * Highly optimized bucket specifically for thousands of exercise GIF/Image thumbnails.
   */
  exerciseLibraryBaseUrl: 'https://pub-cedb677c4c5e4c6ab71a00a90efd8168.r2.dev',
};
