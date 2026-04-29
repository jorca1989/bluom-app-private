/**
 * achievements-config.ts
 * ─────────────────────────────────────────────────────────────
 * Central registry of every achievement in Bluom.
 * Each achievement has:
 *  - id          unique string (also stored in DB)
 *  - title       short name
 *  - description what the user did
 *  - icon        emoji
 *  - category    which pillar/feature area
 *  - rarity      common | rare | epic | legendary
 *  - xpReward    XP granted on unlock
 *
 * Unlock logic lives in the achievement checker utility below.
 * The checker is called from relevant mutations (exercise log,
 * food log, wellness log, etc.) — wire it in as you go.
 */

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type AchievementCategory =
  | 'fuel'        // Nutrition & Food
  | 'move'        // Exercise & Steps
  | 'wellness'    // Sleep, Mood, Meditation
  | 'mind'        // Journal, Gratitude, Reflections
  | 'habits'      // Build & Break habits
  | 'productivity'// Tasks, Focus, Goals
  | 'health'      // Women's/Men's health, Weight, Fasting
  | 'social'      // Partner sync, sharing
  | 'ai'          // AI Coach, AI features
  | 'milestone';  // Cross-feature streaks and totals

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  xpReward: number;
  tokenReward: number;
  secret?: boolean; // Hidden until unlocked
}

// ─────────────────────────────────────────────────────────────
// RARITY CONFIG
// ─────────────────────────────────────────────────────────────
export const RARITY_CONFIG: Record<AchievementRarity, {
  label: string; color: string; bg: string; border: string; glow: string;
}> = {
  common:    { label: 'Common',    color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', glow: '#94a3b8' },
  rare:      { label: 'Rare',      color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', glow: '#3b82f6' },
  epic:      { label: 'Epic',      color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', glow: '#8b5cf6' },
  legendary: { label: 'Legendary', color: '#d97706', bg: '#fffbeb', border: '#fde68a', glow: '#f59e0b' },
};

export const CATEGORY_CONFIG: Record<AchievementCategory, { label: string; emoji: string; color: string; bg: string }> = {
  fuel:        { label: 'Fuel',        emoji: '🍽️',  color: '#16a34a', bg: '#f0fdf4' },
  move:        { label: 'Move',        emoji: '💪',  color: '#2563eb', bg: '#eff6ff' },
  wellness:    { label: 'Wellness',    emoji: '🧘',  color: '#8b5cf6', bg: '#f5f3ff' },
  mind:        { label: 'Mind',        emoji: '🧠',  color: '#f59e0b', bg: '#fffbeb' },
  habits:      { label: 'Habits',      emoji: '🔄',  color: '#10b981', bg: '#ecfdf5' },
  productivity:{ label: 'Productivity',emoji: '⚡',  color: '#0ea5e9', bg: '#f0f9ff' },
  health:      { label: 'Health',      emoji: '❤️',  color: '#ef4444', bg: '#fef2f2' },
  social:      { label: 'Social',      emoji: '🤝',  color: '#db2777', bg: '#fdf2f8' },
  ai:          { label: 'AI',          emoji: '✨',  color: '#6366f1', bg: '#eef2ff' },
  milestone:   { label: 'Milestone',   emoji: '🏆',  color: '#d97706', bg: '#fffbeb' },
};

// ─────────────────────────────────────────────────────────────
// ALL ACHIEVEMENTS
// ─────────────────────────────────────────────────────────────
export const ALL_ACHIEVEMENTS: AchievementDef[] = [

  // ── FUEL ──────────────────────────────────────────────────
  { id: 'first_meal_log',       title: 'First Bite', description: 'Log your first meal',              icon: '🍽️', category: 'fuel', rarity: 'common',    xpReward: 50,  tokenReward: 5  },
  { id: 'log_7_days_meals',     title: 'Consistent', description: 'Log meals 7 days in a row',            icon: '📅', category: 'fuel', rarity: 'rare',      xpReward: 150, tokenReward: 15 },
  { id: 'log_30_days_meals',    title: 'Nutrition Master', description: 'Log meals 30 days in a row',        icon: '🥗', category: 'fuel', rarity: 'epic',      xpReward: 400, tokenReward: 40 },
  { id: 'hit_protein_goal',     title: 'Protein Hit', description: 'Hit your protein goal',              icon: '🥩', category: 'fuel', rarity: 'common',    xpReward: 75,  tokenReward: 8  },
  { id: 'hit_protein_7days',    title: 'Protein Streak', description: 'Hit your protein goal 7 days in a row',         icon: '💪', category: 'fuel', rarity: 'rare',      xpReward: 200, tokenReward: 20 },
  { id: 'water_goal_day',       title: 'Hydrated', description: 'Hit your water goal',          icon: '💧', category: 'fuel', rarity: 'common',    xpReward: 50,  tokenReward: 5  },
  { id: 'water_goal_7days',     title: 'River Flow', description: 'Hit your water goal 7 days in a row',           icon: '🌊', category: 'fuel', rarity: 'rare',      xpReward: 175, tokenReward: 18 },
  { id: 'water_goal_30days',    title: 'Ocean Mind', description: 'Hit your water goal 30 days in a row',          icon: '🐋', category: 'fuel', rarity: 'epic',      xpReward: 450, tokenReward: 45 },
  { id: 'ai_meal_scan',         title: 'Food Detective', description: 'Scan a meal with the AI camera',               icon: '📸', category: 'fuel', rarity: 'common',    xpReward: 60,  tokenReward: 6  },
  { id: 'under_calorie_goal',   title: 'Deficit Day', description: 'Stay under your calorie goal',            icon: '🎯', category: 'fuel', rarity: 'common',    xpReward: 75,  tokenReward: 8  },
  { id: 'calorie_goal_14days',  title: 'Precise', description: 'Meet calorie goal 14 days in a row',        icon: '⚖️', category: 'fuel', rarity: 'epic',      xpReward: 350, tokenReward: 35 },
  { id: 'meal_plan_full_day',   title: 'Plan Follower', description: 'Log all meals from your 30-day plan',      icon: '📋', category: 'fuel', rarity: 'rare',      xpReward: 200, tokenReward: 20 },
  { id: 'try_new_recipe',       title: 'Kitchen Explorer', description: 'Cook a Bluom recipe',                 icon: '👨‍🍳', category: 'fuel', rarity: 'common',    xpReward: 80,  tokenReward: 8  },
  { id: 'sugar_free_day',       title: 'Sugar Free', description: 'Complete a sugar-free day',                icon: '🚫', category: 'fuel', rarity: 'common',    xpReward: 100, tokenReward: 10 },
  { id: 'sugar_free_7days',     title: 'Sweet Detox', description: 'Go 7 days without sugar',                 icon: '🏅', category: 'fuel', rarity: 'rare',      xpReward: 300, tokenReward: 30 },
  { id: 'sugar_free_30days',    title: 'Sugar Free Champ', description: '30 consecutive days without sugar',           icon: '🥇', category: 'fuel', rarity: 'legendary', xpReward: 800, tokenReward: 80 },

  // ── MOVE ──────────────────────────────────────────────────
  { id: 'first_workout',        title: 'First Rep', description: 'Log your first workout',                   icon: '🏋️', category: 'move', rarity: 'common',    xpReward: 50,  tokenReward: 5  },
  { id: 'workout_7days',        title: 'Week Warrior', description: 'Workout 7 days in a row',                 icon: '🔥', category: 'move', rarity: 'rare',      xpReward: 200, tokenReward: 20 },
  { id: 'workout_30days',       title: 'Iron Discipline', description: '30 days in a row working out',              icon: '⚡', category: 'move', rarity: 'epic',      xpReward: 500, tokenReward: 50 },
  { id: 'steps_5k',             title: '5K Steps', description: 'Walk 5,000 steps in a day',               icon: '👟', category: 'move', rarity: 'common',    xpReward: 60,  tokenReward: 6  },
  { id: 'steps_10k',            title: '10K Club', description: 'Walk 10,000 steps in a day',              icon: '🚶', category: 'move', rarity: 'common',    xpReward: 100, tokenReward: 10 },
  { id: 'steps_10k_7days',      title: 'Step Streak', description: '10,000 steps for 7 days in a row',         icon: '🏃', category: 'move', rarity: 'rare',      xpReward: 300, tokenReward: 30 },
  { id: 'steps_10k_30days',     title: 'Marathon Spirit', description: '10,000 steps every day for 30 days',      icon: '🎽', category: 'move', rarity: 'epic',      xpReward: 600, tokenReward: 60 },
  { id: 'calories_burned_300',  title: 'Burner', description: 'Burn 300+ calories in a single session',  icon: '🔥', category: 'move', rarity: 'common',    xpReward: 80,  tokenReward: 8  },
  { id: 'calories_burned_500',  title: 'Inferno', description: 'Burn 500+ calories in a single session',  icon: '🌋', category: 'move', rarity: 'rare',      xpReward: 200, tokenReward: 20 },
  { id: 'try_cardio',           title: 'Cardio Curious', description: 'Log a cardio session',                    icon: '🚴', category: 'move', rarity: 'common',    xpReward: 60,  tokenReward: 6  },
  { id: 'try_strength',         title: 'Iron Touch', description: 'Log a strength session',         icon: '🏋️', category: 'move', rarity: 'common',    xpReward: 60,  tokenReward: 6  },
  { id: 'try_hiit',             title: 'HIIT Initiate', description: 'Complete a HIIT workout',                 icon: '⚡', category: 'move', rarity: 'common',    xpReward: 80,  tokenReward: 8  },
  { id: 'try_yoga',             title: 'Zen Body', description: 'Log a yoga or flexibility session',       icon: '🧘', category: 'move', rarity: 'common',    xpReward: 60,  tokenReward: 6  },
  { id: 'complete_4week_plan',  title: 'Plan Completed', description: 'Finish the 4-week free plan',        icon: '📅', category: 'move', rarity: 'epic',      xpReward: 500, tokenReward: 50 },
  { id: 'total_10_workouts',    title: 'Double Digits', description: 'Log 10 workouts total',                   icon: '🎯', category: 'move', rarity: 'common',    xpReward: 150, tokenReward: 15 },
  { id: 'total_50_workouts',    title: 'Half Century', description: 'Log 50 workouts total',                   icon: '🏆', category: 'move', rarity: 'rare',      xpReward: 400, tokenReward: 40 },
  { id: 'total_100_workouts',   title: 'Century Club', description: 'Log 100 workouts total',                  icon: '💯', category: 'move', rarity: 'legendary', xpReward: 1000, tokenReward: 100 },

  // ── WELLNESS ──────────────────────────────────────────────
  { id: 'first_mood_log',       title: 'Mood Check', description: 'Log your mood for the first time',        icon: '😊', category: 'wellness', rarity: 'common',    xpReward: 40,  tokenReward: 4  },
  { id: 'mood_log_7days',       title: 'Mood Tracker', description: 'Log your mood 7 days in a row',           icon: '📊', category: 'wellness', rarity: 'rare',      xpReward: 150, tokenReward: 15 },
  { id: 'mood_log_30days',      title: 'Emotional Intelligence', description: 'Log mood for 30 consecutive days',       icon: '🧠', category: 'wellness', rarity: 'epic',      xpReward: 400, tokenReward: 40 },
  { id: 'first_meditation',     title: 'First Breath', description: 'Complete your first meditation session',  icon: '🧘', category: 'wellness', rarity: 'common',    xpReward: 60,  tokenReward: 6  },
  { id: 'meditate_7days',       title: 'Mindful Week', description: 'Meditate 7 days in a row',               icon: '🌿', category: 'wellness', rarity: 'rare',      xpReward: 200, tokenReward: 20 },
  { id: 'meditate_30days',      title: 'Monk Mode', description: '30-day meditation streak',               icon: '☯️', category: 'wellness', rarity: 'epic',      xpReward: 500, tokenReward: 50 },
  { id: 'first_sleep_log',      title: 'Sleep Tracker', description: 'Log your sleep quality',                 icon: '😴', category: 'wellness', rarity: 'common',    xpReward: 40,  tokenReward: 4  },
  { id: 'sleep_8hrs',           title: 'Golden Sleep', description: 'Log 8+ hours of quality sleep',          icon: '🌙', category: 'wellness', rarity: 'common',    xpReward: 80,  tokenReward: 8  },
  { id: 'sleep_8hrs_7days',     title: 'Sleep Champ', description: '8+ hours of sleep for 7 days in a row',  icon: '⭐', category: 'wellness', rarity: 'rare',      xpReward: 250, tokenReward: 25 },
  { id: 'perfect_vitality',     title: 'Elite Human', description: 'Score 90+ on Vitality Score',            icon: '⚡', category: 'wellness', rarity: 'epic',      xpReward: 350, tokenReward: 35 },
  { id: 'stress_low_week',      title: 'Calm Commander', description: 'Log low stress for 7 days in a row',          icon: '🌊', category: 'wellness', rarity: 'rare',      xpReward: 200, tokenReward: 20 },

  // ── MIND / REFLECTIONS ────────────────────────────────────
  { id: 'first_journal',        title: 'First Page', description: 'Write your first journal entry',          icon: '📔', category: 'mind', rarity: 'common',    xpReward: 50,  tokenReward: 5  },
  { id: 'journal_7days',        title: 'Reflective Week', description: 'Journal for 7 days in a row',          icon: '✍️', category: 'mind', rarity: 'rare',      xpReward: 175, tokenReward: 18 },
  { id: 'journal_30days',       title: 'Inner Architect', description: 'Journal every day for a month',           icon: '🏛️', category: 'mind', rarity: 'epic',      xpReward: 450, tokenReward: 45 },
  { id: 'first_gratitude',      title: 'Grateful Heart', description: 'Log your first gratitude entry',          icon: '🙏', category: 'mind', rarity: 'common',    xpReward: 50,  tokenReward: 5  },
  { id: 'gratitude_7days',      title: 'Gratitude Streak', description: 'Practice gratitude 7 days in a row',     icon: '💛', category: 'mind', rarity: 'rare',      xpReward: 175, tokenReward: 18 },
  { id: 'gratitude_30days',     title: 'Abundance Mindset', description: 'Gratitude logged for 30 consecutive days',  icon: '🌟', category: 'mind', rarity: 'epic',      xpReward: 450, tokenReward: 45 },
  { id: 'ai_reflection',        title: 'Digital Mirror', description: 'Generate your first AI mind reflection',  icon: '✨', category: 'mind', rarity: 'rare',      xpReward: 150, tokenReward: 15 },
  { id: 'total_50_entries',     title: 'Prolific Writer', description: 'Write 50 journal or gratitude entries',  icon: '📚', category: 'mind', rarity: 'epic',      xpReward: 400, tokenReward: 40 },

  // ── HABITS ────────────────────────────────────────────────
  { id: 'first_habit',          title: 'Habit Born', description: 'Create your first habit',                icon: '🌱', category: 'habits', rarity: 'common',    xpReward: 40,  tokenReward: 4  },
  { id: 'habit_7day_streak',    title: 'Habit Fixed', description: 'Maintain a habit for 7 days',         icon: '🔗', category: 'habits', rarity: 'rare',      xpReward: 175, tokenReward: 18 },
  { id: 'habit_21day_streak',   title: 'Wired In', description: '21-day streak - it\'s taking root',  icon: '🧬', category: 'habits', rarity: 'epic',      xpReward: 400, tokenReward: 40 },
  { id: 'habit_66day_streak',   title: 'Automatic', description: '66 days - science says it\'s permanent', icon: '🤖', category: 'habits', rarity: 'legendary', xpReward: 1000, tokenReward: 100 },
  { id: 'all_habits_today',     title: 'Clean Sweep', description: 'Complete all habits in a single day',   icon: '✅', category: 'habits', rarity: 'rare',      xpReward: 200, tokenReward: 20 },
  { id: 'break_habit_7days',    title: 'Break Free', description: 'Go 7 days without a bad habit',          icon: '🔓', category: 'habits', rarity: 'rare',      xpReward: 200, tokenReward: 20 },
  { id: 'break_habit_30days',   title: 'Liberated', description: '30 days free from a bad habit',          icon: '🦅', category: 'habits', rarity: 'epic',      xpReward: 500, tokenReward: 50 },
  { id: 'break_habit_90days',   title: 'New Identity', description: '90 days - the old habit is gone',        icon: '🌅', category: 'habits', rarity: 'legendary', xpReward: 1000, tokenReward: 100 },
  { id: 'habit_savings_100',    title: 'Money Saved', description: 'Save 100 by breaking a bad habit',     icon: '💰', category: 'habits', rarity: 'rare',      xpReward: 250, tokenReward: 25 },

  // ── PRODUCTIVITY ──────────────────────────────────────────
  { id: 'first_task',           title: 'Getting Started', description: 'Add your first task',         icon: '📝', category: 'productivity', rarity: 'common',    xpReward: 30,  tokenReward: 3  },
  { id: 'complete_10_tasks',    title: 'Task Smasher', description: 'Complete 10 tasks',                      icon: '✅', category: 'productivity', rarity: 'common',    xpReward: 100, tokenReward: 10 },
  { id: 'complete_50_tasks',    title: 'Execution Machine', description: 'Complete 50 tasks',                      icon: '⚙️', category: 'productivity', rarity: 'rare',      xpReward: 300, tokenReward: 30 },
  { id: 'complete_100_tasks',   title: 'Operator', description: 'Complete 100 tasks',                     icon: '🎖️', category: 'productivity', rarity: 'epic',      xpReward: 600, tokenReward: 60 },
  { id: 'focus_first_session',  title: 'Deep Work', description: 'Complete your first Focus session', icon: '🎯', category: 'productivity', rarity: 'common',    xpReward: 60,  tokenReward: 6  },
  { id: 'focus_7_sessions',     title: 'Flow Frequent', description: 'Complete 7 Focus sessions',         icon: '🌀', category: 'productivity', rarity: 'rare',      xpReward: 200, tokenReward: 20 },
  { id: 'north_star_set',       title: 'North Star', description: 'Set your 12-month life goal',            icon: '🌟', category: 'productivity', rarity: 'common',    xpReward: 80,  tokenReward: 8  },
  { id: 'life_goal_achieved',   title: 'Goal Achieved', description: 'Mark a life goal as achieved',           icon: '🏆', category: 'productivity', rarity: 'legendary', xpReward: 1000, tokenReward: 100 },
  { id: 'partner_linked',       title: 'Power Couple', description: 'Link with a partner for shared lists',   icon: '💑', category: 'productivity', rarity: 'rare',      xpReward: 150, tokenReward: 15 },

  // ── HEALTH (Women's, Men's, Weight, Fasting) ──────────────
  { id: 'weight_logged',        title: 'Body Aware', description: 'Log your weight for the first time',     icon: '⚖️', category: 'health', rarity: 'common',    xpReward: 40,  tokenReward: 4  },
  { id: 'weight_goal_reached',  title: 'Goal Reached', description: 'Reach your target body weight',          icon: '🎯', category: 'health', rarity: 'legendary', xpReward: 1000, tokenReward: 100, secret: true },
  { id: 'weight_log_30days',    title: 'Body Chronicler', description: 'Log weight every day for 30 days',       icon: '📈', category: 'health', rarity: 'epic',      xpReward: 400, tokenReward: 40 },
  { id: 'first_fast',           title: 'Fast Initiate', description: 'Complete your first fasting session',    icon: '⏰', category: 'health', rarity: 'common',    xpReward: 60,  tokenReward: 6  },
  { id: 'fast_16hrs',           title: '16:8 Initiated', description: 'Complete a 16-hour fast',                icon: '🌙', category: 'health', rarity: 'common',    xpReward: 100, tokenReward: 10 },
  { id: 'fast_24hrs',           title: 'Day Long Fast', description: 'Complete a 24-hour fast',                icon: '🔮', category: 'health', rarity: 'rare',      xpReward: 250, tokenReward: 25 },
  { id: 'fast_7streak',         title: 'Fasting Practitioner', description: '7 consecutive days of fasting',             icon: '⚡', category: 'health', rarity: 'epic',      xpReward: 450, tokenReward: 45 },
  { id: 'bio_log_first',        title: 'Bio Aware', description: 'Complete your first Bio-Log',   icon: '🔬', category: 'health', rarity: 'common',    xpReward: 50,  tokenReward: 5  },
  { id: 'bio_log_7days',        title: 'Body Scanner', description: 'Log bio-markers 7 days in a row',        icon: '📡', category: 'health', rarity: 'rare',      xpReward: 175, tokenReward: 18 },
  { id: 'pelvic_first',         title: 'Protocol Starter', description: 'Complete your first Pelvic Strength session', icon: '🏅', category: 'health', rarity: 'common',    xpReward: 60,  tokenReward: 6  },
  { id: 'supplements_7days',    title: 'Consistent Stack', description: 'Log supplements 7 days in a row',        icon: '💊', category: 'health', rarity: 'rare',      xpReward: 150, tokenReward: 15 },
  { id: 'sugar_scan_first',     title: 'Label Detective', description: 'Scan a product label with AI',           icon: '📸', category: 'health', rarity: 'common',    xpReward: 60,  tokenReward: 6  },
  { id: 'cycle_logged',         title: 'Cycle Aware', description: 'Log your first cycle data',              icon: '🌸', category: 'health', rarity: 'common',    xpReward: 50,  tokenReward: 5  },
  { id: 'pregnancy_milestone',  title: 'New Chapter', description: 'Unlock pregnancy tracking',              icon: '🤰', category: 'health', rarity: 'rare',      xpReward: 200, tokenReward: 20 },

  // ── AI ────────────────────────────────────────────────────
  { id: 'ai_first_message',     title: 'Coach Engaged', description: 'Send your first message to the AI Coach',    icon: '🤖', category: 'ai', rarity: 'common',    xpReward: 50,  tokenReward: 5  },
  { id: 'ai_10_messages',       title: 'Coachable', description: 'Have 10 conversations with the AI Coach',    icon: '💬', category: 'ai', rarity: 'rare',      xpReward: 175, tokenReward: 18 },
  { id: 'ai_plan_generated',    title: 'Blueprint Created', description: 'Generate your first custom AI plan', icon: '🧬', category: 'ai', rarity: 'epic',      xpReward: 300, tokenReward: 30 },
  { id: 'ai_meal_swapped',      title: 'Meal Architect', description: 'Swap a meal using AI (Pro)',             icon: '🍽️', category: 'ai', rarity: 'rare',      xpReward: 150, tokenReward: 15 },
  { id: 'ai_recipe_generated',  title: 'AI Chef', description: 'Generate a recipe with AI',                  icon: '👨‍🍳', category: 'ai', rarity: 'rare',      xpReward: 150, tokenReward: 15 },
  { id: 'ai_insight_generated', title: 'Digital Mirror', description: 'Unlock your AI mind report',   icon: '🌤️', category: 'ai', rarity: 'rare',      xpReward: 150, tokenReward: 15 },

  // ── SOCIAL ────────────────────────────────────────────────
  { id: 'whatsapp_shared',      title: 'Accountability Post', description: 'Share your list via WhatsApp',           icon: '📱', category: 'social', rarity: 'common',    xpReward: 40,  tokenReward: 4  },
  { id: 'partner_synced_week',  title: 'Team Player', description: 'Stay synced with partner for a week', icon: '🤝', category: 'social', rarity: 'rare',      xpReward: 200, tokenReward: 20 },

  // ── MILESTONE / CROSS-FEATURE ─────────────────────────────
  { id: 'onboarding_complete',  title: 'Blueprint Unlocked', description: 'Complete the Bluom onboarding',          icon: '🚀', category: 'milestone', rarity: 'common',    xpReward: 100, tokenReward: 10 },
  { id: 'pro_subscriber',       title: 'Pro Member', description: 'Upgrade to Bluom Pro',                   icon: '💎', category: 'milestone', rarity: 'epic',      xpReward: 300, tokenReward: 30 },
  { id: 'all_tabs_used',        title: 'Power User', description: 'Use Nutrition, Workout, Wellness, and Mind tabs',  icon: '⭐', category: 'milestone', rarity: 'rare',      xpReward: 200, tokenReward: 20 },
  { id: 'streak_30_days',       title: '30-Day Streak', description: 'Use Bluom every day for 30 days',        icon: '🔥', category: 'milestone', rarity: 'epic',      xpReward: 500, tokenReward: 50 },
  { id: 'streak_90_days',       title: '90-Day Legend', description: 'Use Bluom every day for 90 days',        icon: '🏆', category: 'milestone', rarity: 'legendary', xpReward: 1500, tokenReward: 150 },
  { id: 'streak_365_days',      title: 'Bluom Year', description: 'Use Bluom every day for a year',  icon: '👑', category: 'milestone', rarity: 'legendary', xpReward: 5000, tokenReward: 500, secret: true },
  { id: 'xp_1000',              title: 'Rising Up', description: 'Earn 1,000 XP',                          icon: '✨', category: 'milestone', rarity: 'common',    xpReward: 0,  tokenReward: 10 },
  { id: 'xp_5000',              title: 'Established', description: 'Earn 5,000 XP',                          icon: '🌟', category: 'milestone', rarity: 'rare',      xpReward: 0,  tokenReward: 30 },
  { id: 'xp_10000',             title: 'Elite', description: 'Earn 10,000 XP',                         icon: '💫', category: 'milestone', rarity: 'epic',      xpReward: 0,  tokenReward: 60 },
  { id: 'xp_50000',             title: 'Legend', description: 'Earn 50,000 XP total',                   icon: '👑', category: 'milestone', rarity: 'legendary', xpReward: 0,  tokenReward: 200 },
  { id: 'total_5_achievements', title: 'Collector', description: 'Unlock 5 achievements',                  icon: '🎖️', category: 'milestone', rarity: 'common',    xpReward: 80,  tokenReward: 8  },
  { id: 'total_20_achievements',title: 'Trophy Case', description: 'Unlock 20 achievements',                 icon: '🏅', category: 'milestone', rarity: 'rare',      xpReward: 250, tokenReward: 25 },
  { id: 'total_50_achievements',title: 'Completionist', description: 'Unlock 50 achievements',                 icon: '🌈', category: 'milestone', rarity: 'epic',      xpReward: 800, tokenReward: 80 },
];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
export function getAchievementById(id: string): AchievementDef | undefined {
  return ALL_ACHIEVEMENTS.find(a => a.id === id);
}

export function getAchievementsByCategory(category: AchievementCategory): AchievementDef[] {
  return ALL_ACHIEVEMENTS.filter(a => a.category === category);
}

export function getTotalPossibleXP(): number {
  return ALL_ACHIEVEMENTS.reduce((sum, a) => sum + a.xpReward, 0);
}