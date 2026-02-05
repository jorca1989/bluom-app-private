/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as achievements from "../achievements.js";
import type * as admin from "../admin.js";
import type * as ai from "../ai.js";
import type * as aimind from "../aimind.js";
import type * as customFoods from "../customFoods.js";
import type * as daily from "../daily.js";
import type * as debug from "../debug.js";
import type * as debug_exercises from "../debug_exercises.js";
import type * as debug_users from "../debug_users.js";
import type * as exercise from "../exercise.js";
import type * as exercises from "../exercises.js";
import type * as externalFoods from "../externalFoods.js";
import type * as fasting from "../fasting.js";
import type * as food from "../food.js";
import type * as foodCatalog from "../foodCatalog.js";
import type * as forceSeed from "../forceSeed.js";
import type * as functions from "../functions.js";
import type * as habits from "../habits.js";
import type * as healthHubs from "../healthHubs.js";
import type * as http from "../http.js";
import type * as httpHandlers from "../httpHandlers.js";
import type * as integrations from "../integrations.js";
import type * as meditation from "../meditation.js";
import type * as mensHealth from "../mensHealth.js";
import type * as metabolic from "../metabolic.js";
import type * as migrate_exercises from "../migrate_exercises.js";
import type * as mindworld from "../mindworld.js";
import type * as onboarding from "../onboarding.js";
import type * as permissions from "../permissions.js";
import type * as plans from "../plans.js";
import type * as programs from "../programs.js";
import type * as publicRecipes from "../publicRecipes.js";
import type * as questProgress from "../questProgress.js";
import type * as quests from "../quests.js";
import type * as recipes from "../recipes.js";
import type * as revenuecat from "../revenuecat.js";
import type * as seed from "../seed.js";
import type * as seedExercises from "../seedExercises.js";
import type * as seedFoods from "../seedFoods.js";
import type * as seedMockRecipes from "../seedMockRecipes.js";
import type * as shoppingList from "../shoppingList.js";
import type * as steps from "../steps.js";
import type * as strava from "../strava.js";
import type * as streaks from "../streaks.js";
import type * as sugar from "../sugar.js";
import type * as support from "../support.js";
import type * as testUsers from "../testUsers.js";
import type * as todos from "../todos.js";
import type * as users from "../users.js";
import type * as videoWorkouts from "../videoWorkouts.js";
import type * as wellness from "../wellness.js";
import type * as womensHealth from "../womensHealth.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  achievements: typeof achievements;
  admin: typeof admin;
  ai: typeof ai;
  aimind: typeof aimind;
  customFoods: typeof customFoods;
  daily: typeof daily;
  debug: typeof debug;
  debug_exercises: typeof debug_exercises;
  debug_users: typeof debug_users;
  exercise: typeof exercise;
  exercises: typeof exercises;
  externalFoods: typeof externalFoods;
  fasting: typeof fasting;
  food: typeof food;
  foodCatalog: typeof foodCatalog;
  forceSeed: typeof forceSeed;
  functions: typeof functions;
  habits: typeof habits;
  healthHubs: typeof healthHubs;
  http: typeof http;
  httpHandlers: typeof httpHandlers;
  integrations: typeof integrations;
  meditation: typeof meditation;
  mensHealth: typeof mensHealth;
  metabolic: typeof metabolic;
  migrate_exercises: typeof migrate_exercises;
  mindworld: typeof mindworld;
  onboarding: typeof onboarding;
  permissions: typeof permissions;
  plans: typeof plans;
  programs: typeof programs;
  publicRecipes: typeof publicRecipes;
  questProgress: typeof questProgress;
  quests: typeof quests;
  recipes: typeof recipes;
  revenuecat: typeof revenuecat;
  seed: typeof seed;
  seedExercises: typeof seedExercises;
  seedFoods: typeof seedFoods;
  seedMockRecipes: typeof seedMockRecipes;
  shoppingList: typeof shoppingList;
  steps: typeof steps;
  strava: typeof strava;
  streaks: typeof streaks;
  sugar: typeof sugar;
  support: typeof support;
  testUsers: typeof testUsers;
  todos: typeof todos;
  users: typeof users;
  videoWorkouts: typeof videoWorkouts;
  wellness: typeof wellness;
  womensHealth: typeof womensHealth;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
