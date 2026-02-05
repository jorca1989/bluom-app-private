# Bluom.App Setup Guide

Welcome to Bluom.App - A Holistic Health Ecosystem built with React Native, Expo, Convex, and Clerk.

## Architecture Overview

- **Frontend**: React Native with Expo SDK 54 + TypeScript
- **Auth**: Clerk (Primary Identity Provider)
- **Database/Backend**: Convex (Reactive state, serverless functions)
- **Logic**: Offline-first with optimistic updates

## Prerequisites

1. Node.js 18+ installed
2. Expo CLI installed globally: `npm install -g expo-cli`
3. A Clerk account (https://clerk.com)
4. A Convex account (https://convex.dev)

## Step 1: Clone and Install Dependencies

```bash
npm install
```

## Step 2: Set Up Convex

### 2.1 Create a Convex Account

1. Go to https://dashboard.convex.dev
2. Create a new account or sign in
3. Create a new project

### 2.2 Initialize Convex

```bash
npm run convex:init
```

This will:
- Generate your Convex deployment URL
- Create the `convex/_generated` directory
- Set up the Convex development environment

### 2.3 Get Your Convex URL

After initialization, copy your Convex deployment URL from the terminal output. It will look like:
```
https://your-deployment-name.convex.cloud
```

## Step 3: Set Up Clerk Authentication

### 3.1 Create a Clerk Application

1. Go to https://dashboard.clerk.com
2. Create a new application
3. Choose "Email" as your authentication method
4. Copy your **Publishable Key**

### 3.2 Configure JWT Templates in Clerk

1. In your Clerk Dashboard, go to **JWT Templates**
2. Create a new template named "convex"
3. Set the **Token lifetime** to 3600 seconds (1 hour)
4. Add the following claims:
   ```json
   {
     "aud": "convex"
   }
   ```
5. Save the template

### 3.3 Get Your JWT Issuer Domain

1. In Clerk Dashboard, go to **API Keys**
2. Find your **JWT Issuer** (looks like `https://your-app.clerk.accounts.dev`)
3. Copy this URL

## Step 4: Configure Environment Variables

Create a `.env` file in the root directory (or update the existing one):

```bash
# Convex Configuration
EXPO_PUBLIC_CONVEX_URL=https://your-deployment-name.convex.cloud

# Clerk Authentication
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxx

# Clerk JWT Issuer Domain (for Convex auth)
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
```

Replace the values with your actual credentials from Steps 2 and 3.

## Step 5: Deploy Convex Schema

```bash
npm run convex:dev
```

This will:
- Push your schema to Convex
- Generate TypeScript types
- Start the Convex development server

Keep this terminal running during development.

## Step 6: Start the Expo Development Server

In a new terminal:

```bash
npm run dev
```

This will start the Expo development server. You can now:
- Press `w` to open in web browser
- Scan the QR code with Expo Go app on your phone
- Press `a` for Android emulator
- Press `i` for iOS simulator

## Project Structure

```
bluom-app/
├── app/                      # Expo Router screens
│   ├── (tabs)/              # Tab navigation screens
│   └── _layout.tsx          # Root layout with providers
├── convex/                   # Convex backend
│   ├── schema.ts            # Database schema
│   ├── auth.config.js       # Clerk authentication config
│   ├── users.ts             # User management mutations
│   ├── onboarding.ts        # Onboarding & calculations
│   ├── plans.ts             # Plan generation
│   ├── food.ts              # Food tracking
│   ├── exercise.ts          # Exercise tracking
│   ├── habits.ts            # Habit tracking
│   └── wellness.ts          # Mood & sleep tracking
├── providers/               # React context providers
│   └── ConvexClerkProvider.tsx
├── constants/               # App constants & colors
├── types/                   # TypeScript type definitions
├── utils/                   # Utility functions
└── .env                     # Environment variables
```

## Core Features

### 1. FUEL (Nutrition)
- 4-slot meal system (5 for premium users)
- Macro tracking (Protein/Carbs/Fat/Calories)
- Daily targets calculated using Mifflin-St Jeor formula

### 2. MOVE (Fitness)
- MET-based calorie burn calculation
- Support for Strength, Cardio, HIIT, and Yoga
- Exercise library and workout plans

### 3. WELLNESS (Mind)
- 5-scale mood logging
- Sleep tracking with quality metrics
- Habit tracking with streak system

## Database Schema

The Convex schema includes:

- **users**: User profiles with biometrics and calculated targets
- **foodEntries**: Food logging with macros
- **exerciseEntries**: Exercise tracking with MET calculations
- **habits**: Habit tracking with streaks
- **moodLogs**: Mood entries (1-5 scale)
- **sleepLogs**: Sleep hours and quality
- **nutritionPlans**: Generated meal plans
- **fitnessPlans**: Workout splits
- **wellnessPlans**: Wellness recommendations

## Key Mutations & Queries

### User Management
- `storeUser`: Create/update user from Clerk auth
- `getUserByClerkId`: Get user profile
- `updateUser`: Update user data

### Onboarding
- `onboardUser`: Process questionnaire and calculate targets
- `preCalculateTargets`: Preview calculations before signup

### Plans
- `generateNutritionPlan`: Create personalized meal plan
- `generateFitnessPlan`: Create workout split
- `generateWellnessPlan`: Create wellness recommendations
- `generateAllPlans`: Generate all three plans at once

### Tracking
- `logFoodEntry`: Log a meal
- `logExerciseEntry`: Log a workout
- `logMood`: Log mood entry
- `logSleep`: Log sleep data
- `createHabit`: Create a new habit
- `completeHabit`: Mark habit as complete

## The Mifflin-St Jeor Formula

The app uses the Mifflin-St Jeor formula to calculate daily calorie needs:

```
BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) + s
```

Where `s = +5` for males, `-161` for females.

Then multiply by activity factor:
- Sedentary: 1.2
- Lightly Active: 1.375
- Moderately Active: 1.55
- Very Active: 1.725
- Extremely Active: 1.9

Finally, adjust for fitness goal:
- Lose Weight: -500 cal
- Build Muscle: +300 cal
- Maintain: +0 cal

## Development Workflow

1. **Make schema changes**: Edit `convex/schema.ts`
2. **Add mutations/queries**: Create/edit files in `convex/`
3. **Convex auto-deploys**: Changes are pushed automatically in dev mode
4. **Update frontend**: Use generated types from `convex/_generated`

## Common Commands

```bash
# Start Expo dev server
npm run dev

# Start Convex dev server
npm run convex:dev

# Deploy Convex to production
npm run convex:deploy

# Type checking
npm run typecheck

# Lint code
npm run lint

# Build for web
npm run build:web
```

## Troubleshooting

### Convex Connection Issues
- Make sure `EXPO_PUBLIC_CONVEX_URL` is set correctly in `.env`
- Ensure `convex:dev` is running in a separate terminal
- Check that your Convex deployment is active

### Clerk Authentication Issues
- Verify `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is correct
- Ensure JWT template named "convex" exists in Clerk Dashboard
- Check that `CLERK_JWT_ISSUER_DOMAIN` matches your Clerk domain

### Type Errors
- Run `npm run convex:dev` to regenerate types
- Restart your TypeScript server in your IDE

## Next Steps

1. Build the UI components (not included in this setup)
2. Implement the 18-question onboarding flow
3. Create the dashboard with Fuel, Move, and Wellness tabs
4. Add premium features and paywall
5. Integrate RevenueCat for in-app purchases

## Resources

- [Convex Documentation](https://docs.convex.dev)
- [Clerk Documentation](https://clerk.com/docs)
- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev)

## Support

For issues or questions:
1. Check the Convex logs in your dashboard
2. Review Clerk logs for authentication issues
3. Check Expo error messages in the terminal
