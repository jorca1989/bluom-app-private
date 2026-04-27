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
  { id: 'first_meal_log',       title: 'Primeira Dentada',           description: 'Registe a sua primeira refeição',              icon: '🍽️', category: 'fuel', rarity: 'common',    xpReward: 50,  tokenReward: 5  },
  { id: 'log_7_days_meals',     title: 'Consistente',     description: 'Registe refeições 7 dias seguidos',            icon: '📅', category: 'fuel', rarity: 'rare',      xpReward: 150, tokenReward: 15 },
  { id: 'log_30_days_meals',    title: 'Mestre da Nutrição',     description: 'Registe refeições 30 dias seguidos',        icon: '🥗', category: 'fuel', rarity: 'epic',      xpReward: 400, tokenReward: 40 },
  { id: 'hit_protein_goal',     title: 'Golpe de Proteína',      description: 'Atinja a sua meta de proteína',              icon: '🥩', category: 'fuel', rarity: 'common',    xpReward: 75,  tokenReward: 8  },
  { id: 'hit_protein_7days',    title: 'Sequência Proteica',       description: 'Atinja a meta de proteína 7 dias seguidos',         icon: '💪', category: 'fuel', rarity: 'rare',      xpReward: 200, tokenReward: 20 },
  { id: 'water_goal_day',       title: 'Hidratado',             description: 'Atinja a sua meta de água',          icon: '💧', category: 'fuel', rarity: 'common',    xpReward: 50,  tokenReward: 5  },
  { id: 'water_goal_7days',     title: 'Fluxo de Rio',           description: 'Atinja a meta de água 7 dias seguidos',           icon: '🌊', category: 'fuel', rarity: 'rare',      xpReward: 175, tokenReward: 18 },
  { id: 'water_goal_30days',    title: 'Mente Oceânica',           description: 'Atinja a meta de água 30 dias seguidos',          icon: '🐋', category: 'fuel', rarity: 'epic',      xpReward: 450, tokenReward: 45 },
  { id: 'ai_meal_scan',         title: 'Detetive de Comida',       description: 'Analise uma refeição com a câmara IA',               icon: '📸', category: 'fuel', rarity: 'common',    xpReward: 60,  tokenReward: 6  },
  { id: 'under_calorie_goal',   title: 'Dia de Défice',          description: 'Mantenha-se na sua meta de calorias',            icon: '🎯', category: 'fuel', rarity: 'common',    xpReward: 75,  tokenReward: 8  },
  { id: 'calorie_goal_14days',  title: 'Preciso',      description: 'Cumpra a meta calórica 14 dias seguidos',        icon: '⚖️', category: 'fuel', rarity: 'epic',      xpReward: 350, tokenReward: 35 },
  { id: 'meal_plan_full_day',   title: 'Seguidor de Planos',        description: 'Registe todas as refeições do seu plano de 30 dias',      icon: '📋', category: 'fuel', rarity: 'rare',      xpReward: 200, tokenReward: 20 },
  { id: 'try_new_recipe',       title: 'Explorador de Cozinha',     description: 'Cozinhe uma receita do Bluom',                 icon: '👨‍🍳', category: 'fuel', rarity: 'common',    xpReward: 80,  tokenReward: 8  },
  { id: 'sugar_free_day',       title: 'Sem Açúcar',         description: 'Complete um dia sem açúcar',                icon: '🚫', category: 'fuel', rarity: 'common',    xpReward: 100, tokenReward: 10 },
  { id: 'sugar_free_7days',     title: 'Detox Doce',          description: 'Fique 7 dias sem açúcar',                 icon: '🏅', category: 'fuel', rarity: 'rare',      xpReward: 300, tokenReward: 30 },
  { id: 'sugar_free_30days',    title: 'Campeão Sem Açúcar', description: '30 dias seguidos sem açúcar',           icon: '🥇', category: 'fuel', rarity: 'legendary', xpReward: 800, tokenReward: 80 },

  // ── MOVE ──────────────────────────────────────────────────
  { id: 'first_workout',        title: 'Primeira Repetição',            description: 'Registe o seu primeiro treino',                   icon: '🏋️', category: 'move', rarity: 'common',    xpReward: 50,  tokenReward: 5  },
  { id: 'workout_7days',        title: 'Guerreiro da Semana',         description: 'Treine 7 dias seguidos',                 icon: '🔥', category: 'move', rarity: 'rare',      xpReward: 200, tokenReward: 20 },
  { id: 'workout_30days',       title: 'Disciplina de Ferro',      description: '30 dias seguidos a treinar',              icon: '⚡', category: 'move', rarity: 'epic',      xpReward: 500, tokenReward: 50 },
  { id: 'steps_5k',             title: '5K Passos',             description: 'Ande 5.000 passos num dia',               icon: '👟', category: 'move', rarity: 'common',    xpReward: 60,  tokenReward: 6  },
  { id: 'steps_10k',            title: 'Clube 10K',             description: 'Ande 10.000 passos num dia',              icon: '🚶', category: 'move', rarity: 'common',    xpReward: 100, tokenReward: 10 },
  { id: 'steps_10k_7days',      title: 'Sequência de Passos',          description: '10.000 passos durante 7 dias seguidos',         icon: '🏃', category: 'move', rarity: 'rare',      xpReward: 300, tokenReward: 30 },
  { id: 'steps_10k_30days',     title: 'Espírito de Maratona',      description: '10.000 passos todos os dias durante 30 dias',      icon: '🎽', category: 'move', rarity: 'epic',      xpReward: 600, tokenReward: 60 },
  { id: 'calories_burned_300',  title: 'Queimador',               description: 'Queime 300+ calorias numa única sessão',  icon: '🔥', category: 'move', rarity: 'common',    xpReward: 80,  tokenReward: 8  },
  { id: 'calories_burned_500',  title: 'Inferno',              description: 'Queime 500+ calorias numa única sessão',  icon: '🌋', category: 'move', rarity: 'rare',      xpReward: 200, tokenReward: 20 },
  { id: 'try_cardio',           title: 'Curioso por Cardio',       description: 'Registe uma sessão de cardio',                    icon: '🚴', category: 'move', rarity: 'common',    xpReward: 60,  tokenReward: 6  },
  { id: 'try_strength',         title: 'Toque de Ferro',           description: 'Registe uma sessão de força',         icon: '🏋️', category: 'move', rarity: 'common',    xpReward: 60,  tokenReward: 6  },
  { id: 'try_hiit',             title: 'Iniciado no HIIT',        description: 'Complete um treino HIIT',                 icon: '⚡', category: 'move', rarity: 'common',    xpReward: 80,  tokenReward: 8  },
  { id: 'try_yoga',             title: 'Corpo Zen',             description: 'Registe uma sessão de yoga ou flexibilidade',       icon: '🧘', category: 'move', rarity: 'common',    xpReward: 60,  tokenReward: 6  },
  { id: 'complete_4week_plan',  title: 'Plano Completo',   description: 'Termine o plano gratuito de 4 semanas',        icon: '📅', category: 'move', rarity: 'epic',      xpReward: 500, tokenReward: 50 },
  { id: 'total_10_workouts',    title: 'Dígitos Duplos',        description: 'Registe 10 treinos no total',                   icon: '🎯', category: 'move', rarity: 'common',    xpReward: 150, tokenReward: 15 },
  { id: 'total_50_workouts',    title: 'Meio Século',         description: 'Registe 50 treinos no total',                   icon: '🏆', category: 'move', rarity: 'rare',      xpReward: 400, tokenReward: 40 },
  { id: 'total_100_workouts',   title: 'Clube Centenário',         description: 'Registe 100 treinos no total',                  icon: '💯', category: 'move', rarity: 'legendary', xpReward: 1000, tokenReward: 100 },

  // ── WELLNESS ──────────────────────────────────────────────
  { id: 'first_mood_log',       title: 'Verificação de Humor',        description: 'Registe o seu humor pela primeira vez',        icon: '😊', category: 'wellness', rarity: 'common',    xpReward: 40,  tokenReward: 4  },
  { id: 'mood_log_7days',       title: 'Rastreador de Humor',         description: 'Registe o seu humor 7 dias seguidos',           icon: '📊', category: 'wellness', rarity: 'rare',      xpReward: 150, tokenReward: 15 },
  { id: 'mood_log_30days',      title: 'Inteligência Emocional',description: 'Registe o humor durante 30 dias seguidos',       icon: '🧠', category: 'wellness', rarity: 'epic',      xpReward: 400, tokenReward: 40 },
  { id: 'first_meditation',     title: 'Primeira Respiração',         description: 'Complete a sua primeira sessão de meditação',  icon: '🧘', category: 'wellness', rarity: 'common',    xpReward: 60,  tokenReward: 6  },
  { id: 'meditate_7days',       title: 'Semana Consciente',         description: 'Medite 7 dias seguidos',               icon: '🌿', category: 'wellness', rarity: 'rare',      xpReward: 200, tokenReward: 20 },
  { id: 'meditate_30days',      title: 'Modo Monge',            description: 'Sequência de meditação de 30 dias',               icon: '☯️', category: 'wellness', rarity: 'epic',      xpReward: 500, tokenReward: 50 },
  { id: 'first_sleep_log',      title: 'Rastreador de Sono',        description: 'Registe a sua qualidade de sono',                 icon: '😴', category: 'wellness', rarity: 'common',    xpReward: 40,  tokenReward: 4  },
  { id: 'sleep_8hrs',           title: 'Sono Dourado',         description: 'Registe 8+ horas de sono de qualidade',          icon: '🌙', category: 'wellness', rarity: 'common',    xpReward: 80,  tokenReward: 8  },
  { id: 'sleep_8hrs_7days',     title: 'Campeão do Sono',       description: '8+ horas de sono durante 7 dias seguidos',  icon: '⭐', category: 'wellness', rarity: 'rare',      xpReward: 250, tokenReward: 25 },
  { id: 'perfect_vitality',     title: 'Humano de Elite',           description: 'Pontue 90+ na Pontuação de Vitalidade',            icon: '⚡', category: 'wellness', rarity: 'epic',      xpReward: 350, tokenReward: 35 },
  { id: 'stress_low_week',      title: 'Comandante Calmo',       description: 'Registe baixo stress durante 7 dias seguidos',          icon: '🌊', category: 'wellness', rarity: 'rare',      xpReward: 200, tokenReward: 20 },

  // ── MIND / REFLECTIONS ────────────────────────────────────
  { id: 'first_journal',        title: 'Primeira Página',           description: 'Escreva a sua primeira entrada no diário',          icon: '📔', category: 'mind', rarity: 'common',    xpReward: 50,  tokenReward: 5  },
  { id: 'journal_7days',        title: 'Semana Reflexiva',      description: 'Escreva no diário durante 7 dias seguidos',          icon: '✍️', category: 'mind', rarity: 'rare',      xpReward: 175, tokenReward: 18 },
  { id: 'journal_30days',       title: 'Arquiteto Interior',      description: 'Escreva no diário todos os dias durante um mês',           icon: '🏛️', category: 'mind', rarity: 'epic',      xpReward: 450, tokenReward: 45 },
  { id: 'first_gratitude',      title: 'Coração Grato',       description: 'Registe a sua primeira entrada de gratidão',          icon: '🙏', category: 'mind', rarity: 'common',    xpReward: 50,  tokenReward: 5  },
  { id: 'gratitude_7days',      title: 'Sequência de Gratidão',     description: 'Pratique a gratidão 7 dias seguidos',     icon: '💛', category: 'mind', rarity: 'rare',      xpReward: 175, tokenReward: 18 },
  { id: 'gratitude_30days',     title: 'Mentalidade de Abundância',    description: 'Gratidão registada durante 30 dias seguidos',  icon: '🌟', category: 'mind', rarity: 'epic',      xpReward: 450, tokenReward: 45 },
  { id: 'ai_reflection',        title: 'Espelho Digital',       description: 'Gere a sua primeira reflexão mental com a IA',  icon: '✨', category: 'mind', rarity: 'rare',      xpReward: 150, tokenReward: 15 },
  { id: 'total_50_entries',     title: 'Escritor Prolífico',      description: 'Escreva 50 entradas de diário ou gratidão',  icon: '📚', category: 'mind', rarity: 'epic',      xpReward: 400, tokenReward: 40 },

  // ── HABITS ────────────────────────────────────────────────
  { id: 'first_habit',          title: 'Hábito Nascido',           description: 'Crie o seu primeiro hábito',                icon: '🌱', category: 'habits', rarity: 'common',    xpReward: 40,  tokenReward: 4  },
  { id: 'habit_7day_streak',    title: 'Hábito Fixo',         description: 'Mantenha um hábito durante 7 dias',         icon: '🔗', category: 'habits', rarity: 'rare',      xpReward: 175, tokenReward: 18 },
  { id: 'habit_21day_streak',   title: 'Conectado',             description: 'Sequência de 21 dias - já está enraizado',  icon: '🧬', category: 'habits', rarity: 'epic',      xpReward: 400, tokenReward: 40 },
  { id: 'habit_66day_streak',   title: 'Automático',            description: '66 dias - a ciência diz que é permanente', icon: '🤖', category: 'habits', rarity: 'legendary', xpReward: 1000, tokenReward: 100 },
  { id: 'all_habits_today',     title: 'Limpeza Total',          description: 'Complete todos os hábitos num único dia',   icon: '✅', category: 'habits', rarity: 'rare',      xpReward: 200, tokenReward: 20 },
  { id: 'break_habit_7days',    title: 'Libertação',        description: 'Passe 7 dias sem um mau hábito',          icon: '🔓', category: 'habits', rarity: 'rare',      xpReward: 200, tokenReward: 20 },
  { id: 'break_habit_30days',   title: 'Liberto',            description: '30 dias livre de um mau hábito',          icon: '🦅', category: 'habits', rarity: 'epic',      xpReward: 500, tokenReward: 50 },
  { id: 'break_habit_90days',   title: 'Nova Identidade',         description: '90 dias - o velho hábito desapareceu',        icon: '🌅', category: 'habits', rarity: 'legendary', xpReward: 1000, tokenReward: 100 },
  { id: 'habit_savings_100',    title: 'Dinheiro Poupado',          description: 'Poupe 100 ao abandonar um mau hábito',     icon: '💰', category: 'habits', rarity: 'rare',      xpReward: 250, tokenReward: 25 },

  // ── PRODUCTIVITY ──────────────────────────────────────────
  { id: 'first_task',           title: 'A Começar',      description: 'Adicione a sua primeira tarefa',         icon: '📝', category: 'productivity', rarity: 'common',    xpReward: 30,  tokenReward: 3  },
  { id: 'complete_10_tasks',    title: 'Esmagador de Tarefas',         description: 'Complete 10 tarefas',                      icon: '✅', category: 'productivity', rarity: 'common',    xpReward: 100, tokenReward: 10 },
  { id: 'complete_50_tasks',    title: 'Máquina de Execução',    description: 'Complete 50 tarefas',                      icon: '⚙️', category: 'productivity', rarity: 'rare',      xpReward: 300, tokenReward: 30 },
  { id: 'complete_100_tasks',   title: 'Operador',             description: 'Complete 100 tarefas',                     icon: '🎖️', category: 'productivity', rarity: 'epic',      xpReward: 600, tokenReward: 60 },
  { id: 'focus_first_session',  title: 'Trabalho Profundo',            description: 'Complete a sua primeira sessão de Foco', icon: '🎯', category: 'productivity', rarity: 'common',    xpReward: 60,  tokenReward: 6  },
  { id: 'focus_7_sessions',     title: 'Frequente no Flow',   description: 'Complete 7 sessões de Foco',         icon: '🌀', category: 'productivity', rarity: 'rare',      xpReward: 200, tokenReward: 20 },
  { id: 'north_star_set',       title: 'Estrela do Norte',           description: 'Defina o seu objetivo de vida de 12 meses',            icon: '🌟', category: 'productivity', rarity: 'common',    xpReward: 80,  tokenReward: 8  },
  { id: 'life_goal_achieved',   title: 'Objetivo Alcançado',        description: 'Marque um objetivo de vida como alcançado',           icon: '🏆', category: 'productivity', rarity: 'legendary', xpReward: 1000, tokenReward: 100 },
  { id: 'partner_linked',       title: 'Casal Poderoso',         description: 'Vincule-se a um parceiro para listas partilhadas',   icon: '💑', category: 'productivity', rarity: 'rare',      xpReward: 150, tokenReward: 15 },

  // ── HEALTH (Women's, Men's, Weight, Fasting) ──────────────
  { id: 'weight_logged',        title: 'Corpo Consciente',           description: 'Registe o seu peso pela primeira vez',     icon: '⚖️', category: 'health', rarity: 'common',    xpReward: 40,  tokenReward: 4  },
  { id: 'weight_goal_reached',  title: 'Meta Alcançada',      description: 'Alcance o seu peso corporal alvo',          icon: '🎯', category: 'health', rarity: 'legendary', xpReward: 1000, tokenReward: 100, secret: true },
  { id: 'weight_log_30days',    title: 'Cronista do Corpo',      description: 'Registe o peso todos os dias durante 30 dias',       icon: '📈', category: 'health', rarity: 'epic',      xpReward: 400, tokenReward: 40 },
  { id: 'first_fast',           title: 'Iniciado no Jejum',         description: 'Complete a sua primeira sessão de jejum',    icon: '⏰', category: 'health', rarity: 'common',    xpReward: 60,  tokenReward: 6  },
  { id: 'fast_16hrs',           title: '16:8 Iniciado',       description: 'Complete um jejum de 16 horas',                icon: '🌙', category: 'health', rarity: 'common',    xpReward: 100, tokenReward: 10 },
  { id: 'fast_24hrs',           title: 'Jejum de Um Dia',         description: 'Complete um jejum de 24 horas',                icon: '🔮', category: 'health', rarity: 'rare',      xpReward: 250, tokenReward: 25 },
  { id: 'fast_7streak',         title: 'Praticante de Jejum', description: '7 dias consecutivos de jejum',             icon: '⚡', category: 'health', rarity: 'epic',      xpReward: 450, tokenReward: 45 },
  { id: 'bio_log_first',        title: 'Bio Consciente',            description: 'Complete o seu primeiro Bio-Registo',   icon: '🔬', category: 'health', rarity: 'common',    xpReward: 50,  tokenReward: 5  },
  { id: 'bio_log_7days',        title: 'Scanner Corporal',         description: 'Registe marcadores biológicos 7 dias seguidos',        icon: '📡', category: 'health', rarity: 'rare',      xpReward: 175, tokenReward: 18 },
  { id: 'pelvic_first',         title: 'Iniciador de Protocolo',     description: 'Complete a sua primeira sessão de Força Pélvica', icon: '🏅', category: 'health', rarity: 'common',    xpReward: 60,  tokenReward: 6  },
  { id: 'supplements_7days',    title: 'Pilha Consistente',     description: 'Registe suplementos 7 dias seguidos',        icon: '💊', category: 'health', rarity: 'rare',      xpReward: 150, tokenReward: 15 },
  { id: 'sugar_scan_first',     title: 'Detetive de Rótulos',      description: 'Analise o rótulo de um produto com a IA',           icon: '📸', category: 'health', rarity: 'common',    xpReward: 60,  tokenReward: 6  },
  { id: 'cycle_logged',         title: 'Ciclo Consciente',          description: 'Registe os dados do seu primeiro ciclo',              icon: '🌸', category: 'health', rarity: 'common',    xpReward: 50,  tokenReward: 5  },
  { id: 'pregnancy_milestone',  title: 'Novo Capítulo',          description: 'Desbloqueie o acompanhamento da gravidez',              icon: '🤰', category: 'health', rarity: 'rare',      xpReward: 200, tokenReward: 20 },

  // ── AI ────────────────────────────────────────────────────
  { id: 'ai_first_message',     title: 'Coach Ativado',      description: 'Envie a sua primeira mensagem ao Treinador IA',    icon: '🤖', category: 'ai', rarity: 'common',    xpReward: 50,  tokenReward: 5  },
  { id: 'ai_10_messages',       title: 'Treinável',            description: 'Tenha 10 conversas com o Treinador IA',    icon: '💬', category: 'ai', rarity: 'rare',      xpReward: 175, tokenReward: 18 },
  { id: 'ai_plan_generated',    title: 'Projeto Criado',      description: 'Gere o seu primeiro plano personalizado da IA', icon: '🧬', category: 'ai', rarity: 'epic',      xpReward: 300, tokenReward: 30 },
  { id: 'ai_meal_swapped',      title: 'Arquiteto de Refeições',       description: 'Troque uma refeição usando a IA (Pro)',             icon: '🍽️', category: 'ai', rarity: 'rare',      xpReward: 150, tokenReward: 15 },
  { id: 'ai_recipe_generated',  title: 'Chef IA',              description: 'Gere uma receita com a IA',                  icon: '👨‍🍳', category: 'ai', rarity: 'rare',      xpReward: 150, tokenReward: 15 },
  { id: 'ai_insight_generated', title: 'Espelho Digital',       description: 'Desbloqueie o seu relatório mental com a IA',   icon: '🌤️', category: 'ai', rarity: 'rare',      xpReward: 150, tokenReward: 15 },

  // ── SOCIAL ────────────────────────────────────────────────
  { id: 'whatsapp_shared',      title: 'Post de Responsabilidade',  description: 'Partilhe a sua lista via WhatsApp',           icon: '📱', category: 'social', rarity: 'common',    xpReward: 40,  tokenReward: 4  },
  { id: 'partner_synced_week',  title: 'Jogador de Equipa',          description: 'Mantenha-se sincronizado com o parceiro durante uma semana', icon: '🤝', category: 'social', rarity: 'rare',      xpReward: 200, tokenReward: 20 },

  // ── MILESTONE / CROSS-FEATURE ─────────────────────────────
  { id: 'onboarding_complete',  title: 'Projeto Desbloqueado',   description: 'Complete a introdução ao Bluom',          icon: '🚀', category: 'milestone', rarity: 'common',    xpReward: 100, tokenReward: 10 },
  { id: 'pro_subscriber',       title: 'Membro Pro',           description: 'Atualize para o Bluom Pro',                   icon: '💎', category: 'milestone', rarity: 'epic',      xpReward: 300, tokenReward: 30 },
  { id: 'all_tabs_used',        title: 'Super Utilizador',       description: 'Use os separadores Nutrição, Treino, Bem-Estar e Mente',  icon: '⭐', category: 'milestone', rarity: 'rare',      xpReward: 200, tokenReward: 20 },
  { id: 'streak_30_days',       title: 'Sequência de 30 Dias',        description: 'Use o Bluom todos os dias durante 30 dias',        icon: '🔥', category: 'milestone', rarity: 'epic',      xpReward: 500, tokenReward: 50 },
  { id: 'streak_90_days',       title: 'Lenda dos 90 Dias',        description: 'Use o Bluom todos os dias durante 90 dias',        icon: '🏆', category: 'milestone', rarity: 'legendary', xpReward: 1500, tokenReward: 150 },
  { id: 'streak_365_days',      title: 'Ano Bluom',        description: 'Use o Bluom todos os dias durante um ano',  icon: '👑', category: 'milestone', rarity: 'legendary', xpReward: 5000, tokenReward: 500, secret: true },
  { id: 'xp_1000',              title: 'Em Ascensão',               description: 'Ganhe 1.000 XP',                          icon: '✨', category: 'milestone', rarity: 'common',    xpReward: 0,  tokenReward: 10 },
  { id: 'xp_5000',              title: 'Estabelecido',          description: 'Ganhe 5.000 XP',                          icon: '🌟', category: 'milestone', rarity: 'rare',      xpReward: 0,  tokenReward: 30 },
  { id: 'xp_10000',             title: 'Elite',                description: 'Ganhe 10.000 XP',                         icon: '💫', category: 'milestone', rarity: 'epic',      xpReward: 0,  tokenReward: 60 },
  { id: 'xp_50000',             title: 'Lenda',               description: 'Ganhe 50.000 XP no total',                   icon: '👑', category: 'milestone', rarity: 'legendary', xpReward: 0,  tokenReward: 200 },
  { id: 'total_5_achievements', title: 'Colecionador',            description: 'Desbloqueie 5 conquistas',                  icon: '🎖️', category: 'milestone', rarity: 'common',    xpReward: 80,  tokenReward: 8  },
  { id: 'total_20_achievements',title: 'Caixa de Troféus',          description: 'Desbloqueie 20 conquistas',                 icon: '🏅', category: 'milestone', rarity: 'rare',      xpReward: 250, tokenReward: 25 },
  { id: 'total_50_achievements',title: 'Completista',        description: 'Desbloqueie 50 conquistas',                 icon: '🌈', category: 'milestone', rarity: 'epic',      xpReward: 800, tokenReward: 80 },
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