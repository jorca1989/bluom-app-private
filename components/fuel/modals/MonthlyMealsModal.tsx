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

// Alias for now — in a real app you'd differentiate
GENERIC_WEEK['flexible'] = GENERIC_WEEK['balanced'];

/** Build a 30-day plan from the 7-day rotating pattern */
function build30DayPlan(dietKey: DietKey): DayTemplate[] {
  const weekPatterns = GENERIC_WEEK[dietKey] ?? GENERIC_WEEK['balanced'];
  return Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    meals: weekPatterns[i % weekPatterns.length],
  }));
}

// ─── Diet + goal colour themes ────────────────────────────────────────────────

const DIET_META: Record<DietKey, { label: string; color: string; bg: string; icon: string }> = {
  high_protein: { label: 'High Protein',  color: '#ef4444', bg: '#fee2e2', icon: 'barbell-outline' },
  low_carb:     { label: 'Low Carb',      color: '#d97706', bg: '#fef3c7', icon: 'leaf-outline' },
  balanced:     { label: 'Balanced',      color: '#2563eb', bg: '#dbeafe', icon: 'nutrition-outline' },
  plant_based:  { label: 'Plant-Based',   color: '#16a34a', bg: '#dcfce7', icon: 'flower-outline' },
  flexible:     { label: 'Flexible',      color: '#8b5cf6', bg: '#ede9fe', icon: 'shuffle-outline' },
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
      Alert.alert('Logged!', `${meal.mealType} added to today's fuel.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not log meal.');
    } finally {
      setLogging(false);
    }
  };

  const MEAL_ACCENT: Record<string, string> = {
    Breakfast: '#f59e0b', Lunch: '#10b981', Dinner: '#8b5cf6', Snack: '#ef4444',
  };
  const accent = MEAL_ACCENT[meal.mealType] ?? '#2563eb';

  return (
    <View style={mcS.card}>
      <View style={mcS.header}>
        <View style={[mcS.typeBadge, { backgroundColor: accent + '22' }]}>
          <Text style={[mcS.typeText, { color: accent }]}>{meal.mealType}</Text>
        </View>
        <Text style={mcS.cals}>{meal.calories} kcal</Text>
      </View>

      <View style={mcS.macroRow}>
        {[
          { label: 'P', val: meal.protein, color: '#ef4444' },
          { label: 'C', val: meal.carbs,   color: '#2563eb' },
          { label: 'F', val: meal.fat,     color: '#f59e0b' },
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
              'Swap meal',
              isPro
                ? 'Tell our AI what you’re craving, and we’ll swap this meal.'
                : 'Upgrade to Pro to swap meals.'
            );
          }}
          activeOpacity={0.85}
          disabled={swapLoading}
        >
          <Animated.View style={{ transform: [{ rotate: swapLoading ? spin : '0deg' }] }}>
            <Ionicons name="refresh" size={14} color={canSwap ? '#d97706' : '#94a3b8'} />
          </Animated.View>
          <Text style={[mcS.swapBtnText, !canSwap && { color: '#94a3b8' }]}>
            {swapLoading ? 'Swapping…' : 'Swap'}
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
            : <Text style={mcS.logBtnText}>Log</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}
const mcS = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  typeText: { fontSize: 12, fontWeight: '800' },
  cals: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  macroRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  macroItem: { alignItems: 'center' },
  macroVal: { fontSize: 14, fontWeight: '700' },
  macroLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  suggestions: { gap: 2, marginBottom: 12 },
  suggestion: { fontSize: 12, color: '#475569', lineHeight: 17 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  swapBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 10, backgroundColor: '#fef9c3',
    borderWidth: 1, borderColor: '#fde68a',
  },
  swapBtnText: { fontSize: 11, fontWeight: '700', color: '#d97706' },
  swapBtnLocked: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  logBtn: {
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 10, backgroundColor: '#2563eb',
  },
  logBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MealHubScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
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
      return templates.slice(0, 30);
    }
    return build30DayPlan(dietKey);
  }, [isPro, activePlans, dietKey]);

  // Which day plan is active (based on programStartDate)
  const startDate = (activePlans?.wellnessPlan as any)?.programStartDate;
  const daysSince = startDate
    ? Math.floor((Date.now() - startDate) / (1000 * 60 * 60 * 24))
    : 0;
  const todayDayNum = Math.min(Math.max(daysSince + 1, 1), 30);

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
  const daysCompleted = Math.min(todayDayNum - 1, 29);
  const progressPct   = Math.round((daysCompleted / 30) * 100);

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
      Alert.alert('Error', e?.message ?? 'Could not swap meal.');
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
        title="Upgrade to Pro"
        message="Swap meals with one tap — tailored by our AI."
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
              <Text style={ms.prefTitle}>Swap preferences</Text>
              <TouchableOpacity onPress={() => setSwapPrefsOpen(false)} style={ms.prefClose} activeOpacity={0.85}>
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={ms.prefSub}>Pick a vibe — we’ll swap this meal to match.</Text>

            <Text style={ms.prefLabel}>What are you craving?</Text>
            <View style={ms.chipRow}>
              {[
                { k: 'none', label: 'No preference' },
                { k: 'light', label: 'Light' },
                { k: 'high_protein', label: 'Extra protein' },
                { k: 'spicy', label: 'Spicy' },
                { k: 'quick', label: 'Quick' },
                { k: 'surprise', label: 'Surprise me' },
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

            <Text style={[ms.prefLabel, { marginTop: 12 }]}>Anything to avoid?</Text>
            <View style={ms.chipRow}>
              {[
                { k: 'none', label: 'None' },
                { k: 'dairy', label: 'Dairy' },
                { k: 'gluten', label: 'Gluten' },
                { k: 'nuts', label: 'Nuts' },
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
              <Text style={ms.prefPrimaryText}>Swap meal</Text>
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
          <Text style={ms.headerTitle}>Meal Hub</Text>
          <Text style={ms.headerSub}>30-day personalised nutrition</Text>
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
                <Text style={[ms.dietBadgeText, { color: dietMeta.color }]}>{dietMeta.label}</Text>
              </View>
              <Text style={ms.heroTitle}>
                {isPro ? 'AI-Personalised Plan' : '30-Day Meal Plan'}
              </Text>
              <Text style={ms.heroSub}>
                {isPro
                  ? 'Rotating monthly · tap any meal to swap it'
                  : 'Generic template · upgrade Pro for AI personalisation'}
              </Text>
              {/* Progress bar */}
              <View style={ms.progressWrap}>
                <View style={ms.progressTrack}>
                  <View style={[ms.progressFill, { width: `${progressPct}%`, backgroundColor: dietMeta.color }]} />
                </View>
                <Text style={ms.progressText}>Day {daysCompleted} of 30 · {progressPct}%</Text>
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
            {Array.from({ length: 30 }, (_, i) => {
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
            <Text style={ms.daySummaryTitle}>Day {selectedDay}</Text>
            <Text style={ms.daySummarySub}>{totalDayCals} kcal · {activeDayPlan?.meals.length} meals</Text>
          </View>
          {selectedDay === todayDayNum && (
            <View style={ms.todayTag}>
              <Text style={ms.todayTagText}>Today</Text>
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
              <Text style={ms.emptyDayText}>No meals for this day yet.</Text>
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
                <Text style={ms.upsellTitle}>Unlock AI Meal Personalisation</Text>
                <Text style={ms.upsellSub}>
                  Pro users get a 30-day plan built around their exact macros, diet type, and goals — refreshed every month. Swap any meal with one tap.
                </Text>
                <View style={ms.upsellCta}>
                  <Text style={ms.upsellCtaText}>Upgrade to Pro →</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const ms = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  headerSub:   { fontSize: 11, color: '#94a3b8' },
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
  dayPickerWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', zIndex: 10 },
  dayPicker: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  dayPill: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  dayPillSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  dayPillToday:    { borderColor: '#2563eb' },
  dayPillNum:      { fontSize: 12, fontWeight: '800', color: '#475569' },
  dayPillNumSelected: { color: '#fff' },

  // Day summary
  daySummary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  daySummaryLeft: {},
  daySummaryTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  daySummarySub:   { fontSize: 12, color: '#64748b', marginTop: 2 },
  todayTag: {
    backgroundColor: '#dcfce7', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  todayTagText: { fontSize: 11, fontWeight: '800', color: '#15803d' },

  mealsSection: { paddingHorizontal: 20 },
  emptyDay: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyDayText: { fontSize: 15, color: '#94a3b8', fontWeight: '600' },

  // Swap preferences modal
  prefOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 18,
  },
  prefCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  prefHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prefTitle: { flex: 1, fontSize: 16, fontWeight: '900', color: '#0f172a' },
  prefClose: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefSub: { marginTop: 6, color: '#475569', fontWeight: '700', lineHeight: 19 },
  prefLabel: { marginTop: 14, fontSize: 12, fontWeight: '900', color: '#0f172a' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  chipText: { fontSize: 12, fontWeight: '800', color: '#334155' },
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