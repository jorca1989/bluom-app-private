const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'locales');
const languages = ['pt', 'es', 'fr', 'de', 'nl', 'it', 'tr', 'ro', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'sv'];

const translations = {
  'pt': {
    'move': {
      'todaysActivities': 'Atividades de Hoje',
      'insightsTitle': 'Estatísticas do Treino',
      'detailInfo': 'Toca em qualquer exercício para ver detalhes. Utilizadores Pro podem adicionar ou remover exercícios.',
      'addExercise': 'Adicionar Exercício',
      'startDayWorkout': 'Começar Treino do Dia {{day}}',
      'widgets': { 'todayActivities': 'Atividades de Hoje', 'moveInsights': 'Estatísticas' }
    },
    'workouts': {
      'rating': 'Avaliação', 'level': 'Nível', 'equipment': 'Equipamento',
      'exerciseDetails': 'Detalhes do Exercício', 'instructions': 'Instruções',
      'primaryMuscles': 'Músculos Principais', 'secondaryMuscles': 'Músculos Secundários',
      'logExercise': 'Registar Exercício', 'sets': 'séries', 'reps': 'reps', 'min': 'min'
    },
    'common': { 'dayNum': 'Dia {{num}}', 'weekNum': 'Semana {{num}}' }
  },
  'es': {
    'move': {
      'todaysActivities': 'Actividades de Hoy', 'insightsTitle': 'Estadísticas de Entrenamiento',
      'detailInfo': 'Toca cualquier ejercicio para ver detalles. Los usuarios Pro pueden añadir o eliminar ejercicios.',
      'addExercise': 'Añadir Ejercicio', 'startDayWorkout': 'Empezar Entrenamiento Día {{day}}',
      'widgets': { 'todayActivities': 'Actividades de Hoy', 'moveInsights': 'Estadísticas' }
    },
    'workouts': {
      'rating': 'Valoración', 'level': 'Nivel', 'equipment': 'Equipo',
      'exerciseDetails': 'Detalles del Ejercicio', 'instructions': 'Instrucciones',
      'primaryMuscles': 'Músculos Principales', 'secondaryMuscles': 'Músculos Secundarios',
      'logExercise': 'Registrar Ejercicio', 'sets': 'series', 'reps': 'reps', 'min': 'min'
    },
    'common': { 'dayNum': 'Día {{num}}', 'weekNum': 'Semana {{num}}' }
  },
  'fr': {
    'move': {
      'todaysActivities': 'Activités du Jour', 'insightsTitle': 'Statistiques d\'Entraînement',
      'detailInfo': 'Touchez un exercice pour voir les détails. Les utilisateurs Pro peuvent ajouter/supprimer des exercices.',
      'addExercise': 'Ajouter un Exercice', 'startDayWorkout': 'Démarrer Jour {{day}}',
      'widgets': { 'todayActivities': 'Activités du Jour', 'moveInsights': 'Statistiques' }
    },
    'workouts': {
      'rating': 'Note', 'level': 'Niveau', 'equipment': 'Équipement',
      'exerciseDetails': 'Détails de l\'Exercice', 'instructions': 'Instructions',
      'primaryMuscles': 'Muscles Principaux', 'secondaryMuscles': 'Muscles Secondaires',
      'logExercise': 'Enregistrer l\'Exercice', 'sets': 'séries', 'reps': 'réps', 'min': 'min'
    },
    'common': { 'dayNum': 'Jour {{num}}', 'weekNum': 'Semaine {{num}}' }
  },
  'de': {
    'move': {
      'todaysActivities': 'Heutige Aktivitäten', 'insightsTitle': 'Trainingsstatistiken',
      'detailInfo': 'Tippe auf eine Übung für Details. Pro-Nutzer können Übungen hinzufügen oder entfernen.',
      'addExercise': 'Übung Hinzufügen', 'startDayWorkout': 'Tag {{day}} Starten',
      'widgets': { 'todayActivities': 'Heutige Aktivitäten', 'moveInsights': 'Statistiken' }
    },
    'workouts': {
      'rating': 'Bewertung', 'level': 'Niveau', 'equipment': 'Ausrüstung',
      'exerciseDetails': 'Übungsdetails', 'instructions': 'Anweisungen',
      'primaryMuscles': 'Hauptmuskeln', 'secondaryMuscles': 'Sekundärmuskeln',
      'logExercise': 'Übung Speichern', 'sets': 'Sätze', 'reps': 'Wdh', 'min': 'Min'
    },
    'common': { 'dayNum': 'Tag {{num}}', 'weekNum': 'Woche {{num}}' }
  },
  'nl': {
    'move': {
      'todaysActivities': 'Activiteiten van Vandaag', 'insightsTitle': 'Trainingsstatistieken',
      'detailInfo': 'Tik op een oefening voor details. Pro-gebruikers kunnen oefeningen toevoegen of verwijderen.',
      'addExercise': 'Oefening Toevoegen', 'startDayWorkout': 'Start Dag {{day}}',
      'widgets': { 'todayActivities': 'Activiteiten Vandaag', 'moveInsights': 'Statistieken' }
    },
    'workouts': {
      'rating': 'Beoordeling', 'level': 'Niveau', 'equipment': 'Uitrusting',
      'exerciseDetails': 'Oefeningsdetails', 'instructions': 'Instructies',
      'primaryMuscles': 'Primaire Spieren', 'secondaryMuscles': 'Secundaire Spieren',
      'logExercise': 'Oefening Opslaan', 'sets': 'sets', 'reps': 'herhalingen', 'min': 'min'
    },
    'common': { 'dayNum': 'Dag {{num}}', 'weekNum': 'Week {{num}}' }
  }
};

const fallback = {
  'move': {
    'todaysActivities': "Today's Activities", 'insightsTitle': "Workout Insights",
    'detailInfo': "Tap any exercise to view details. Pro users can add or remove exercises.",
    'addExercise': "Add Exercise", 'startDayWorkout': "Start Day {{day}} Workout",
    'widgets': { 'todayActivities': "Today's Activities", 'moveInsights': "Move Insights" }
  },
  'workouts': {
    'rating': 'Rating', 'level': 'Level', 'equipment': 'Equipment',
    'exerciseDetails': 'Exercise Details', 'instructions': 'Instructions',
    'primaryMuscles': 'Primary Muscles', 'secondaryMuscles': 'Secondary Muscles',
    'logExercise': 'Log Exercise', 'sets': 'sets', 'reps': 'reps', 'min': 'min'
  },
  'common': { 'dayNum': 'Day {{num}}', 'weekNum': 'Week {{num}}' }
};

const mergeDeep = (target, source) => {
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      mergeDeep(target[key], source[key]);
    } else {
      if (!target[key] || target[key] === source[key] || target[key] === '') {
        target[key] = source[key];
      }
    }
  }
};

languages.forEach(lang => {
  const file = path.join(localesDir, lang, 'translation.json');
  if (fs.existsSync(file)) {
    let data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const inject = translations[lang] || fallback;
    mergeDeep(data, inject);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log('Updated ' + lang);
  }
});
