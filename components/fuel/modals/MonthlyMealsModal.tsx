/**
 * app/meal-hub.tsx
 *
 * 30-Day Personalised Meal Hub
 * ─────────────────────────────
 * Free users:  hardcoded 30-day generic templates keyed to
 *              diet_type × fitness_goal from onboarding.
 *              They can view any day's meals and log them — but
 *              they cannot swap individual meals (pro only).
 *
 * Pro users:   AI-generated plan (api.plans.getActivePlans.nutritionPlan),
 *              can swap individual meals (calls regenerateSpecificMeal).
 *              Plan rotates after 30 days.
 *
 * Route: /meal-hub  — add to _layout.tsx as Stack.Screen
 *
 * Navigation from fuel.tsx QuickActions "Monthly Plan" button:
 *   router.push('/meal-hub')
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Modal, ActivityIndicator, Alert, Animated, Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';
import { useTranslation } from 'react-i18next';

import { useTheme, type ThemeColors, THEMES } from '@/context/ThemeContext';

const { width } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

type DietKey = 'high_protein' | 'low_carb' | 'balanced' | 'plant_based' | 'flexible';
type GoalKey = 'lose_weight' | 'build_muscle' | 'maintain' | 'general_health' | 'improve_endurance';
type MealTypeLower = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface MealTemplate {
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  suggestions: string[];
}

interface DayTemplate {
  day: number;
  meals: MealTemplate[];
}

// ─── Generic 30-Day Templates ─────────────────────────────────────────────────
// Keyed by DietKey. Each has 7 unique day patterns that repeat over 30 days.

const GENERIC_WEEK: Record<DietKey, MealTemplate[][]> = {
  high_protein: [
    // Day pattern 1
    [
      { mealType: 'Breakfast', calories: 450, protein: 38, carbs: 30, fat: 14, suggestions: ['4 scrambled eggs', 'Greek yogurt 150g', 'Black coffee'] },
      { mealType: 'Lunch',     calories: 620, protein: 52, carbs: 40, fat: 18, suggestions: ['Grilled chicken breast 220g', 'Brown rice 120g', 'Steamed broccoli'] },
      { mealType: 'Dinner',    calories: 680, protein: 55, carbs: 35, fat: 22, suggestions: ['Baked salmon 200g', 'Sweet potato 150g', 'Asparagus'] },
      { mealType: 'Snack',     calories: 180, protein: 22, carbs: 8,  fat: 5,  suggestions: ['Cottage cheese 180g', 'Cucumber slices'] },
    ],
    // Day pattern 2
    [
      { mealType: 'Breakfast', calories: 480, protein: 40, carbs: 28, fat: 16, suggestions: ['Protein shake (30g whey)', 'Oats 60g', '1 banana'] },
      { mealType: 'Lunch',     calories: 590, protein: 48, carbs: 45, fat: 15, suggestions: ['Turkey mince bowl 200g', 'Quinoa 100g', 'Mixed greens'] },
      { mealType: 'Dinner',    calories: 650, protein: 50, carbs: 38, fat: 20, suggestions: ['Beef steak 180g', 'Baked potato 200g', 'Green beans'] },
      { mealType: 'Snack',     calories: 200, protein: 25, carbs: 10, fat: 6,  suggestions: ['Hard-boiled eggs x3', 'Cherry tomatoes'] },
    ],
    // Day patterns 3–7 (abbreviated for brevity; same structure)
    [
      { mealType: 'Breakfast', calories: 420, protein: 35, carbs: 32, fat: 12, suggestions: ['Egg white omelette x5', 'Whole wheat toast x1', 'Avocado ¼'] },
      { mealType: 'Lunch',     calories: 600, protein: 50, carbs: 42, fat: 16, suggestions: ['Tuna 180g', 'Whole wheat pasta 90g', 'Tomato sauce'] },
      { mealType: 'Dinner',    calories: 660, protein: 54, carbs: 30, fat: 24, suggestions: ['Pork tenderloin 200g', 'Cauliflower mash', 'Peas 80g'] },
      { mealType: 'Snack',     calories: 170, protein: 20, carbs: 6,  fat: 4,  suggestions: ['Protein bar (20g+)', 'Almonds 15g'] },
    ],
    [
      { mealType: 'Breakfast', calories: 460, protein: 36, carbs: 35, fat: 14, suggestions: ['Overnight oats 80g', 'Whey protein scoop', 'Blueberries 80g'] },
      { mealType: 'Lunch',     calories: 610, protein: 53, carbs: 38, fat: 17, suggestions: ['Shrimp stir-fry 200g', 'White rice 120g', 'Pak choi'] },
      { mealType: 'Dinner',    calories: 640, protein: 52, carbs: 36, fat: 20, suggestions: ['Chicken thighs 220g', 'Roasted veg 200g', 'Hummus 30g'] },
      { mealType: 'Snack',     calories: 190, protein: 24, carbs: 9,  fat: 5,  suggestions: ['Low-fat cheese 50g', 'Wholegrain crackers x5'] },
    ],
    [
      { mealType: 'Breakfast', calories: 500, protein: 42, carbs: 30, fat: 18, suggestions: ['Smoked salmon 80g', 'Eggs x2', 'Rye bread x1'] },
      { mealType: 'Lunch',     calories: 580, protein: 48, carbs: 44, fat: 14, suggestions: ['Lean beef mince bowl 180g', 'Lentils 100g', 'Spinach salad'] },
      { mealType: 'Dinner',    calories: 670, protein: 56, carbs: 32, fat: 22, suggestions: ['Cod fillet 220g', 'Sweet potato wedges 150g', 'Tenderstem broccoli'] },
      { mealType: 'Snack',     calories: 160, protein: 20, carbs: 7,  fat: 4,  suggestions: ['Skyr yogurt 150g', 'Walnuts 15g'] },
    ],
    [
      { mealType: 'Breakfast', calories: 440, protein: 34, carbs: 38, fat: 13, suggestions: ['Protein pancakes x3', 'Maple syrup 10ml', 'Berries 60g'] },
      { mealType: 'Lunch',     calories: 630, protein: 54, carbs: 40, fat: 19, suggestions: ['Chicken Caesar salad (no croutons)', 'Boiled egg x2'] },
      { mealType: 'Dinner',    calories: 660, protein: 50, carbs: 40, fat: 21, suggestions: ['Duck breast 160g', 'Bulgur wheat 100g', 'Tenderstem broccoli'] },
      { mealType: 'Snack',     calories: 180, protein: 22, carbs: 8,  fat: 5,  suggestions: ['Edamame 100g', 'Rice cake x2'] },
    ],
    [
      { mealType: 'Breakfast', calories: 470, protein: 40, carbs: 28, fat: 16, suggestions: ['Egg muffins x4', 'Spinach & feta', 'Espresso'] },
      { mealType: 'Lunch',     calories: 600, protein: 50, carbs: 45, fat: 16, suggestions: ['Prawn noodle bowl', 'Bok choy', 'Light soy broth'] },
      { mealType: 'Dinner',    calories: 680, protein: 55, carbs: 34, fat: 22, suggestions: ['Sirloin steak 180g', 'Roasted mushrooms', 'Watercress salad'] },
      { mealType: 'Snack',     calories: 190, protein: 25, carbs: 8,  fat: 5,  suggestions: ['Protein shake 250ml', 'Rice cake x1'] },
    ],
  ],

  balanced: [
    [
      { mealType: 'Breakfast', calories: 380, protein: 18, carbs: 50, fat: 11, suggestions: ['Porridge oats 70g', 'Banana', 'Almond milk', 'Chia seeds 10g'] },
      { mealType: 'Lunch',     calories: 520, protein: 28, carbs: 58, fat: 16, suggestions: ['Chicken wrap whole wheat', 'Avocado', 'Tomato', 'Lettuce'] },
      { mealType: 'Dinner',    calories: 600, protein: 32, carbs: 65, fat: 18, suggestions: ['Salmon 170g', 'Brown rice 120g', 'Roasted veg'] },
      { mealType: 'Snack',     calories: 150, protein: 6,  carbs: 20, fat: 6,  suggestions: ['Apple', 'Peanut butter 15g'] },
    ],
    [
      { mealType: 'Breakfast', calories: 400, protein: 20, carbs: 48, fat: 13, suggestions: ['Eggs x2', 'Whole wheat toast x2', 'Orange juice 150ml'] },
      { mealType: 'Lunch',     calories: 540, protein: 30, carbs: 55, fat: 17, suggestions: ['Tuna salad sandwich', 'Side salad', 'Low-fat crisps 20g'] },
      { mealType: 'Dinner',    calories: 580, protein: 30, carbs: 62, fat: 16, suggestions: ['Chicken stir-fry 180g', 'Noodles 100g', 'Mixed veg', 'Soy sauce'] },
      { mealType: 'Snack',     calories: 160, protein: 7,  carbs: 22, fat: 5,  suggestions: ['Yogurt 130g', 'Granola 20g'] },
    ],
    [
      { mealType: 'Breakfast', calories: 360, protein: 16, carbs: 52, fat: 10, suggestions: ['Smoothie bowl', 'Frozen berries 100g', 'Banana', 'Oats 30g', 'Coconut flakes'] },
      { mealType: 'Lunch',     calories: 510, protein: 26, carbs: 58, fat: 15, suggestions: ['Lentil soup 300ml', 'Wholegrain roll', 'Side salad'] },
      { mealType: 'Dinner',    calories: 590, protein: 32, carbs: 60, fat: 17, suggestions: ['Turkey meatballs in tomato sauce', 'Spaghetti 90g', 'Parmesan 15g'] },
      { mealType: 'Snack',     calories: 140, protein: 5,  carbs: 19, fat: 5,  suggestions: ['Handful of grapes', 'Cheese 25g'] },
    ],
    [
      { mealType: 'Breakfast', calories: 390, protein: 19, carbs: 46, fat: 13, suggestions: ['French toast x2', 'Berries', 'Greek yogurt 100g'] },
      { mealType: 'Lunch',     calories: 530, protein: 28, carbs: 56, fat: 16, suggestions: ['Hummus & veggie wrap', 'Grilled halloumi 50g', 'Roasted peppers'] },
      { mealType: 'Dinner',    calories: 610, protein: 34, carbs: 62, fat: 17, suggestions: ['Beef ragu 160g', 'Pappardelle 90g', 'Garlic bread 30g'] },
      { mealType: 'Snack',     calories: 155, protein: 6,  carbs: 21, fat: 5,  suggestions: ['Rice cakes x3', 'Almond butter 15g'] },
    ],
    [
      { mealType: 'Breakfast', calories: 370, protein: 17, carbs: 50, fat: 11, suggestions: ['Bircher muesli 200g', 'Stewed apple', 'Honey drizzle'] },
      { mealType: 'Lunch',     calories: 545, protein: 29, carbs: 57, fat: 17, suggestions: ['Grilled chicken salad bowl', 'Feta 30g', 'Olives', 'Sourdough slice'] },
      { mealType: 'Dinner',    calories: 595, protein: 31, carbs: 64, fat: 16, suggestions: ['Prawn pasta 180g', 'Garlic', 'Chilli', 'Cherry tomatoes', 'Rocket'] },
      { mealType: 'Snack',     calories: 145, protein: 5,  carbs: 20, fat: 5,  suggestions: ['Banana', 'Peanut butter 10g'] },
    ],
    [
      { mealType: 'Breakfast', calories: 410, protein: 21, carbs: 44, fat: 14, suggestions: ['Shakshuka (2 eggs)', 'Wholegrain pitta', 'Mint tea'] },
      { mealType: 'Lunch',     calories: 520, protein: 27, carbs: 59, fat: 15, suggestions: ['Vegetable curry 300g', 'Basmati rice 100g', 'Naan 40g'] },
      { mealType: 'Dinner',    calories: 600, protein: 33, carbs: 63, fat: 17, suggestions: ['Sea bass 180g', 'New potatoes 150g', 'Samphire & lemon butter'] },
      { mealType: 'Snack',     calories: 150, protein: 6,  carbs: 20, fat: 5,  suggestions: ['Mixed nuts 20g', 'Medjool date x1'] },
    ],
    [
      { mealType: 'Breakfast', calories: 385, protein: 18, carbs: 48, fat: 12, suggestions: ['Acai bowl', 'Granola 25g', 'Kiwi', 'Blueberries'] },
      { mealType: 'Lunch',     calories: 535, protein: 29, carbs: 56, fat: 16, suggestions: ['Falafel wrap (3 falafel)', 'Tahini', 'Pickled cabbage', 'Carrot sticks'] },
      { mealType: 'Dinner',    calories: 605, protein: 33, carbs: 61, fat: 18, suggestions: ['Lamb kofta 180g', 'Couscous 100g', 'Tzatziki 60g', 'Grilled courgette'] },
      { mealType: 'Snack',     calories: 155, protein: 7,  carbs: 18, fat: 6,  suggestions: ['String cheese x1', 'Cherry tomatoes 80g'] },
    ],
  ],

  low_carb: [
    [
      { mealType: 'Breakfast', calories: 430, protein: 28, carbs: 8,  fat: 32, suggestions: ['Bacon x3 rashers', 'Eggs x3 scrambled', 'Avocado ½', 'Black coffee'] },
      { mealType: 'Lunch',     calories: 580, protein: 40, carbs: 10, fat: 42, suggestions: ['Tuna stuffed avocado', 'Cucumber slices', 'Cheese 40g'] },
      { mealType: 'Dinner',    calories: 650, protein: 48, carbs: 12, fat: 46, suggestions: ['Ribeye steak 200g', 'Sautéed mushrooms in butter', 'Leafy salad with olive oil'] },
      { mealType: 'Snack',     calories: 200, protein: 12, carbs: 4,  fat: 16, suggestions: ['Salami 40g', 'Cheese 30g', 'Olives 8 pcs'] },
    ],
    [
      { mealType: 'Breakfast', calories: 410, protein: 26, carbs: 6,  fat: 30, suggestions: ['Keto pancakes x3', 'Cream cheese', 'Berries 50g'] },
      { mealType: 'Lunch',     calories: 560, protein: 38, carbs: 9,  fat: 40, suggestions: ['Chicken caesar (no croutons)', 'Parmesan 30g', 'Cos lettuce', 'Anchovies'] },
      { mealType: 'Dinner',    calories: 630, protein: 46, carbs: 11, fat: 44, suggestions: ['Salmon with butter & dill 200g', 'Cauliflower rice 200g', 'Asparagus'] },
      { mealType: 'Snack',     calories: 180, protein: 10, carbs: 3,  fat: 14, suggestions: ['Macadamia nuts 30g', 'Dark chocolate 2 squares'] },
    ],
    [
      { mealType: 'Breakfast', calories: 450, protein: 30, carbs: 7, fat: 34, suggestions: ['Omelette x3 eggs', 'Spinach', 'Feta 30g', 'Cherry tomatoes'] },
      { mealType: 'Lunch',     calories: 570, protein: 42, carbs: 8, fat: 42, suggestions: ['Lettuce wrap burgers x2', 'Beef patty 120g', 'Cheddar', 'Burger sauce'] },
      { mealType: 'Dinner',    calories: 640, protein: 48, carbs: 10, fat: 45, suggestions: ['Pork belly 180g', 'Roasted broccoli', 'Garlic butter sauce'] },
      { mealType: 'Snack',     calories: 190, protein: 11, carbs: 3,  fat: 15, suggestions: ['Brie cheese 40g', 'Celery sticks 3'] },
    ],
    [
      { mealType: 'Breakfast', calories: 420, protein: 27, carbs: 5,  fat: 32, suggestions: ['Smoked salmon 80g', 'Cream cheese 40g', 'Cucumber', 'Capers'] },
      { mealType: 'Lunch',     calories: 555, protein: 40, carbs: 9,  fat: 38, suggestions: ['Zucchini noodles', 'Pesto 30g', 'Cherry tomatoes', 'Grilled chicken'] },
      { mealType: 'Dinner',    calories: 660, protein: 50, carbs: 10, fat: 47, suggestions: ['Duck leg confit 200g', 'Green beans in butter', 'Celeriac mash'] },
      { mealType: 'Snack',     calories: 170, protein: 9,  carbs: 2,  fat: 14, suggestions: ['Pepperoni 30g', 'String cheese x1'] },
    ],
    [
      { mealType: 'Breakfast', calories: 440, protein: 32, carbs: 6,  fat: 33, suggestions: ['Chia pudding 200ml coconut milk', 'Protein powder scoop', 'Berries 40g'] },
      { mealType: 'Lunch',     calories: 575, protein: 44, carbs: 8,  fat: 42, suggestions: ['Egg salad 3 eggs', 'Mayo 30g', 'Romaine lettuce cups', 'Bacon bits'] },
      { mealType: 'Dinner',    calories: 620, protein: 46, carbs: 11, fat: 43, suggestions: ['Lamb chops x2', 'Roasted courgette', 'Mint yogurt sauce 30g'] },
      { mealType: 'Snack',     calories: 185, protein: 11, carbs: 3,  fat: 15, suggestions: ['Cheese crackers 3 keto', 'Guacamole 40g'] },
    ],
    [
      { mealType: 'Breakfast', calories: 460, protein: 30, carbs: 7,  fat: 35, suggestions: ['Bulletproof coffee 350ml', 'Bacon & egg cups x2'] },
      { mealType: 'Lunch',     calories: 560, protein: 38, carbs: 7,  fat: 42, suggestions: ['Tuna tataki 180g', 'Edamame 60g', 'Sesame dressing', 'Nori'] },
      { mealType: 'Dinner',    calories: 650, protein: 50, carbs: 9,  fat: 46, suggestions: ['T-bone steak 220g', 'Garlic butter mushrooms', 'Blue cheese sauce 30g'] },
      { mealType: 'Snack',     calories: 195, protein: 12, carbs: 4,  fat: 15, suggestions: ['Almond flour crackers x4', 'Cream cheese 30g'] },
    ],
    [
      { mealType: 'Breakfast', calories: 425, protein: 28, carbs: 8,  fat: 31, suggestions: ['Avocado egg boats x2', 'Crispy bacon', 'Hot sauce'] },
      { mealType: 'Lunch',     calories: 570, protein: 42, carbs: 8,  fat: 41, suggestions: ['Caprese salad', 'Mozzarella 100g', 'Prosciutto 60g', 'Basil & olive oil'] },
      { mealType: 'Dinner',    calories: 640, protein: 48, carbs: 10, fat: 45, suggestions: ['Baked cod 200g', 'Cauliflower gratin', 'Rocket & parmesan salad'] },
      { mealType: 'Snack',     calories: 175, protein: 10, carbs: 2,  fat: 14, suggestions: ['Devilled eggs x2', 'Cucumber ribbons'] },
    ],
  ],

  plant_based: [
    [
      { mealType: 'Breakfast', calories: 380, protein: 14, carbs: 58, fat: 10, suggestions: ['Smoothie bowl', 'Mixed berries 100g', 'Oats 40g', 'Hemp seeds 15g', 'Almond milk'] },
      { mealType: 'Lunch',     calories: 510, protein: 20, carbs: 68, fat: 14, suggestions: ['Buddha bowl', 'Chickpeas 150g', 'Quinoa 100g', 'Roasted veg', 'Tahini'] },
      { mealType: 'Dinner',    calories: 590, protein: 24, carbs: 75, fat: 16, suggestions: ['Lentil dal 300g', 'Brown rice 120g', 'Naan 40g', 'Mango chutney'] },
      { mealType: 'Snack',     calories: 150, protein: 6,  carbs: 20, fat: 5,  suggestions: ['Apple slices', 'Almond butter 15g'] },
    ],
    [
      { mealType: 'Breakfast', calories: 400, protein: 16, carbs: 55, fat: 12, suggestions: ['Tofu scramble 200g', 'Tumeric & spinach', 'Whole wheat toast x2', 'Tomato'] },
      { mealType: 'Lunch',     calories: 530, protein: 22, carbs: 65, fat: 15, suggestions: ['Edamame & noodle bowl', 'Sesame ginger dressing', 'Cucumber', 'Nori strips'] },
      { mealType: 'Dinner',    calories: 600, protein: 26, carbs: 72, fat: 16, suggestions: ['Black bean tacos x2', 'Corn tortillas', 'Salsa', 'Guac 40g', 'Slaw'] },
      { mealType: 'Snack',     calories: 160, protein: 8,  carbs: 18, fat: 6,  suggestions: ['Hummus 60g', 'Carrot & celery sticks'] },
    ],
    [
      { mealType: 'Breakfast', calories: 370, protein: 12, carbs: 60, fat: 9,  suggestions: ['Overnight oats 80g', 'Chia 10g', 'Oat milk', 'Stewed plums', 'Maple syrup'] },
      { mealType: 'Lunch',     calories: 520, protein: 21, carbs: 66, fat: 14, suggestions: ['Pea & mint soup 400ml', 'Sourdough slice', 'Mixed seeds topping'] },
      { mealType: 'Dinner',    calories: 580, protein: 24, carbs: 70, fat: 15, suggestions: ['Mushroom risotto 300g', 'Nutritional yeast', 'Fresh herb salad'] },
      { mealType: 'Snack',     calories: 145, protein: 5,  carbs: 22, fat: 4,  suggestions: ['Medjool dates x2', 'Cashews 20g'] },
    ],
    [
      { mealType: 'Breakfast', calories: 410, protein: 18, carbs: 52, fat: 13, suggestions: ['Protein pancakes (vegan)', 'Berries 80g', 'Coconut yogurt 100g'] },
      { mealType: 'Lunch',     calories: 540, protein: 23, carbs: 67, fat: 15, suggestions: ['Tempeh stir-fry 180g', 'Soba noodles 90g', 'Peanut sauce', 'Beansprouts'] },
      { mealType: 'Dinner',    calories: 595, protein: 25, carbs: 73, fat: 15, suggestions: ['Jackfruit curry 300g', 'Basmati 120g', 'Roti 30g', 'Mango lassi (oat)'] },
      { mealType: 'Snack',     calories: 155, protein: 6,  carbs: 21, fat: 5,  suggestions: ['Trail mix 30g', 'Dried mango 20g'] },
    ],
    [
      { mealType: 'Breakfast', calories: 390, protein: 15, carbs: 57, fat: 11, suggestions: ['Chia parfait', 'Coconut milk', 'Passion fruit', 'Granola 25g'] },
      { mealType: 'Lunch',     calories: 525, protein: 22, carbs: 64, fat: 15, suggestions: ['Roasted veg & feta (plant-based)', 'Flatbread 60g', 'Lemon tahini dressing'] },
      { mealType: 'Dinner',    calories: 590, protein: 26, carbs: 68, fat: 16, suggestions: ['Chickpea tikka masala 300g', 'Brown rice 110g', 'Coriander chutney'] },
      { mealType: 'Snack',     calories: 150, protein: 7,  carbs: 18, fat: 5,  suggestions: ['Soy yogurt 150g', 'Flax seeds 10g'] },
    ],
    [
      { mealType: 'Breakfast', calories: 420, protein: 17, carbs: 54, fat: 13, suggestions: ['Avocado toast x2', 'Poached tofu 80g', 'Chilli flakes', 'Lemon'] },
      { mealType: 'Lunch',     calories: 510, protein: 20, carbs: 65, fat: 14, suggestions: ['Gazpacho 300ml', 'Sourdough x1', 'Roasted pepper hummus 50g'] },
      { mealType: 'Dinner',    calories: 600, protein: 25, carbs: 74, fat: 15, suggestions: ['Aubergine parmigiana (vegan)', 'Spaghetti 80g', 'Basil pesto (vegan)'] },
      { mealType: 'Snack',     calories: 160, protein: 6,  carbs: 22, fat: 5,  suggestions: ['Energy balls x2', 'Oats & peanut butter'] },
    ],
    [
      { mealType: 'Breakfast', calories: 400, protein: 16, carbs: 55, fat: 12, suggestions: ['Green smoothie 500ml', 'Spinach', 'Pea protein 25g', 'Mango', 'Ginger'] },
      { mealType: 'Lunch',     calories: 535, protein: 22, carbs: 66, fat: 15, suggestions: ['Vietnamese rice paper rolls x4', 'Tofu 100g', 'Peanut dipping sauce'] },
      { mealType: 'Dinner',    calories: 585, protein: 24, carbs: 71, fat: 15, suggestions: ['Tofu laksa 350ml', 'Rice noodles 80g', 'Bok choy', 'Lime & chilli'] },
      { mealType: 'Snack',     calories: 145, protein: 5,  carbs: 21, fat: 4,  suggestions: ['Popcorn 30g', 'Nutritional yeast sprinkle'] },
    ],
  ],

  flexible: [
    [
      { mealType: 'Breakfast', calories: 400, protein: 22, carbs: 46, fat: 13, suggestions: ['Eggs any style x2', 'Toast x2', 'Fruit of choice', 'Coffee or tea'] },
      { mealType: 'Lunch',     calories: 550, protein: 32, carbs: 55, fat: 16, suggestions: ['Protein + carb + veg of choice (e.g. chicken + rice + salad)'] },
      { mealType: 'Dinner',    calories: 620, protein: 36, carbs: 60, fat: 18, suggestions: ['Any balanced plate: protein 150g, starch 120g, 2 portions veg'] },
      { mealType: 'Snack',     calories: 160, protein: 8,  carbs: 18, fat: 5,  suggestions: ['Yogurt OR fruit + nuts OR rice cake + nut butter'] },
    ],
    [
      { mealType: 'Breakfast', calories: 380, protein: 18, carbs: 50, fat: 11, suggestions: ['Smoothie with protein powder', 'Any fruit you have', 'Oats or granola 40g'] },
      { mealType: 'Lunch',     calories: 530, protein: 30, carbs: 58, fat: 15, suggestions: ['Leftover dinner OR sandwich with protein filling', 'Side salad'] },
      { mealType: 'Dinner',    calories: 610, protein: 34, carbs: 62, fat: 17, suggestions: ['Stir-fry: protein + veggies + noodles or rice', 'Sauce of choice'] },
      { mealType: 'Snack',     calories: 155, protein: 7,  carbs: 19, fat: 5,  suggestions: ['Handful mixed nuts', 'Piece of fruit'] },
    ],
    [
      { mealType: 'Breakfast', calories: 420, protein: 20, carbs: 48, fat: 14, suggestions: ['Overnight oats', 'Greek yogurt', 'Berries', 'Honey'] },
      { mealType: 'Lunch',     calories: 545, protein: 31, carbs: 57, fat: 16, suggestions: ['Wrap with lean protein + salad', 'Side of fruit'] },
      { mealType: 'Dinner',    calories: 600, protein: 33, carbs: 63, fat: 16, suggestions: ['Pasta with protein sauce', 'Large green salad', 'Bread roll'] },
      { mealType: 'Snack',     calories: 165, protein: 8,  carbs: 20, fat: 5,  suggestions: ['Cheese + crackers', 'Cherry tomatoes'] },
    ],
    [
      { mealType: 'Breakfast', calories: 390, protein: 19, carbs: 47, fat: 12, suggestions: ['Avocado toast x2', 'Egg any style', 'Coffee'] },
      { mealType: 'Lunch',     calories: 540, protein: 30, carbs: 60, fat: 14, suggestions: ['Buddha bowl: grain + protein + veg + dressing'] },
      { mealType: 'Dinner',    calories: 615, protein: 35, carbs: 61, fat: 17, suggestions: ['Grilled or baked protein 180g', 'Roasted veg', 'Mash or rice 120g'] },
      { mealType: 'Snack',     calories: 150, protein: 6,  carbs: 19, fat: 5,  suggestions: ['Trail mix 30g', 'OR yogurt 130g'] },
    ],
    [
      { mealType: 'Breakfast', calories: 410, protein: 21, carbs: 45, fat: 14, suggestions: ['Protein pancakes x2', 'Berries', 'Maple syrup 10ml'] },
      { mealType: 'Lunch',     calories: 535, protein: 29, carbs: 57, fat: 16, suggestions: ['Soup + bread', 'Protein source (egg/tuna/chicken) added'] },
      { mealType: 'Dinner',    calories: 600, protein: 32, carbs: 64, fat: 16, suggestions: ['Curry with protein (any): 300g + rice 120g + naan 40g'] },
      { mealType: 'Snack',     calories: 160, protein: 7,  carbs: 20, fat: 5,  suggestions: ['Rice cake x2 + nut butter 15g'] },
    ],
    [
      { mealType: 'Breakfast', calories: 400, protein: 20, carbs: 48, fat: 12, suggestions: ['Cereal (high protein) + milk', 'Banana', 'Black coffee'] },
      { mealType: 'Lunch',     calories: 545, protein: 31, carbs: 58, fat: 16, suggestions: ['Salad bowl + protein topping + grains', 'Dressing of choice'] },
      { mealType: 'Dinner',    calories: 610, protein: 33, carbs: 63, fat: 17, suggestions: ['Fish (or meat) 180g + new potatoes 150g + green veg'] },
      { mealType: 'Snack',     calories: 155, protein: 7,  carbs: 19, fat: 5,  suggestions: ['Boiled egg x1', 'Piece of fruit'] },
    ],
    [
      { mealType: 'Breakfast', calories: 415, protein: 22, carbs: 46, fat: 13, suggestions: ['Shakshuka x2 eggs', 'Pitta bread', 'Fresh herb salad'] },
      { mealType: 'Lunch',     calories: 530, protein: 28, carbs: 59, fat: 15, suggestions: ['Baked potato + tuna/cheese filling', 'Side salad'] },
      { mealType: 'Dinner',    calories: 605, protein: 34, carbs: 61, fat: 17, suggestions: ['Tagine (any protein) 300g', 'Couscous 100g', 'Harissa flatbread'] },
      { mealType: 'Snack',     calories: 160, protein: 7,  carbs: 20, fat: 5,  suggestions: ['Edamame 80g', 'Rice cracker x3'] },
    ],
  ],
};

const GENERIC_WEEK_PT: Record<DietKey, MealTemplate[][]> = {
  high_protein: [
    // Day pattern 1
    [
      { mealType: 'Pequeno-almoço', calories: 450, protein: 38, carbs: 30, fat: 14, suggestions: ['4 ovos mexidos', 'iogurte grego 150g', 'Café preto'] },
      { mealType: 'Almoço',     calories: 620, protein: 52, carbs: 40, fat: 18, suggestions: ['Peito de frango grelhado 220g', 'Arroz integral 120g', 'Brócolos cozidos'] },
      { mealType: 'Jantar',    calories: 680, protein: 55, carbs: 35, fat: 22, suggestions: ['Salmão assado 200g', 'Batata doce 150g', 'Espargos'] },
      { mealType: 'Lanche',     calories: 180, protein: 22, carbs: 8,  fat: 5,  suggestions: ['Queijo cottage 180g', 'Fatias de pepino'] },
    ],
    // Day pattern 2
    [
      { mealType: 'Pequeno-almoço', calories: 480, protein: 40, carbs: 28, fat: 16, suggestions: ['Batido de proteína (30g whey)', 'Aveia 60g', '1 banana'] },
      { mealType: 'Almoço',     calories: 590, protein: 48, carbs: 45, fat: 15, suggestions: ['Tigela de carne de peru picada 200g', 'Quinoa 100g', 'Folhas verdes'] },
      { mealType: 'Jantar',    calories: 650, protein: 50, carbs: 38, fat: 20, suggestions: ['Bife de vaca 180g', 'Batata assada 200g', 'Feijão verde'] },
      { mealType: 'Lanche',     calories: 200, protein: 25, carbs: 10, fat: 6,  suggestions: ['Ovos cozidos x3', 'Tomates cereja'] },
    ],
    // Day patterns 3–7 (abbreviated for brevity; same structure)
    [
      { mealType: 'Pequeno-almoço', calories: 420, protein: 35, carbs: 32, fat: 12, suggestions: ['Omolete de claras x5', 'Tosta integral x1', 'Abacate ¼'] },
      { mealType: 'Almoço',     calories: 600, protein: 50, carbs: 42, fat: 16, suggestions: ['Atum 180g', 'Massa integral 90g', 'Molho de tomate'] },
      { mealType: 'Jantar',    calories: 660, protein: 54, carbs: 30, fat: 24, suggestions: ['Lombo de porco 200g', 'Puré de couve-flor', 'Ervilhas 80g'] },
      { mealType: 'Lanche',     calories: 170, protein: 20, carbs: 6,  fat: 4,  suggestions: ['Barra de proteína (20g+)', 'Amêndoas 15g'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 460, protein: 36, carbs: 35, fat: 14, suggestions: ['Aveia adormecida 80g', 'Scoop de whey', 'Mirtilos 80g'] },
      { mealType: 'Almoço',     calories: 610, protein: 53, carbs: 38, fat: 17, suggestions: ['Salteado de camarão 200g', 'Arroz branco 120g', 'Pak choi'] },
      { mealType: 'Jantar',    calories: 640, protein: 52, carbs: 36, fat: 20, suggestions: ['Coxas de frango 220g', 'Vegetais assados 200g', 'Húmus 30g'] },
      { mealType: 'Lanche',     calories: 190, protein: 24, carbs: 9,  fat: 5,  suggestions: ['Queijo magro 50g', 'Bolachas integrais x5'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 500, protein: 42, carbs: 30, fat: 18, suggestions: ['Salmão fumado 80g', 'Ovos x2', 'Pão de centeio x1'] },
      { mealType: 'Almoço',     calories: 580, protein: 48, carbs: 44, fat: 14, suggestions: ['Tigela de carne picada magra 180g', 'Lentilhas 100g', 'Salada de espinafres'] },
      { mealType: 'Jantar',    calories: 670, protein: 56, carbs: 32, fat: 22, suggestions: ['Filete de bacalhau 220g', 'Batata doce wedges 150g', 'Brócolos'] },
      { mealType: 'Lanche',     calories: 160, protein: 20, carbs: 7,  fat: 4,  suggestions: ['Iogurte Skyr 150g', 'Nozes 15g'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 440, protein: 34, carbs: 38, fat: 13, suggestions: ['Panquecas de proteína x3', 'Xarope de ácer 10ml', 'Frutos vermelhos 60g'] },
      { mealType: 'Almoço',     calories: 630, protein: 54, carbs: 40, fat: 19, suggestions: ['Salada Caesar de frango (sem croutons)', 'Ovo cozido x2'] },
      { mealType: 'Jantar',    calories: 660, protein: 50, carbs: 40, fat: 21, suggestions: ['Peito de pato 160g', 'Trigo bulgur 100g', 'Brócolos'] },
      { mealType: 'Lanche',     calories: 180, protein: 22, carbs: 8,  fat: 5,  suggestions: ['Edamame 100g', 'Bolacha de arroz x2'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 470, protein: 40, carbs: 28, fat: 16, suggestions: ['Muffins de ovo x4', 'Espinafres & feta', 'Expresso'] },
      { mealType: 'Almoço',     calories: 600, protein: 50, carbs: 45, fat: 16, suggestions: ['Tigela de noodles com camarão', 'Bok choy', 'Caldo de soja leve'] },
      { mealType: 'Jantar',    calories: 680, protein: 55, carbs: 34, fat: 22, suggestions: ['Bife da vazia 180g', 'Cogumelos assados', 'Salada de agrião'] },
      { mealType: 'Lanche',     calories: 190, protein: 25, carbs: 8,  fat: 5,  suggestions: ['Batido de proteína 250ml', 'Bolacha de arroz x1'] },
    ],
  ],

  balanced: [
    [
      { mealType: 'Pequeno-almoço', calories: 380, protein: 18, carbs: 50, fat: 11, suggestions: ['Papas de aveia 70g', 'Banana', 'Leite de amêndoa', 'Sementes de chia 10g'] },
      { mealType: 'Almoço',     calories: 520, protein: 28, carbs: 58, fat: 16, suggestions: ['Wrap de frango integral', 'Abacate', 'Tomate', 'Alface'] },
      { mealType: 'Jantar',    calories: 600, protein: 32, carbs: 65, fat: 18, suggestions: ['Salmão 170g', 'Arroz integral 120g', 'Vegetais assados'] },
      { mealType: 'Lanche',     calories: 150, protein: 6,  carbs: 20, fat: 6,  suggestions: ['Maçã', 'Manteiga de amendoim 15g'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 400, protein: 20, carbs: 48, fat: 13, suggestions: ['Ovos x2', 'Tosta integral x2', 'Sumo de laranja 150ml'] },
      { mealType: 'Almoço',     calories: 540, protein: 30, carbs: 55, fat: 17, suggestions: ['Atum salad sandwich', 'Salada', 'Batatas fritas magras 20g'] },
      { mealType: 'Jantar',    calories: 580, protein: 30, carbs: 62, fat: 16, suggestions: ['Salteado de frango 180g', 'Noodles 100g', 'Vegetais mistos', 'Molho de soja'] },
      { mealType: 'Lanche',     calories: 160, protein: 7,  carbs: 22, fat: 5,  suggestions: ['Iogurte 130g', 'Granola 20g'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 360, protein: 16, carbs: 52, fat: 10, suggestions: ['Tigela de smoothie', 'Frutos vermelhos congelados 100g', 'Banana', 'Aveia 30g', 'Flocos de coco'] },
      { mealType: 'Almoço',     calories: 510, protein: 26, carbs: 58, fat: 15, suggestions: ['Sopa de lentilhas 300ml', 'Pão integral', 'Salada'] },
      { mealType: 'Jantar',    calories: 590, protein: 32, carbs: 60, fat: 17, suggestions: ['Almôndegas de peru em molho de tomate', 'Esparguete 90g', 'Parmesão 15g'] },
      { mealType: 'Lanche',     calories: 140, protein: 5,  carbs: 19, fat: 5,  suggestions: ['Mão-cheia de uvas', 'Queijo 25g'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 390, protein: 19, carbs: 46, fat: 13, suggestions: ['Rabanadas x2', 'Frutos vermelhos', 'iogurte grego 100g'] },
      { mealType: 'Almoço',     calories: 530, protein: 28, carbs: 56, fat: 16, suggestions: ['Húmus & veggie wrap', 'Halloumi grelhado 50g', 'Pimentos assados'] },
      { mealType: 'Jantar',    calories: 610, protein: 34, carbs: 62, fat: 17, suggestions: ['Ragu de carne 160g', 'Pappardelle 90g', 'Pão de alho 30g'] },
      { mealType: 'Lanche',     calories: 155, protein: 6,  carbs: 21, fat: 5,  suggestions: ['Bolacha de arrozs x3', 'Manteiga de amêndoa 15g'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 370, protein: 17, carbs: 50, fat: 11, suggestions: ['Muesli Bircher 200g', 'Maçã estufada', 'Fio de mel'] },
      { mealType: 'Almoço',     calories: 545, protein: 29, carbs: 57, fat: 17, suggestions: ['Tigela de salada de frango grelhado', 'Feta 30g', 'Azeitonas', 'Fatia de pão de massa mãe'] },
      { mealType: 'Jantar',    calories: 595, protein: 31, carbs: 64, fat: 16, suggestions: ['Massa com camarão 180g', 'Alho', 'Malagueta', 'Tomates cereja', 'Rúcula'] },
      { mealType: 'Lanche',     calories: 145, protein: 5,  carbs: 20, fat: 5,  suggestions: ['Banana', 'Manteiga de amendoim 10g'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 410, protein: 21, carbs: 44, fat: 14, suggestions: ['Shakshuka (2 eggs)', 'Pão pita integral', 'Chá de menta'] },
      { mealType: 'Almoço',     calories: 520, protein: 27, carbs: 59, fat: 15, suggestions: ['Caril de vegetais 300g', 'Arroz basmati 100g', 'Naan 40g'] },
      { mealType: 'Jantar',    calories: 600, protein: 33, carbs: 63, fat: 17, suggestions: ['Robalo 180g', 'Batatas novas 150g', 'Salicórnia e manteiga de limão'] },
      { mealType: 'Lanche',     calories: 150, protein: 6,  carbs: 20, fat: 5,  suggestions: ['Nozes mistas 20g', 'Tâmara Medjool x1'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 385, protein: 18, carbs: 48, fat: 12, suggestions: ['Tigela de açaí', 'Granola 25g', 'Kiwi', 'Mirtilos'] },
      { mealType: 'Almoço',     calories: 535, protein: 29, carbs: 56, fat: 16, suggestions: ['Wrap de falafel (3 falafel)', 'Tahini', 'Couve em conserva', 'Palitos de cenoura'] },
      { mealType: 'Jantar',    calories: 605, protein: 33, carbs: 61, fat: 18, suggestions: ['Kofta de borrego 180g', 'Cuscuz 100g', 'Tzatziki 60g', 'Curgete grelhada'] },
      { mealType: 'Lanche',     calories: 155, protein: 7,  carbs: 18, fat: 6,  suggestions: ['Queijo de corda x1', 'Tomates cereja 80g'] },
    ],
  ],

  low_carb: [
    [
      { mealType: 'Pequeno-almoço', calories: 430, protein: 28, carbs: 8,  fat: 32, suggestions: ['Bacon x3 rashers', 'Ovos x3 scrambled', 'Abacate ½', 'Café preto'] },
      { mealType: 'Almoço',     calories: 580, protein: 40, carbs: 10, fat: 42, suggestions: ['Atum stuffed avocado', 'Fatias de pepino', 'Queijo 40g'] },
      { mealType: 'Jantar',    calories: 650, protein: 48, carbs: 12, fat: 46, suggestions: ['Bife ribeye 200g', 'Cogumelos salteados em manteiga', 'Salada de folhas com azeite'] },
      { mealType: 'Lanche',     calories: 200, protein: 12, carbs: 4,  fat: 16, suggestions: ['Salame 40g', 'Queijo 30g', 'Azeitonas 8 unid'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 410, protein: 26, carbs: 6,  fat: 30, suggestions: ['Panquecas keto x3', 'Queijo creme', 'Frutos vermelhos 50g'] },
      { mealType: 'Almoço',     calories: 560, protein: 38, carbs: 9,  fat: 40, suggestions: ['Caesar de frango (sem croutons)', 'Parmesão 30g', 'Alface romana', 'Anchovas'] },
      { mealType: 'Jantar',    calories: 630, protein: 46, carbs: 11, fat: 44, suggestions: ['Salmão with butter & dill 200g', 'Arroz de couve-flor 200g', 'Espargos'] },
      { mealType: 'Lanche',     calories: 180, protein: 10, carbs: 3,  fat: 14, suggestions: ['Nozes macadâmia 30g', 'Chocolate negro 2 quadrados'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 450, protein: 30, carbs: 7, fat: 34, suggestions: ['Omolete x3 eggs', 'Espinafres', 'Feta 30g', 'Tomates cereja'] },
      { mealType: 'Almoço',     calories: 570, protein: 42, carbs: 8, fat: 42, suggestions: ['Alface wrap burgers x2', 'Hambúrguer de vaca 120g', 'Cheddar', 'Molho de hambúrguer'] },
      { mealType: 'Jantar',    calories: 640, protein: 48, carbs: 10, fat: 45, suggestions: ['Barriga de porco 180g', 'Brócolos assados', 'Alho butter sauce'] },
      { mealType: 'Lanche',     calories: 190, protein: 11, carbs: 3,  fat: 15, suggestions: ['Queijo brie 40g', 'Palitos de aipo 3'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 420, protein: 27, carbs: 5,  fat: 32, suggestions: ['Salmão fumado 80g', 'Queijo creme 40g', 'Pepino', 'Alcaparras'] },
      { mealType: 'Almoço',     calories: 555, protein: 40, carbs: 9,  fat: 38, suggestions: ['Noodles de curgete', 'Pesto 30g', 'Tomates cereja', 'Frango grelhado'] },
      { mealType: 'Jantar',    calories: 660, protein: 50, carbs: 10, fat: 47, suggestions: ['Perna de pato confitada 200g', 'Feijão verde in butter', 'Puré de aipo'] },
      { mealType: 'Lanche',     calories: 170, protein: 9,  carbs: 2,  fat: 14, suggestions: ['Pepperoni 30g', 'Queijo de corda x1'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 440, protein: 32, carbs: 6,  fat: 33, suggestions: ['Pudim de chia 200ml leite de coco', 'Scoop de proteína', 'Frutos vermelhos 40g'] },
      { mealType: 'Almoço',     calories: 575, protein: 44, carbs: 8,  fat: 42, suggestions: ['Salada de ovo 3 eggs', 'Maionese 30g', 'Copos de alface romana', 'Pedaços de bacon'] },
      { mealType: 'Jantar',    calories: 620, protein: 46, carbs: 11, fat: 43, suggestions: ['Costeletas de borrego x2', 'Curgete assada', 'Molho de iogurte e menta 30g'] },
      { mealType: 'Lanche',     calories: 185, protein: 11, carbs: 3,  fat: 15, suggestions: ['Queijo crackers 3 keto', 'Guacamoleamole 40g'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 460, protein: 30, carbs: 7,  fat: 35, suggestions: ['Café Bulletproof 350ml', 'Copos de bacon e ovo x2'] },
      { mealType: 'Almoço',     calories: 560, protein: 38, carbs: 7,  fat: 42, suggestions: ['Atum tataki 180g', 'Edamame 60g', 'Molho de sésamo', 'Nori'] },
      { mealType: 'Jantar',    calories: 650, protein: 50, carbs: 9,  fat: 46, suggestions: ['Bife T-bone 220g', 'Alho butter mushrooms', 'Molho de queijo azul 30g'] },
      { mealType: 'Lanche',     calories: 195, protein: 12, carbs: 4,  fat: 15, suggestions: ['Bolachas de farinha de amêndoa x4', 'Queijo creme 30g'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 425, protein: 28, carbs: 8,  fat: 31, suggestions: ['Abacate egg boats x2', 'Bacon estaladiço', 'Molho picante'] },
      { mealType: 'Almoço',     calories: 570, protein: 42, carbs: 8,  fat: 41, suggestions: ['Salada caprese', 'Mozzarella 100g', 'Presunto 60g', 'Manjericão e azeite'] },
      { mealType: 'Jantar',    calories: 640, protein: 48, carbs: 10, fat: 45, suggestions: ['Bacalhau assado 200g', 'Gratinado de couve-flor', 'Rúcula & parmesan salad'] },
      { mealType: 'Lanche',     calories: 175, protein: 10, carbs: 2,  fat: 14, suggestions: ['Ovos recheados x2', 'Fitas de pepino'] },
    ],
  ],

  plant_based: [
    [
      { mealType: 'Pequeno-almoço', calories: 380, protein: 14, carbs: 58, fat: 10, suggestions: ['Tigela de smoothie', 'Mixed berries 100g', 'Aveia 40g', 'Sementes de cânhamo 15g', 'Leite de amêndoa'] },
      { mealType: 'Almoço',     calories: 510, protein: 20, carbs: 68, fat: 14, suggestions: ['Tigela de Buddha', 'Grão-de-bico 150g', 'Quinoa 100g', 'Vegetais assados', 'Tahini'] },
      { mealType: 'Jantar',    calories: 590, protein: 24, carbs: 75, fat: 16, suggestions: ['Dal de lentilhas 300g', 'Arroz integral 120g', 'Naan 40g', 'Chutney de manga'] },
      { mealType: 'Lanche',     calories: 150, protein: 6,  carbs: 20, fat: 5,  suggestions: ['Maçã slices', 'Manteiga de amêndoa 15g'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 400, protein: 16, carbs: 55, fat: 12, suggestions: ['Mexido de tofu 200g', 'Açafrão e espinafres', 'Tosta integral x2', 'Tomate'] },
      { mealType: 'Almoço',     calories: 530, protein: 22, carbs: 65, fat: 15, suggestions: ['Tigela de edamame e noodles', 'Molho de sésamo e gengibre', 'Pepino', 'Tiras de nori'] },
      { mealType: 'Jantar',    calories: 600, protein: 26, carbs: 72, fat: 16, suggestions: ['Tacos de feijão preto x2', 'Tortilhas de milho', 'Salsa', 'Guacamole 40g', 'Salada de repolho'] },
      { mealType: 'Lanche',     calories: 160, protein: 8,  carbs: 18, fat: 6,  suggestions: ['Húmus 60g', 'Carrot & celery sticks'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 370, protein: 12, carbs: 60, fat: 9,  suggestions: ['Aveia adormecida 80g', 'Chia 10g', 'Leite de aveia', 'Ameixas estufadas', 'Xarope de ácer'] },
      { mealType: 'Almoço',     calories: 520, protein: 21, carbs: 66, fat: 14, suggestions: ['Sopa de ervilha e menta 400ml', 'Fatia de pão de massa mãe', 'Cobertura de sementes mistas'] },
      { mealType: 'Jantar',    calories: 580, protein: 24, carbs: 70, fat: 15, suggestions: ['Risoto de cogumelos 300g', 'Levedura nutricional', 'Salada de ervas frescas'] },
      { mealType: 'Lanche',     calories: 145, protein: 5,  carbs: 22, fat: 4,  suggestions: ['Tâmara Medjools x2', 'Cajus 20g'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 410, protein: 18, carbs: 52, fat: 13, suggestions: ['Panquecas de proteína (vegan)', 'Frutos vermelhos 80g', 'Iogurte de coco 100g'] },
      { mealType: 'Almoço',     calories: 540, protein: 23, carbs: 67, fat: 15, suggestions: ['Salteado de tempeh 180g', 'Noodles soba 90g', 'Molho de amendoim', 'Rebentos de feijão'] },
      { mealType: 'Jantar',    calories: 595, protein: 25, carbs: 73, fat: 15, suggestions: ['Caril de jaca 300g', 'Basmati 120g', 'Roti 30g', 'Lassi de manga (oat)'] },
      { mealType: 'Lanche',     calories: 155, protein: 6,  carbs: 21, fat: 5,  suggestions: ['Mistura de sementes/frutos secos 30g', 'Manga desidratada 20g'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 390, protein: 15, carbs: 57, fat: 11, suggestions: ['Parfait de chia', 'Coconut milk', 'Maracujá', 'Granola 25g'] },
      { mealType: 'Almoço',     calories: 525, protein: 22, carbs: 64, fat: 15, suggestions: ['Vegetais assados & feta (base vegetal)', 'Pão achatado 60g', 'Molho de limão e tahini'] },
      { mealType: 'Jantar',    calories: 590, protein: 26, carbs: 68, fat: 16, suggestions: ['Tikka masala de grão-de-bico 300g', 'Arroz integral 110g', 'Chutney de coentros'] },
      { mealType: 'Lanche',     calories: 150, protein: 7,  carbs: 18, fat: 5,  suggestions: ['Iogurte de soja 150g', 'Sementes de linhaça 10g'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 420, protein: 17, carbs: 54, fat: 13, suggestions: ['Abacate toast x2', 'Tofu escalfado 80g', 'Malagueta flakes', 'Limão'] },
      { mealType: 'Almoço',     calories: 510, protein: 20, carbs: 65, fat: 14, suggestions: ['Gaspacho 300ml', 'Sourdough x1', 'Húmus de pimento assado 50g'] },
      { mealType: 'Jantar',    calories: 600, protein: 25, carbs: 74, fat: 15, suggestions: ['Beringela à parmegiana (vegan)', 'Esparguete 80g', 'Pesto de manjericão (vegan)'] },
      { mealType: 'Lanche',     calories: 160, protein: 6,  carbs: 22, fat: 5,  suggestions: ['Bolas de energia x2', 'Aveia & peanut butter'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 400, protein: 16, carbs: 55, fat: 12, suggestions: ['Smoothie verde 500ml', 'Espinafres', 'Proteína de ervilha 25g', 'Manga', 'Gengibre'] },
      { mealType: 'Almoço',     calories: 535, protein: 22, carbs: 66, fat: 15, suggestions: ['Rolos de papel de arroz vietnamitas x4', 'Tofu 100g', 'Molho de amendoim para mergulhar'] },
      { mealType: 'Jantar',    calories: 585, protein: 24, carbs: 71, fat: 15, suggestions: ['Laksa de tofu 350ml', 'Noodles de arroz 80g', 'Bok choy', 'Lima e malagueta'] },
      { mealType: 'Lanche',     calories: 145, protein: 5,  carbs: 21, fat: 4,  suggestions: ['Pipocas 30g', 'Levedura nutricional sprinkle'] },
    ],
  ],

  flexible: [
    [
      { mealType: 'Pequeno-almoço', calories: 400, protein: 22, carbs: 46, fat: 13, suggestions: ['Ovos any style x2', 'Toast x2', 'Fruta à escolha', 'Café ou chá'] },
      { mealType: 'Almoço',     calories: 550, protein: 32, carbs: 55, fat: 16, suggestions: ['Proteína + hidratos + vegetais à escolha (e.g. chicken + rice + salad)'] },
      { mealType: 'Jantar',    calories: 620, protein: 36, carbs: 60, fat: 18, suggestions: ['Qualquer prato equilibrado: proteína 150g, amido 120g, 2 porções de vegetais'] },
      { mealType: 'Lanche',     calories: 160, protein: 8,  carbs: 18, fat: 5,  suggestions: ['Iogurte OU fruta + nozes OU bolacha de arroz + manteiga de frutos secos'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 380, protein: 18, carbs: 50, fat: 11, suggestions: ['Smoothie com proteína em pó', 'Qualquer fruta que tiver', 'Aveia or granola 40g'] },
      { mealType: 'Almoço',     calories: 530, protein: 30, carbs: 58, fat: 15, suggestions: ['Restos do jantar OU sanduíche com recheio de proteína', 'Salada'] },
      { mealType: 'Jantar',    calories: 610, protein: 34, carbs: 62, fat: 17, suggestions: ['Salteado: proteína + vegetais + noodles ou arroz', 'Molho à escolha'] },
      { mealType: 'Lanche',     calories: 155, protein: 7,  carbs: 19, fat: 5,  suggestions: ['Mão-cheia de nozes mistas', 'Peça de fruta'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 420, protein: 20, carbs: 48, fat: 14, suggestions: ['Aveia adormecida', 'iogurte grego', 'Frutos vermelhos', 'Mel'] },
      { mealType: 'Almoço',     calories: 545, protein: 31, carbs: 57, fat: 16, suggestions: ['Wrap com proteína magra + salada', 'Fruta'] },
      { mealType: 'Jantar',    calories: 600, protein: 33, carbs: 63, fat: 16, suggestions: ['Massa com molho de proteína', 'Salada verde grande', 'Pão de água'] },
      { mealType: 'Lanche',     calories: 165, protein: 8,  carbs: 20, fat: 5,  suggestions: ['Queijo + crackers', 'Tomates cereja'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 390, protein: 19, carbs: 47, fat: 12, suggestions: ['Abacate toast x2', 'Ovo ao seu gosto', 'Café'] },
      { mealType: 'Almoço',     calories: 540, protein: 30, carbs: 60, fat: 14, suggestions: ['Tigela de Buddha: grain + protein + veg + dressing'] },
      { mealType: 'Jantar',    calories: 615, protein: 35, carbs: 61, fat: 17, suggestions: ['Proteína grelhada ou assada 180g', 'Vegetais assados', 'Puré ou arroz 120g'] },
      { mealType: 'Lanche',     calories: 150, protein: 6,  carbs: 19, fat: 5,  suggestions: ['Mistura de sementes/frutos secos 30g', 'OU yogurt 130g'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 410, protein: 21, carbs: 45, fat: 14, suggestions: ['Panquecas de proteína x2', 'Frutos vermelhos', 'Xarope de ácer 10ml'] },
      { mealType: 'Almoço',     calories: 535, protein: 29, carbs: 57, fat: 16, suggestions: ['Sopa + pão', 'Fonte de proteína (ovo/atum/frango) adicionada'] },
      { mealType: 'Jantar',    calories: 600, protein: 32, carbs: 64, fat: 16, suggestions: ['Caril com proteína (qualquer): 300g + rice 120g + naan 40g'] },
      { mealType: 'Lanche',     calories: 160, protein: 7,  carbs: 20, fat: 5,  suggestions: ['Bolacha de arroz x2 + nut butter 15g'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 400, protein: 20, carbs: 48, fat: 12, suggestions: ['Cereal (rico em proteína) + leite', 'Banana', 'Café preto'] },
      { mealType: 'Almoço',     calories: 545, protein: 31, carbs: 58, fat: 16, suggestions: ['Tigela de salada + cobertura de proteína + grãos', 'Molho à escolha'] },
      { mealType: 'Jantar',    calories: 610, protein: 33, carbs: 63, fat: 17, suggestions: ['Peixe (ou carne) 180g + new potatoes 150g + vegetais verdes'] },
      { mealType: 'Lanche',     calories: 155, protein: 7,  carbs: 19, fat: 5,  suggestions: ['Ovo cozido x1', 'Peça de fruta'] },
    ],
    [
      { mealType: 'Pequeno-almoço', calories: 415, protein: 22, carbs: 46, fat: 13, suggestions: ['Shakshuka x2 eggs', 'Pitta bread', 'Salada de ervas frescas'] },
      { mealType: 'Almoço',     calories: 530, protein: 28, carbs: 59, fat: 15, suggestions: ['Batata assada + tuna/cheese filling', 'Salada'] },
      { mealType: 'Jantar',    calories: 605, protein: 34, carbs: 61, fat: 17, suggestions: ['Tajine (qualquer proteína) 300g', 'Cuscuz 100g', 'Pão achatado de harissa'] },
      { mealType: 'Lanche',     calories: 160, protein: 7,  carbs: 20, fat: 5,  suggestions: ['Edamame 80g', 'Bolacha de arroz x3'] },
    ],
  ],
};

// Alias for now — in a real app you'd differentiate
GENERIC_WEEK['flexible'] = GENERIC_WEEK['balanced'];

/** Build a 28-day plan from the 7-day rotating pattern */

/** Build a 28-day plan from the 7-day rotating pattern */
function build30DayPlan(dietKey: DietKey, lang: string): DayTemplate[] {
  const dict = lang.startsWith('pt') ? GENERIC_WEEK_PT : GENERIC_WEEK;
  const weekPatterns = dict[dietKey] ?? dict['balanced'];
  return Array.from({ length: 28 }, (_, i) => ({
    day: i + 1,
    meals: weekPatterns[i % weekPatterns.length],
  }));
}

// ─── Diet + goal colour themes ────────────────────────────────────────────────

const DIET_META: Record<DietKey, { label: string; labelKey: string; color: string; bg: string; icon: string }> = {
  high_protein: { label: 'Alta Proteína',  labelKey: 'meals.diet.high_protein',  color: '#ef4444', bg: '#fee2e2', icon: 'barbell-outline' },
  low_carb:     { label: 'Baixo Carb',      labelKey: 'meals.diet.low_carb',      color: '#d97706', bg: '#fef3c7', icon: 'leaf-outline' },
  balanced:     { label: 'Equilibrado',      labelKey: 'meals.diet.balanced',      color: '#2563eb', bg: '#dbeafe', icon: 'nutrition-outline' },
  plant_based:  { label: 'Base Vegetal',     labelKey: 'meals.diet.plant_based',   color: '#16a34a', bg: '#dcfce7', icon: 'flower-outline' },
  flexible:     { label: 'Flexível',         labelKey: 'meals.diet.flexible',      color: '#8b5cf6', bg: '#ede9fe', icon: 'shuffle-outline' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function MealCard({
  meal,
  dayIndex,
  mealIndex,
  isPro,
  userId,
  canSwap,
  swapLoading,
  onSwapPress,
}: {
  meal: MealTemplate;
  dayIndex: number;
  mealIndex: number;
  isPro: boolean;
  userId?: string;
  canSwap: boolean;
  swapLoading: boolean;
  onSwapPress: (dayIndex: number, mealIndex: number, mealType: string) => void;
}) {
  const logFoodEntry = useMutation(api.food.logFoodEntry);
  const today = new Date().toISOString().split('T')[0];
  const [logging, setLogging] = useState(false);
  const { t, i18n } = useTranslation();

  const spinValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!swapLoading) return;
    spinValue.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 850,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spinValue, swapLoading]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleLog = async () => {
    if (!userId) return;
    setLogging(true);
    try {
      await logFoodEntry({
        userId: userId as any,
        foodName: `Meal Plan ${meal.mealType} - Day ${dayIndex + 1}`,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        servingSize: '1 meal',
        mealType: meal.mealType.toLowerCase() as MealTypeLower,
        date: today,
      });
      Alert.alert(t('meals.loggedTitle', 'Logged!'), t('meals.loggedMsg', { mealType: meal.mealType, defaultValue: `${meal.mealType} added to today's fuel.` }));
    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e?.message ?? t('meals.logError', 'Could not log meal.'));
    } finally {
      setLogging(false);
    }
  };

  const MEAL_LABEL: Record<string, string> = {
    Breakfast: t('meals.breakfast', 'Breakfast'),
    Lunch:     t('meals.lunch', 'Lunch'),
    Dinner:    t('meals.dinner', 'Dinner'),
    Snack:     t('meals.snack', 'Snack'),
  };
  const mealLabel = MEAL_LABEL[meal.mealType] ?? meal.mealType;

  const MEAL_ACCENT: Record<string, string> = {
    Breakfast: '#f59e0b', Lunch: '#10b981', Dinner: '#8b5cf6', Snack: '#ef4444',
  };
  const accent = MEAL_ACCENT[meal.mealType] ?? '#2563eb';

  return (
    <View style={mcS.card}>
      <View style={mcS.header}>
        <View style={[mcS.typeBadge, { backgroundColor: accent + '22' }]}>
          <Text style={[mcS.typeText, { color: accent }]}>{mealLabel}</Text>
        </View>
        <Text style={mcS.cals}>{meal.calories} kcal</Text>
      </View>

      <View style={mcS.macroRow}>
        {[
          { label: t('common.proteinShort', 'P'), val: meal.protein, color: '#ef4444' },
          { label: t('common.carbsShort', 'C'), val: meal.carbs,   color: '#2563eb' },
          { label: t('common.fatShort', 'F'), val: meal.fat,     color: '#f59e0b' },
        ].map(m => (
          <View key={m.label} style={mcS.macroItem}>
            <Text style={[mcS.macroVal, { color: m.color }]}>{m.val}g</Text>
            <Text style={mcS.macroLabel}>{m.label}</Text>
          </View>
        ))}
      </View>

      <View style={mcS.suggestions}>
        {meal.suggestions.map((s, i) => (
          <Text key={i} style={mcS.suggestion}>· {s}</Text>
        ))}
      </View>

      <View style={mcS.actions}>
        <TouchableOpacity
          style={[mcS.swapBtn, !canSwap && mcS.swapBtnLocked]}
          onPress={() => onSwapPress(dayIndex, mealIndex, meal.mealType)}
          onLongPress={() => {
            Alert.alert(
              t('meals.swapTitle', 'Swap meal'),
              isPro
                ? t('meals.swapProMsg', "Tell our AI what you're craving, and we'll swap this meal.")
                : t('meals.swapFreeMsg', 'Upgrade to Pro to swap meals.')
            );
          }}
          activeOpacity={0.85}
          disabled={swapLoading}
        >
          <Animated.View style={{ transform: [{ rotate: swapLoading ? spin : '0deg' }] }}>
            <Ionicons name="refresh" size={14} color={canSwap ? '#d97706' : '#94a3b8'} />
          </Animated.View>
          <Text style={[mcS.swapBtnText, !canSwap && { color: '#94a3b8' }]}>
            {swapLoading ? t('meals.swapping', 'Swapping…') : t('meals.swap', 'Swap')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[mcS.logBtn, logging && { opacity: 0.6 }]}
          onPress={handleLog}
          disabled={logging}
          activeOpacity={0.85}
        >
          {logging
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={mcS.logBtnText}>{t('meals.logBtn', 'Log')}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}
const createMcS = (c: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: c.surface, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: c.surfaceMuted,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  typeText: { fontSize: 12, fontWeight: '800' },
  cals: { fontSize: 15, fontWeight: '800', color: c.text },
  macroRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  macroItem: { alignItems: 'center' },
  macroVal: { fontSize: 14, fontWeight: '700' },
  macroLabel: { fontSize: 10, color: c.textMuted, fontWeight: '600' },
  suggestions: { gap: 2, marginBottom: 12 },
  suggestion: { fontSize: 12, color: c.text, lineHeight: 17 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  swapBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 10, backgroundColor: '#fef9c3',
    borderWidth: 1, borderColor: '#fde68a',
  },
  swapBtnText: { fontSize: 11, fontWeight: '700', color: '#d97706' },
  swapBtnLocked: { backgroundColor: c.surfaceMuted, borderColor: c.border },
  logBtn: {
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 10, backgroundColor: '#2563eb',
  },
  logBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MealHubScreen() {
  const { colors: themeColors } = useTheme();
  const ms = useMemo(() => createMs(themeColors), [themeColors]);
  const mcS = useMemo(() => createMcS(themeColors), [themeColors]);
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { user: clerkUser } = useUser();

  const convexUser  = useQuery(api.users.getUserByClerkId, clerkUser?.id ? { clerkId: clerkUser.id } : 'skip');
  const activePlans = useQuery(api.plans.getActivePlans, convexUser?._id ? {} : 'skip');

  const isPro       = !!convexUser?.isPremium;
  const dietKey     = (convexUser?.nutritionApproach ?? 'balanced') as DietKey;
  const dietMeta    = DIET_META[dietKey] ?? DIET_META.balanced;

  // Pro: use AI plan. Free: use hardcoded generic.
  const planData: DayTemplate[] = useMemo(() => {
    const templates = activePlans?.nutritionPlan?.mealTemplates;
    if (isPro && Array.isArray(templates) && templates.length > 0) {
      return templates.slice(0, 28);
    }
    return build30DayPlan(dietKey, i18n.language);
  }, [isPro, activePlans, dietKey]);

  // Which day plan is active (based on programStartDate)
  const startDate = (activePlans?.wellnessPlan as any)?.programStartDate;
  const daysSince = startDate
    ? Math.floor((Date.now() - startDate) / (1000 * 60 * 60 * 24))
    : 0;
  const todayDayNum = Math.min(Math.max(daysSince + 1, 1), 28);

  const [selectedDay, setSelectedDay] = useState(todayDayNum);
  const [regenLoading, setRegenLoading] = useState<string | null>(null);
  const [showSwapUpgrade, setShowSwapUpgrade] = useState(false);
  const [swapPrefsOpen, setSwapPrefsOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{ dayIndex: number; mealIndex: number; mealType: string } | null>(null);
  const [swapCraving, setSwapCraving] = useState<'none' | 'light' | 'high_protein' | 'spicy' | 'quick' | 'surprise'>('none');
  const [swapAvoid, setSwapAvoid] = useState<'none' | 'dairy' | 'gluten' | 'nuts'>('none');

  const regenerateSpecificMeal = useAction(api.plans.regenerateSpecificMeal);

  const activeDayPlan = planData[selectedDay - 1];
  const totalDayCals  = activeDayPlan?.meals.reduce((a, m) => a + m.calories, 0) ?? 0;

  // Pro plan progress
  const daysCompleted = Math.min(todayDayNum - 1, 27);
  const progressPct   = Math.round((daysCompleted / 28) * 100);

  const handleRegenMeal = async (dayIndex: number, mealIndex: number, mealType: string, preference?: string) => {
    if (!isPro || !convexUser?._id || !activePlans?.nutritionPlan?._id) return;
    const key = `${dayIndex}-${mealIndex}`;
    setRegenLoading(key);
    try {
      await regenerateSpecificMeal({
        planId: activePlans.nutritionPlan._id,
        userId: convexUser._id,
        dayIndex,
        mealIndex,
        currentMealType: mealType,
        preference,
      } as any);
    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e?.message ?? t('meals.swapError', 'Could not swap meal.'));
    } finally {
      setRegenLoading(null);
    }
  };

  const requestSwap = (dayIndex: number, mealIndex: number, mealType: string) => {
    if (!isPro) {
      setShowSwapUpgrade(true);
      return;
    }
    setSwapTarget({ dayIndex, mealIndex, mealType });
    setSwapCraving('none');
    setSwapAvoid('none');
    setSwapPrefsOpen(true);
  };

  if (!convexUser) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={ms.container} edges={['top']}>
      <ProUpgradeModal
        visible={showSwapUpgrade}
        title={t('meals.upgradeTitle', 'Upgrade to Pro')}
        message={t('meals.upgradeMsg', 'Swap meals with one tap — tailored by our AI.')}
        onClose={() => setShowSwapUpgrade(false)}
        onUpgrade={() => {
          setShowSwapUpgrade(false);
          router.push('/premium' as any);
        }}
      />

      <Modal visible={swapPrefsOpen} transparent animationType="fade" onRequestClose={() => setSwapPrefsOpen(false)}>
        <View style={ms.prefOverlay}>
          <View style={ms.prefCard}>
            <View style={ms.prefHeader}>
              <Text style={ms.prefTitle}>{t('meals.prefsTitle', 'Swap preferences')}</Text>
              <TouchableOpacity onPress={() => setSwapPrefsOpen(false)} style={ms.prefClose} activeOpacity={0.85}>
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={ms.prefSub}>{t('meals.prefsSub', "Pick a vibe — we'll swap this meal to match.")}</Text>

            <Text style={ms.prefLabel}>{t('meals.cravingLabel', 'What are you craving?')}</Text>
            <View style={ms.chipRow}>
              {[
                { k: 'none', label: t('meals.craving.none', 'No preference') },
                { k: 'light', label: t('meals.craving.light', 'Light') },
                { k: 'high_protein', label: t('meals.craving.high_protein', 'Extra protein') },
                { k: 'spicy', label: t('meals.craving.spicy', 'Spicy') },
                { k: 'quick', label: t('meals.craving.quick', 'Quick') },
                { k: 'surprise', label: t('meals.craving.surprise', 'Surprise me') },
              ].map((c: any) => (
                <TouchableOpacity
                  key={c.k}
                  onPress={() => setSwapCraving(c.k)}
                  activeOpacity={0.85}
                  style={[ms.chip, swapCraving === c.k && ms.chipActive]}
                >
                  <Text style={[ms.chipText, swapCraving === c.k && ms.chipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[ms.prefLabel, { marginTop: 12 }]}>{t('meals.avoidLabel', 'Anything to avoid?')}</Text>
            <View style={ms.chipRow}>
              {[
                { k: 'none', label: t('meals.avoid.none', 'None') },
                { k: 'dairy', label: t('meals.avoid.dairy', 'Dairy') },
                { k: 'gluten', label: t('meals.avoid.gluten', 'Gluten') },
                { k: 'nuts', label: t('meals.avoid.nuts', 'Nuts') },
              ].map((c: any) => (
                <TouchableOpacity
                  key={c.k}
                  onPress={() => setSwapAvoid(c.k)}
                  activeOpacity={0.85}
                  style={[ms.chip, swapAvoid === c.k && ms.chipActive]}
                >
                  <Text style={[ms.chipText, swapAvoid === c.k && ms.chipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={ms.prefPrimary}
              activeOpacity={0.9}
              onPress={() => {
                if (!swapTarget) return;
                setSwapPrefsOpen(false);
                const pref = `Craving: ${swapCraving}; Avoid: ${swapAvoid}`;
                handleRegenMeal(swapTarget.dayIndex, swapTarget.mealIndex, swapTarget.mealType, pref);
              }}
            >
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={ms.prefPrimaryText}>{t('meals.swapConfirmBtn', 'Swap meal')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={ms.header}>
        <TouchableOpacity onPress={() => router.back()} style={ms.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={ms.headerTitle}>{t('meals.hubTitle', 'Meal Hub')}</Text>
          <Text style={ms.headerSub}>{t('meals.hubSub', '28-day personalised nutrition')}</Text>
        </View>
        {isPro && (
          <View style={ms.proBadge}>
            <Text style={ms.proBadgeText}>PRO</Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 40 }}
      >

        {/* ── Hero ── */}
        <View>
          <LinearGradient
            colors={['#0f172a', '#1e293b']}
            style={ms.hero}
          >
            <View style={[ms.blob, { top: -30, right: -20, width: 140, height: 140, backgroundColor: `${dietMeta.color}30` }]} />
            <View style={ms.heroLeft}>
              <View style={[ms.dietBadge, { backgroundColor: dietMeta.bg }]}>
                <Ionicons name={dietMeta.icon as any} size={12} color={dietMeta.color} />
                <Text style={[ms.dietBadgeText, { color: dietMeta.color }]}>{t(dietMeta.labelKey, dietMeta.label)}</Text>
              </View>
              <Text style={ms.heroTitle}>
                {isPro ? t('meals.heroTitlePro', 'AI Personalised Plan') : t('meals.heroTitleFree', '28-Day Meal Plan')}
              </Text>
              <Text style={ms.heroSub}>
                {isPro
                  ? t('meals.heroSubPro', 'Rotates monthly · tap a meal to swap')
                  : t('meals.heroSubFree', 'Generic template · upgrade to Pro for AI personalisation')}
              </Text>
              {/* Progress bar */}
              <View style={ms.progressWrap}>
                <View style={ms.progressTrack}>
                  <View style={[ms.progressFill, { width: `${progressPct}%`, backgroundColor: dietMeta.color }]} />
                </View>
                <Text style={ms.progressText}>{t('meals.dayProgress', { current: todayDayNum, total: 28, defaultValue: `Day ${todayDayNum} of 28` })} · {progressPct}%</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ── Day Picker (sticky) ── */}
        <View style={ms.dayPickerWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={ms.dayPicker}
          >
            {Array.from({ length: 28 }, (_, i) => {
              const d = i + 1;
              const isSelected = selectedDay === d;
              const isToday    = d === todayDayNum;
              const isPast     = d < todayDayNum;
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => setSelectedDay(d)}
                  activeOpacity={0.75}
                  style={[ms.dayPill, isSelected && ms.dayPillSelected, isToday && ms.dayPillToday]}
                >
                  <Text style={[
                    ms.dayPillNum,
                    isSelected && ms.dayPillNumSelected,
                    isPast && !isSelected && { color: '#94a3b8' },
                  ]}>
                    {isPast && !isSelected ? '✓' : d}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Day Summary ── */}
        <View style={ms.daySummary}>
          <View style={ms.daySummaryLeft}>
            <Text style={ms.daySummaryTitle}>{t('meals.day', 'Day')} {selectedDay}</Text>
            <Text style={ms.daySummarySub}>{totalDayCals} kcal · {activeDayPlan?.meals.length} {t('meals.meals', 'meals')}</Text>
          </View>
          {selectedDay === todayDayNum && (
            <View style={ms.todayTag}>
              <Text style={ms.todayTagText}>{t('common.today', 'Today')}</Text>
            </View>
          )}
        </View>

        {/* ── Meal Cards ── */}
        <View style={ms.mealsSection}>
          {activeDayPlan?.meals.map((meal, mealIdx) => (
            <MealCard
              key={`${selectedDay}-${mealIdx}`}
              meal={meal}
              dayIndex={selectedDay - 1}
              mealIndex={mealIdx}
              isPro={isPro}
              userId={convexUser?._id}
              canSwap={isPro}
              swapLoading={regenLoading === `${selectedDay - 1}-${mealIdx}`}
              onSwapPress={requestSwap}
            />
          ))}
          {!activeDayPlan && (
            <View style={ms.emptyDay}>
              <Ionicons name="restaurant-outline" size={36} color="#94a3b8" />
              <Text style={ms.emptyDayText}>{t('meals.noMeals', 'No meals for this day yet.')}</Text>
            </View>
          )}
        </View>

        {/* ── Upsell (free only) ── */}
        {!isPro && (
          <View style={ms.upsellSection}>
            <TouchableOpacity
              onPress={() => router.push('/premium' as any)}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#0f172a', '#1e1b4b']}
                style={ms.upsellBanner}
              >
                <View style={[ms.blob, { top: -20, right: 0, width: 100, height: 100, backgroundColor: 'rgba(139,92,246,0.2)' }]} />
                <Ionicons name="sparkles" size={22} color="#a78bfa" style={{ marginBottom: 10 }} />
                <Text style={ms.upsellTitle}>{t('meals.upsellTitle', 'Continue Your Journey')}</Text>
                <Text style={ms.upsellSub}>
                  {t('meals.upsellSub', 'Free users get a full 28-day plan. When you finish, upgrade to Pro to continue your transformation with an AI-generated plan.')}
                </Text>
                <View style={ms.upsellCta}>
                  <Text style={ms.upsellCtaText}>{t('meals.upsellCta', 'Upgrade to Pro')} →</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const createMs = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.surfaceMuted },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: c.surfaceMuted, backgroundColor: c.surface,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: c.surfaceMuted, justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: c.text },
  headerSub:   { fontSize: 11, color: c.textMuted },
  proBadge: {
    backgroundColor: '#fef9c3', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  proBadgeText: { fontSize: 11, fontWeight: '900', color: '#d97706' },

  // Hero
  hero: { padding: 24, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999 },
  heroLeft: { gap: 8 },
  dietBadge: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 4,
  },
  dietBadgeText: { fontSize: 11, fontWeight: '800' },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff', lineHeight: 28 },
  heroSub:   { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 17 },
  progressWrap: { marginTop: 8 },
  progressTrack: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2, overflow: 'hidden', marginBottom: 5,
  },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: '600' },

  // Day picker (sticky)
  dayPickerWrap: { backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.surfaceMuted, zIndex: 10 },
  dayPicker: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  dayPill: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: c.surfaceMuted, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  dayPillSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  dayPillToday:    { borderColor: '#2563eb' },
  dayPillNum:      { fontSize: 12, fontWeight: '800', color: c.text },
  dayPillNumSelected: { color: '#fff' },

  // Day summary
  daySummary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  daySummaryLeft: {},
  daySummaryTitle: { fontSize: 18, fontWeight: '900', color: c.text },
  daySummarySub:   { fontSize: 12, color: c.textMuted, marginTop: 2 },
  todayTag: {
    backgroundColor: '#dcfce7', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  todayTagText: { fontSize: 11, fontWeight: '800', color: '#15803d' },

  mealsSection: { paddingHorizontal: 20 },
  emptyDay: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyDayText: { fontSize: 15, color: c.textMuted, fontWeight: '600' },

  // Swap preferences modal
  prefOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 18,
  },
  prefCard: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
  },
  prefHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prefTitle: { flex: 1, fontSize: 16, fontWeight: '900', color: c.text },
  prefClose: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: c.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefSub: { marginTop: 6, color: c.text, fontWeight: '700', lineHeight: 19 },
  prefLabel: { marginTop: 14, fontSize: 12, fontWeight: '900', color: c.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: c.surfaceMuted,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  chipText: { fontSize: 12, fontWeight: '800', color: c.text },
  chipTextActive: { color: '#ffffff' },
  prefPrimary: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefPrimaryText: { color: '#ffffff', fontWeight: '900', fontSize: 14 },

  // Upsell
  upsellSection: { paddingHorizontal: 20, marginTop: 8 },
  upsellBanner: {
    borderRadius: 22, padding: 22, overflow: 'hidden',
    shadowColor: '#1e1b4b', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 14, elevation: 6,
  },
  upsellTitle: { fontSize: 17, fontWeight: '900', color: '#fff', marginBottom: 8 },
  upsellSub:   { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 18, marginBottom: 16 },
  upsellCta: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(167,139,250,0.2)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  upsellCtaText: { color: '#c4b5fd', fontWeight: '800', fontSize: 13 },
});
// Static module-scope fallbacks (default theme) for helper components.
const mcS = createMcS(THEMES.default.colors);
const ms = createMs(THEMES.default.colors);
