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

  /**
   * Account 2: Back Workouts
   * Videos and illustrations for back muscle group exercises.
   */
  backWorkoutsBaseUrl: 'https://pub-ae1a814d0cba415f94c35df1b273c81c.r2.dev',

  /**
   * Account 2: Chest Workouts
   * Videos and illustrations for chest muscle group exercises.
   */
  chestWorkoutsBaseUrl: 'https://pub-75fbc9ede62e40de84e7cb45d6b96923.r2.dev',

  /**
   * Account 2: Legs Workouts
   * Videos and illustrations for legs muscle group exercises.
   */
  legsWorkoutsBaseUrl: 'https://pub-75ff66c937a74772b98cb62f1512cbd2.r2.dev',
};
