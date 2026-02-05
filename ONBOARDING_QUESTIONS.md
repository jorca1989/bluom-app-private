# Onboarding Questionnaire

This document outlines the 18-question onboarding flow for Bluom.App. The responses feed into the Mifflin-St Jeor calculation engine to generate personalized nutrition, fitness, and wellness plans.

---

## Question Flow

### 1. What's your name?

**Type:** Text Input
**Variable:** `name`
**Validation:** Required, 2-50 characters
**Purpose:** Personalization throughout the app

---

### 2. What is your biological sex?

**Type:** Radio/Select
**Variable:** `biologicalSex`
**Options:**
- Male
- Female

**Validation:** Required
**Purpose:** Used in BMR calculation (affects base metabolic rate)
**Formula Impact:** Male: +5, Female: -161 in Mifflin-St Jeor

---

### 3. How old are you?

**Type:** Numeric Input
**Variable:** `age`
**Validation:** 13-120 years
**Purpose:** BMR calculation
**Formula Impact:** BMR decreases by 5 per year of age

---

### 4. What is your current weight?

**Type:** Numeric Input with Unit Toggle
**Variable:** `weight`
**Units:** kg (default) or lbs
**Validation:** 20-300 kg
**Purpose:** BMR and calorie burn calculations
**Formula Impact:** Directly proportional to BMR (+10 per kg)

---

### 5. How tall are you?

**Type:** Numeric Input with Unit Toggle
**Variable:** `height`
**Units:** cm (default) or ft/in
**Validation:** 100-250 cm
**Purpose:** BMR calculation
**Formula Impact:** +6.25 per cm

---

### 6. What is your primary fitness goal?

**Type:** Radio/Cards
**Variable:** `fitnessGoal`
**Options:**
- Lose Weight (-500 cal adjustment)
- Build Muscle (+300 cal adjustment)
- Maintain Weight (0 adjustment)
- Improve Overall Health (0 adjustment)

**Validation:** Required
**Purpose:** Calorie target adjustment
**Formula Impact:** Modifies TDEE to create caloric surplus/deficit

---

### 7. What is your target weight?

**Type:** Numeric Input (Optional)
**Variable:** `targetWeight`
**Units:** Same as current weight
**Validation:** Optional, 20-300 kg
**Purpose:** Goal tracking and progress monitoring

---

### 8. What is your fitness experience level?

**Type:** Radio/Cards
**Variable:** `fitnessExperience`
**Options:**
- Beginner (Full Body 3x/week)
- Intermediate (Push/Pull/Legs 4x/week)
- Advanced (Upper/Lower 5x/week)

**Validation:** Required
**Purpose:** Determines workout split complexity
**Plan Impact:** Affects exercise selection, volume, and frequency

---

### 9. What type of workouts do you prefer?

**Type:** Radio/Cards
**Variable:** `workoutPreference`
**Options:**
- Strength Training
- Cardio
- HIIT
- Yoga
- Mixed (Variety)

**Validation:** Required
**Purpose:** Workout plan customization
**Plan Impact:** Influences exercise library and recommendations

---

### 10. How much time can you dedicate to workouts per week?

**Type:** Numeric Input or Slider
**Variable:** `weeklyWorkoutTime`
**Unit:** Hours
**Validation:** 0-168 hours
**Recommended:** 3-10 hours
**Purpose:** Fitness plan feasibility
**Plan Impact:** Determines workout duration and frequency

---

### 11. How would you describe your daily activity level?

**Type:** Radio/Cards
**Variable:** `activityLevel`
**Options:**
- Sedentary (1.2x) - Little to no exercise
- Lightly Active (1.375x) - Light exercise 1-3 days/week
- Moderately Active (1.55x) - Moderate exercise 3-5 days/week
- Very Active (1.725x) - Hard exercise 6-7 days/week
- Extremely Active (1.9x) - Very hard exercise & physical job

**Validation:** Required
**Purpose:** TDEE calculation
**Formula Impact:** Multiplies BMR to get Total Daily Energy Expenditure

---

### 12. What nutrition approach interests you most?

**Type:** Radio/Cards
**Variable:** `nutritionApproach`
**Options:**
- Balanced (40% carbs, 30% protein, 30% fat)
- High Protein (25% carbs, 45% protein, 30% fat)
- Low Carb (20% carbs, 30% protein, 50% fat)
- Plant Based (custom ratios)
- Flexible (no strict ratios)

**Validation:** Required
**Purpose:** Macro split calculation
**Formula Impact:** Determines protein, carbs, and fat distribution

---

### 13. How many hours do you typically sleep per night?

**Type:** Numeric Input or Slider
**Variable:** `sleepHours`
**Unit:** Hours
**Validation:** 0-24 hours
**Recommended:** 7-9 hours
**Purpose:** Wellness plan and holistic score
**Plan Impact:** Sleep recommendations and recovery optimization

---

### 14. How would you rate your typical stress level?

**Type:** Radio/Scale
**Variable:** `stressLevel`
**Options:**
- Low (1-2)
- Moderate (3-5)
- High (6-8)
- Very High (9-10)

**Validation:** Required
**Purpose:** Wellness plan customization
**Plan Impact:** Meditation frequency and stress management recommendations

---

### 15. What motivates you most? (Select all that apply)

**Type:** Multi-Select Checkboxes
**Variable:** `motivations`
**Options:**
- Health and Longevity
- Physical Appearance
- Athletic Performance
- Mental Clarity
- Social Support
- Weight Loss
- Muscle Gain
- Energy Levels
- Sleep Quality
- Stress Reduction

**Validation:** At least 1 selection
**Purpose:** Content personalization and gamification
**Plan Impact:** Custom motivational messaging and goal framing

---

### 16. What are your biggest fitness challenges?

**Type:** Multi-Select Checkboxes
**Variable:** `challenges`
**Options:**
- Lack of Time
- Lack of Motivation
- Not Knowing What to Do
- Consistency
- Diet/Nutrition
- Energy Levels
- Injury or Pain
- Access to Equipment
- Social Support
- Tracking Progress

**Validation:** Optional
**Purpose:** Plan customization and educational content
**Plan Impact:** Targeted tips and solutions in wellness plan

---

### 17. How many meals do you prefer to eat per day?

**Type:** Numeric Input or Selector
**Variable:** `mealsPerDay`
**Validation:** 1-8 meals
**Recommended:** 3-5 meals
**Purpose:** Meal distribution in nutrition plan
**Plan Impact:** Divides daily calories across preferred meal frequency

---

### 18. What would you like to achieve in the next 3 months?

**Type:** Text Area
**Variable:** `threeMonthGoal`
**Validation:** Optional, 10-500 characters
**Purpose:** Goal tracking and progress motivation
**Plan Impact:** Displayed on dashboard as primary goal

---

## Flow Summary

### Pre-Calculation Preview

After Question 12 (before signup), the app should:
1. Call `preCalculateTargets` mutation
2. Display **blurred** macro preview:
   - Daily Calories: XXXX kcal
   - Protein: XXX g
   - Carbs: XXX g
   - Fat: XXX g
3. Show "Sign up to unlock your personalized plan" CTA

### Post-Signup Processing

After Clerk authentication:
1. Call `onboardUser` mutation with all 18 responses
2. Server calculates:
   - BMR using Mifflin-St Jeor
   - TDEE based on activity level
   - Adjusted calories for goal
   - Macro split based on approach
   - Holistic score (0-100)
3. Store results in user profile
4. Call `generateAllPlans` to create:
   - Nutrition Plan (meal templates)
   - Fitness Plan (workout split)
   - Wellness Plan (habits, sleep, meditation)
5. Navigate to Dashboard with completed profile

---

## Calculation Details

### BMR (Basal Metabolic Rate)

```
BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) + s
```

Where:
- `s = +5` for males
- `s = -161` for females

### TDEE (Total Daily Energy Expenditure)

```
TDEE = BMR × Activity Factor
```

Activity Factors:
- Sedentary: 1.2
- Lightly Active: 1.375
- Moderately Active: 1.55
- Very Active: 1.725
- Extremely Active: 1.9

### Goal-Adjusted Calories

```
Daily Calories = TDEE + Goal Adjustment
```

Goal Adjustments:
- Lose Weight: -500 cal
- Build Muscle: +300 cal
- Maintain: 0 cal
- Improve Health: 0 cal

### Macro Split

**Protein:**
- Build Muscle: 2.2g per kg
- Lose Weight: 2.0g per kg
- Maintain: 1.6g per kg
- High Protein: 2.5g per kg

**Fat:**
- Default: 30% of calories
- Low Carb: 40% of calories

**Carbs:**
- Remaining calories after protein and fat

---

## Validation Rules

### Required Fields
- Name
- Biological Sex
- Age
- Weight
- Height
- Fitness Goal
- Fitness Experience
- Workout Preference
- Weekly Workout Time
- Activity Level
- Nutrition Approach
- Sleep Hours
- Stress Level
- Motivations (at least 1)
- Meals Per Day

### Optional Fields
- Target Weight
- Challenges
- Three Month Goal

### Error Messages

- "Please enter your name"
- "Age must be between 13 and 120"
- "Weight must be between 20 and 300 kg"
- "Height must be between 100 and 250 cm"
- "Please select at least one motivation"
- "Workout time must be between 0 and 168 hours per week"

---

## UI/UX Recommendations

1. **Progress Indicator:** Show "Question X of 18" at the top
2. **Back Button:** Allow users to go back and edit previous answers
3. **Auto-Save:** Save progress in local state (not Convex) until final submission
4. **Skip Option:** Only for optional fields
5. **Preview:** Show blurred results after Question 12 to increase signup conversion
6. **Animations:** Smooth transitions between questions
7. **Validation:** Real-time validation with clear error messages
8. **Units:** Toggle between metric and imperial with persistent preference

---

## Technical Implementation

### Frontend Flow

```typescript
// 1. Collect responses in state
const [responses, setResponses] = useState<OnboardingData>({
  name: "",
  biologicalSex: "male",
  // ... other fields
});

// 2. After Question 12, preview calculations
const preview = await convex.mutation(api.onboarding.preCalculateTargets, {
  biologicalSex: responses.biologicalSex,
  age: responses.age,
  weight: responses.weight,
  height: responses.height,
  activityLevel: responses.activityLevel,
  fitnessGoal: responses.fitnessGoal,
  nutritionApproach: responses.nutritionApproach,
});

// 3. After Clerk signup, complete onboarding
const result = await convex.mutation(api.onboarding.onboardUser, {
  clerkId: user.id,
  ...responses,
});

// 4. Generate plans
await convex.mutation(api.plans.generateAllPlans, {
  userId: result.userId,
});

// 5. Navigate to dashboard
router.push("/(tabs)");
```

---

## Analytics & Tracking

Track these metrics:
- Dropout rate per question
- Average time per question
- Most common selections
- Conversion rate at preview screen
- Sign-up rate after preview
