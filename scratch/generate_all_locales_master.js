const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../locales');
const ptEsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'translations_data_pt_es.json'), 'utf8'));

// 1. GERMAN (de)
const de = {
  integrations: {
    title: "Verbindungen",
    subtitle: "Synchronisiere Daten von deinen Geräten & Apps",
    privacyNotice: "Bluom liest nur die unten aufgeführten Datentypen. Wir verkaufen deine Gesundheitsdaten niemals. Du kannst die Verbindung jederzeit trennen und in Einstellungen → Konto die vollständige Löschung anfordern.",
    healthLog: "Gesundheitsprotokoll",
    healthLogSub: "Heute importierte Messwerte anzeigen",
    sourcesConnected: "{{count}} Quelle verbunden",
    sourcesConnectedPlural: "{{count}} Quellen verbunden",
    recentImportedData: "Kürzlich importierte Daten",
    deletionNotice: "Wenn du dein Bluom-Konto löschst, werden alle synchronisierten Gesundheitsdaten auf unseren Servern innerhalb von 30 Tagen endgültig gelöscht. Lokale Gerätedaten bleiben unberührt.",
    categories: {
      activity: "Aktivität & Fitness",
      biometrics: "Körperdaten",
      nutrition: "Ernährung",
      sleep: "Schlaf & Erholung"
    },
    card: {
      comingSoon: "Demnächst",
      neverSynced: "Nie synchronisiert",
      justNow: "Gerade eben",
      minsAgo: "vor {{mins}} Min.",
      hoursAgo: "vor {{hours}} Std.",
      daysAgo: "vor {{days}} Tagen",
      lastSync: "Letzte Synchronisierung: {{time}}",
      hideDetails: "Details ausblenden",
      readingDataTypes: "{{count}} Datentypen werden gelesen",
      dataWeAccess: "ZUGRIFF AUF DATEN",
      howWeUseIt: "VERWENDUNG",
      syncNow: "Jetzt synchronisieren"
    },
    alerts: {
      disconnectTitle: "{{name}} trennen",
      disconnectHealthMsg: "Wir lesen keine weiteren Gesundheitsdaten ein. Deine bisherigen synchronisierten Daten bleiben erhalten.",
      healthConnFailed: "Gesundheitsverbindung fehlgeschlagen",
      healthKitFailedIos: "Bluom konnte HealthKit nicht initialisieren. Bitte überprüfe die Berechtigungen in den iOS-Einstellungen.",
      healthConnectFailedAndroid: "Bitte erteile Health Connect die Berechtigungen zur Synchronisierung.",
      disconnectStravaTitle: "Strava trennen",
      disconnectStravaMsg: "Wir importieren keine Strava-Aktivitäten mehr. Deine bestehenden Einträge bleiben erhalten.",
      disconnectedTitle: "Getrennt",
      stravaDisconnectedMsg: "Strava wurde getrennt.",
      syncComplete: "Synchronisierung abgeschlossen",
      syncCompleteDetails: "Schritte: {{steps}}\nKalorien: {{calories}} kcal\nDistanz: {{distance}} km",
      stravaSynced: "Strava synchronisiert",
      stravaSyncedDetails: "{{count}} neue Aktivitäten importiert.",
      syncFailed: "Synchronisierung fehlgeschlagen",
      stravaSyncFailedDetails: "Strava-Aktivitäten konnten nicht synchronisiert werden."
    },
    items: {
      apple_health: {
        name: "Apple Health",
        subtitle: "Schritte, Workouts, Schlaf & mehr",
        dataPoints: ["Schritte & Gehstrecke", "Aktive Kalorien", "Trainingseinheiten", "Körpergewicht", "Schlafdauer", "Herzfrequenz"],
        purpose: "Deine Schritte und aktiven Kalorien aktualisieren dein tägliches Ziel. Gewicht wird mit dem Fortschrittstracker synchronisiert. Herzfrequenz und Schlaf berechnen deine Vitalitätswerte."
      },
      google_health: {
        name: "Health Connect",
        subtitle: "Schritte, Workouts, Schlaf & mehr",
        dataPoints: ["Schritte & Gehstrecke", "Aktive Kalorien", "Trainingseinheiten", "Körpergewicht", "Schlafeinheiten", "Herzfrequenz"],
        purpose: "Deine Schritte und aktiven Kalorien aktualisieren dein tägliches Ziel. Gewicht wird mit dem Fortschrittstracker synchronisiert. Herzfrequenz und Schlaf berechnen deinen Vitalitätsscore."
      },
      strava: {
        name: "Strava",
        subtitle: "Laufen, Radfahren & Outdoor-Sport",
        dataPoints: ["Aktivitätstyp & Name", "Dauer & Distanz", "Verbrannte Kalorien", "Durchschnittliche Herzfrequenz"],
        purpose: "Strava-Aktivitäten werden automatisch als Trainings importiert, damit dein Kalorienverbrauch und Trainingsverlauf ohne manuelles Eintragen exakt bleiben."
      },
      withings: {
        name: "Withings",
        subtitle: "Smarte Waagen & Gesundheitsmonitore",
        dataPoints: ["Körpergewicht", "Körperfettanteil %", "Muskelmasse"],
        purpose: "Körperzusammensetzungsdaten verbessern die Genauigkeit deiner Kalorienziele und visualisieren deine Entwicklung."
      },
      samsung_health: {
        name: "Samsung Health",
        subtitle: "Galaxy Watch & Galaxy Ring",
        dataPoints: ["Schritte", "Herzfrequenz", "Schlafphasen", "Körperzusammensetzung"],
        purpose: "Samsung Health-Daten füllen dein tägliches Aktivitätsprotokoll und optimieren deine Schlaf- und Erholungsscores."
      },
      oura: {
        name: "Oura Ring",
        subtitle: "Fortschrittliche Schlaf- & Bereitschaftswerte",
        dataPoints: ["Schlafdauer & -phasen", "Bereitschaftsscore", "Herzfrequenzvariabilität", "Körpertemperaturtrend"],
        purpose: "Oura-Schlafdaten treiben deinen nächtlichen Wellness-Score an und informieren Erholungsempfehlungen in deinem Move-Plan."
      },
      myfitnesspal: {
        name: "MyFitnessPal",
        subtitle: "Ernährungstagebuch & Nährwerte",
        dataPoints: ["Täglich konsumierte Kalorien", "Makros (Protein, Kohlenhydrate, Fett)", "Wasseraufnahme"],
        purpose: "Der Import deines MFP-Tagebuchs verhindert doppelte Einträge und hält deine Nährwertsummen stets präzise."
      }
    }
  },
  womensHealth: {
    postpartum: {
      babyIsHere: "Baby ist da!",
      postpartumRecovery: "Rückbildung & Erholung",
      transitionTitle: "Willkommen zur Rückbildung",
      deliveryDate: "Geburtsdatum",
      deliveryType: "Geburtsart",
      vaginal: "Vaginal",
      cSection: "Kaiserschnitt",
      isBreastfeeding: "Stillen?",
      saveTransition: "Rückbildung starten",
      ppWeek: "Woche {{week}} nach der Geburt",
      newborn: "Neugeborenen-Tracker",
      feed: "Fütterung",
      diaper: "Windel",
      sleep: "Babyschlaf",
      lochia: "Wochenfluss",
      pain: "Wund- / Beckenschmerz",
      pelvicFloor: "Beckenboden & Rumpf",
      startPelvic: "Beckenboden- & Rumpf-Protokoll",
      ppMood: "Stimmung nach der Geburt",
      anxious: "Besorgt",
      overwhelmed: "Überfordert",
      numb: "Abgestumpft",
      happy: "Verbunden & Glücklich",
      heavy: "Stark",
      light: "Leicht",
      none: "Keine"
    },
    ppPain: "Wund- / Beckenschmerz (1-10)",
    ppMood: "Stimmung nach der Geburt",
    ppLochia: "Wochenfluss",
    ppc1: "Wundheilung, Heben einschränken",
    ppv1: "Beckenbodenschwellung, Wochenfluss",
    ppc2: "Sanfte Rumpfaktivierung, Heben einschränken",
    ppv2: "Beckenboden gewinnt Tonus zurück",
    startPelvic: "Beckenboden- & Rumpf-Protokoll",
    cSecRec1: "Wundheilung, Heben einschränken, Wochenfluss beachten.",
    vagRec1: "Beckenbodenschwellung, Ruhe und Wochenfluss beachten.",
    babyHereBtn: "Baby ist da!",
    pelvicTitle: "Beckenboden-Kraftprotokoll",
    pelvicSub: "Stärkt den Beckenboden, lindert Krämpfe und stützt den Rumpf",
    pelvicInstructions: "5s anspannen → 5s entspannen → wiederholen. 10 Zyklen pro Einheit.",
    stopSession: "Einheit beenden",
    startTimer: "Timer starten"
  },
  mensHealth: {
    vitalityCheckin: "Vitalitäts-Check",
    vitalitySub: "Bewerte jede Säule ehrlich. Dein T-Opt-Score aktualisiert sich in Echtzeit.",
    tOptScore: "T-OPT-SCORE",
    drivePillar: "Antrieb / Libido",
    recoveryPillar: "Erholungsstatus",
    focusPillar: "Mentaler Fokus",
    sleepPillar: "Schlafqualität",
    moodSynced: "Stimmung aus Wellness synchronisiert",
    updateStatus: "Systemstatus aktualisieren",
    pelvicTitle: "Beckenboden-Kraftprotokoll",
    pelvicSub: "Verbessert Erektionsfunktion, Blasenkontrolle, sexuelle Leistungsfähigkeit und Rumpfstabilität.",
    pelvicInstructions: "5s anspannen → 5s entspannen → wiederholen. 10–15 Zyklen. Tägliche Praxis zeigt Ergebnisse in 4–6 Wochen.",
    pelvicActionSub: "Rumpf, Erektions- & Blasenfunktion",
    startProtocol: "Protokoll starten",
    finishLog: "Beenden & Speichern"
  },
  move: {
    insightsTitle: "Trainings-Einblicke",
    weeklyProgress: "Wöchentlicher Fortschritt",
    sessions: "Einheiten",
    totalTime: "Gesamtzeit",
    calories: "Kalorien",
    thisWeekVsLastWeek: "Diese Woche vs. Letzte Woche",
    calorieBurnTrend: "Kalorienverbrauch-Trend",
    thisWeekTotal: "Gesamt diese Woche",
    vsLastWeek: "{{val}}% vs. letzte Woche",
    consistencyStreak: "Beständigkeits-Serie",
    daysCount: "{{count}} Tage",
    onFire: "🔥 Unglaublich!",
    keepGoing: "Weiter so!",
    avgSessionLength: "Durchschnittl. Trainingsdauer",
    workoutMix: "Trainings-Mix",
    mostActiveDay: "Aktivster Tag",
    sessions_count: "{{count}} Einheiten",
    noWorkoutDataYet: "Noch keine Trainingsdaten",
    logToUnlockTrends: "Protokolliere Einheiten für Trends.",
    unlockProAnalysis: "Pro-Analyse freischalten",
    unlockProDesc: "Erhalte Trends, Volumen-Tracking und Bestleistungen.",
    upgradeToPro: "Auf Pro upgraden",
    upNext: "Als Nächstes",
    startWorkout: "Training starten",
    viewWorkout: "Training ansehen",
    exercisesCount: "{{count}} Übungen",
    startDayWorkout: "Training Tag {{day}} starten",
    dayPreview: "Vorschau Tag {{day}}",
    weekOverview: "Wochenübersicht",
    detailInfo: "Tippe auf eine Übung für Details. Pro-Nutzer können Übungen anpassen.",
    exerciseVolume: "Übungsvolumen",
    nextExercise: "Nächste Übung",
    addExercise: "Übung hinzufügen",
    addSet: "+ Satz hinzufügen",
    restTimer: "Pausen-Timer",
    iAmReady: "Ich bin bereit",
    turnOff: "Ausschalten",
    setShort: "SATZ",
    previousShort: "VORHER",
    kgShort: "KG",
    repsShort: "WDH",
    finish: "Abschließen",
    duration: "Dauer",
    volume: "Volumen",
    sets: "Sätze",
    syncedFromHealth: "Aus Health synchronisiert",
    freePlanComplete: "Basisplan abgeschlossen — upgrade für Fortsetzung",
    continueJourney: "Setze deine Transformation fort",
    freeUsers28DaysFull: "Der kostenlose Plan umfasst 28 Tage. Upgrade auf Pro für adaptive Trainingspläne in jedem Zyklus.",
    your4WeekProgram: "Dein 4-Wochen-Programm",
    weekProgress: "Woche {{currentWeek}} von {{totalWeeks}}",
    daysPerWeekText: "{{days}} Tage/Woche",
    routeLoaded: "Route geladen",
    waypointsLoaded: "{{count}} Wegpunkte.",
    gpxRoutes: "GPX-Routen",
    gpxRoutesDesc: "GPX-Dateiupload in Kürze.\nDu kannst Wikiloc-.gpx-Dateien hochladen, um Referenzpfade einzublenden.",
    log: "Eintragen"
  },
  modals: {
    logRecipe: {
      titleRecipe: "Rezept hinzufügen",
      titleFood: "Lebensmittel hinzufügen",
      logged: "Eingetragen!",
      addedTo: "Hinzugefügt zu",
      logToMeal: "Zu Mahlzeit eintragen",
      qty: "Menge",
      skip: "Überspringen",
      logTo: "Eintragen in"
    },
    search: {
      addFood: "Lebensmittel hinzufügen",
      addRecipe: "Rezept hinzufügen"
    },
    addFood: {
      nextReview: "Weiter: Überprüfen",
      reviewSave: "Überprüfen & Speichern",
      by: "von",
      saving: "Speichern...",
      saveFood: "Lebensmittel speichern"
    }
  },
  foodReview: {
    saveToMyFoods: "In Meine Lebensmittel speichern",
    saveAsRecipe: "Als Rezept speichern",
    savedToMyFoodsSuccess: "In Meine Lebensmittel gespeichert!",
    savedAsRecipeSuccess: "Als Rezept gespeichert!",
    addToDiary: "Zum Tagebuch hinzufügen"
  },
  fuel: {
    detailedInsights: {
      title: "Detaillierte Nährwerte",
      calories: "Kalorien",
      protein: "Gesamtprotein",
      carbs: "Gesamtkohlenhydrate",
      fiber: "Ballaststoffe",
      sugar: "Gesamtzucker",
      fat: "Gesamtfett",
      saturatedFat: "Gesättigte Fettsäuren",
      polyunsaturatedFat: "Mehrfach ungesättigte Fettsäuren",
      monounsaturatedFat: "Einfach ungesättigte Fettsäuren",
      transFat: "Transfette"
    },
    quickActions: {
      nutritionInsights: "Ernährungsanalyse",
      nutritionInsightsDesc: "Detaillierte Makro-Aufschlüsselung"
    }
  },
  common: {
    servings: "Portionen",
    protein: "Protein",
    carbs: "Kohlenhydrate",
    fat: "Fett",
    kcal: "kcal",
    proteinShort: "P",
    carbsShort: "K",
    fatShort: "F",
    openSettings: "Einstellungen öffnen",
    checkSettings: "Einstellungen prüfen",
    configError: "Konfigurationsfehler",
    disconnect: "Trennen",
    start: "Start",
    yes: "Ja",
    resume: "Fortsetzen",
    pause: "Pause",
    close: "Schließen",
    cancel: "Abbrechen",
    beginner: "Anfänger",
    intermediate: "Fortgeschritten",
    advanced: "Erfahren",
    veteran: "Experte",
    dayNum: "Tag {{num}}",
    today: "Heute",
    units: { kg: "kg" }
  },
  disclaimer: {
    medical: "Bluom bietet ausschließlich allgemeine Wellness-Informationen. Wende dich bei medizinischen Fragen stets an qualifiziertes medizinisches Fachpersonal."
  },
  sleeper: {
    sleepingStatus: "Modul pausiert",
    activateBtn: "Dieses Modul aktivieren"
  }
};

// 2. FRENCH (fr)
const fr = {
  integrations: {
    title: "Connexions",
    subtitle: "Synchronisez les données de vos appareils et applications",
    privacyNotice: "Bluom ne lit que les types de données listés ci-dessous. Nous ne vendons jamais vos données de santé. Vous pouvez vous déconnecter à tout moment et demander leur suppression totale dans Paramètres → Compte.",
    healthLog: "Journal de Santé",
    healthLogSub: "Voir les métriques importées aujourd'hui",
    sourcesConnected: "{{count}} source connectée",
    sourcesConnectedPlural: "{{count}} sources connectées",
    recentImportedData: "Données importées récentes",
    deletionNotice: "Si vous supprimez votre compte Bluom, toutes les données de santé synchronisées stockées sur nos serveurs sont définitivement supprimées sous 30 jours. Les données locales d'Apple Health ou Google Health Connect restent intactes.",
    categories: {
      activity: "Activité et Fitness",
      biometrics: "Mesures Corporelles",
      nutrition: "Nutrition",
      sleep: "Sommeil et Récupération"
    },
    card: {
      comingSoon: "Bientôt disponible",
      neverSynced: "Jamais synchronisé",
      justNow: "À l'instant",
      minsAgo: "il y a {{mins}}m",
      hoursAgo: "il y a {{hours}}h",
      daysAgo: "il y a {{days}}j",
      lastSync: "Dernière synchronisation : {{time}}",
      hideDetails: "Masquer les détails",
      readingDataTypes: "Lecture de {{count}} types de données",
      dataWeAccess: "DONNÉES ACCÉDÉES",
      howWeUseIt: "NOTRE UTILISATION",
      syncNow: "Synchroniser maintenant"
    },
    alerts: {
      disconnectTitle: "Déconnecter {{name}}",
      disconnectHealthMsg: "Nous cesserons de lire les données de santé. Votre historique restera conservé.",
      healthConnFailed: "Échec de connexion Santé",
      healthKitFailedIos: "Bluom n'a pas pu initialiser HealthKit. Vérifiez vos autorisations dans les Réglages iOS.",
      healthConnectFailedAndroid: "Veuillez accorder les autorisations dans Health Connect pour synchroniser vos données.",
      disconnectStravaTitle: "Déconnecter Strava",
      disconnectStravaMsg: "Nous n'importerons plus les activités Strava. Vos enregistrements existants seront conservés.",
      disconnectedTitle: "Déconnecté",
      stravaDisconnectedMsg: "Strava a été déconnecté.",
      syncComplete: "Synchronisation terminée",
      syncCompleteDetails: "Pas : {{steps}}\nCalories : {{calories}} kcal\nDistance : {{distance}} km",
      stravaSynced: "Strava synchronisé",
      stravaSyncedDetails: "{{count}} nouvelles activités importées.",
      syncFailed: "Échec de synchronisation",
      stravaSyncFailedDetails: "Impossible de synchroniser les activités Strava."
    },
    items: {
      apple_health: {
        name: "Apple Health",
        subtitle: "Pas, entraînements, sommeil et plus",
        dataPoints: ["Pas et distance parcourue", "Calories actives brûlées", "Séances d'entraînement", "Poids corporel", "Durée du sommeil", "Fréquence cardiaque"],
        purpose: "Vos pas et calories actives mettent à jour votre objectif quotidien. Le poids se synchronise avec le suivi de progression. La fréquence cardiaque et le sommeil calculent vos scores de Vitalité."
      },
      google_health: {
        name: "Health Connect",
        subtitle: "Pas, entraînements, sommeil et plus",
        dataPoints: ["Pas et distance parcourue", "Calories actives brûlées", "Séances d'entraînement", "Poids corporel", "Sessions de sommeil", "Fréquence cardiaque"],
        purpose: "Vos pas et calories actives mettent à jour votre objectif quotidien. Le poids se synchronise avec le suivi de progression. Le rythme cardiaque et le sommeil calculent votre score de Vitalité."
      },
      strava: {
        name: "Strava",
        subtitle: "Course, cyclisme et sports de plein air",
        dataPoints: ["Type et nom d'activité", "Durée et distance", "Calories brûlées", "Fréquence cardiaque moyenne"],
        purpose: "Les activités Strava sont automatiquement importées comme entraînements afin de tenir à jour vos dépenses caloriques sans saisie manuelle."
      },
      withings: {
        name: "Withings",
        subtitle: "Balances intelligentes et moniteurs",
        dataPoints: ["Poids corporel", "% Masse grasse", "Masse musculaire"],
        purpose: "La composition corporelle affine vos cibles caloriques et affiche votre évolution au fil du temps."
      },
      samsung_health: {
        name: "Samsung Health",
        subtitle: "Galaxy Watch et Galaxy Ring",
        dataPoints: ["Pas", "Fréquence cardiaque", "Phases de sommeil", "Composition corporelle"],
        purpose: "Les données Samsung Health enrichissent votre journal d'activité quotidien et vos scores de récupération."
      },
      oura: {
        name: "Oura Ring",
        subtitle: "Scores avancés de sommeil et préparation",
        dataPoints: ["Durée et phases de sommeil", "Score de préparation", "Variabilité de fréquence cardiaque", "Tendance de température"],
        purpose: "Les données Oura alimentent votre score de Bien-être nocturne et personnalisent vos conseils de récupération."
      },
      myfitnesspal: {
        name: "MyFitnessPal",
        subtitle: "Journal alimentaire et nutrition",
        dataPoints: ["Calories quotidiennes consommées", "Macros (protéines, glucides, lipides)", "Consommation d'eau"],
        purpose: "L'import de votre journal MFP évite les doubles saisies et maintient vos totaux de Nutrition toujours exacts."
      }
    }
  },
  womensHealth: {
    postpartum: {
      babyIsHere: "Le bébé est là !",
      postpartumRecovery: "Récupération Post-Partum",
      transitionTitle: "Bienvenue dans le Post-Partum",
      deliveryDate: "Date d'accouchement",
      deliveryType: "Type d'accouchement",
      vaginal: "Vaginal",
      cSection: "Césarienne",
      isBreastfeeding: "Allaitement ?",
      saveTransition: "Démarrer le post-partum",
      ppWeek: "Semaine {{week}} Post-Partum",
      newborn: "Suivi du Nouveau-Né",
      feed: "Repas",
      diaper: "Couche",
      sleep: "Sommeil bébé",
      lochia: "Lochies / Saignement",
      pain: "Douleur incision / pelvienne",
      pelvicFloor: "Plancher pelvien & sangle",
      startPelvic: "Protocole pelvien & core",
      ppMood: "Humeur post-partum",
      anxious: "Anxieuse",
      overwhelmed: "Submergée",
      numb: "Insensible",
      happy: "Complice & Heureuse",
      heavy: "Abondant",
      light: "Léger",
      none: "Aucun"
    },
    ppPain: "Douleur incision / pelvienne (1-10)",
    ppMood: "Humeur post-partum",
    ppLochia: "Lochies / Saignement",
    ppc1: "Cicatrisation de l'incision, limiter le port de charges",
    ppv1: "Gonflement pelvien, lochies",
    ppc2: "Sangle abdominale en récupération douce, limiter l'effort",
    ppv2: "Le plancher pelvien retrouve son tonus",
    startPelvic: "Protocole pelvien & core",
    cSecRec1: "Cicatrisation de l'incision, repos et gestion des lochies.",
    vagRec1: "Gonflement pelvien, repos et gestion des lochies.",
    babyHereBtn: "Le bébé est là !",
    pelvicTitle: "Protocole de Puissance Pelvienne",
    pelvicSub: "Renforce le plancher pelvien, soulage les crampes et soutient la sangle abdominale",
    pelvicInstructions: "Contracter 5s → Relâcher 5s → Répéter. 10 cycles par séance.",
    stopSession: "Arrêter la séance",
    startTimer: "Démarrer le timer"
  },
  mensHealth: {
    vitalityCheckin: "Bilan de Vitalité",
    vitalitySub: "Évaluez chaque pilier honnêtement. Votre score T-Opt s'actualise en temps réel.",
    tOptScore: "SCORE T-OPT",
    drivePillar: "Énergie / Libido",
    recoveryPillar: "État de Récupération",
    focusPillar: "Focus Mental",
    sleepPillar: "Qualité du Sommeil",
    moodSynced: "Humeur synchronisée depuis Bien-être",
    updateStatus: "Mettre à jour l'état du système",
    pelvicTitle: "Protocole de Puissance Pelvienne",
    pelvicSub: "Améliore la fonction érectile, le contrôle urinaire, les performances sexuelles et la stabilité du core.",
    pelvicInstructions: "Contracter 5s → Relâcher 5s → Répéter. 10–15 cycles. Une pratique quotidienne donne des résultats en 4–6 semaines.",
    pelvicActionSub: "Core, fonction érectile & urinaire",
    startProtocol: "Démarrer le protocole",
    finishLog: "Terminer et enregistrer"
  },
  move: {
    insightsTitle: "Aperçu de l'entraînement",
    weeklyProgress: "Progrès hebdomadaire",
    sessions: "Séances",
    totalTime: "Temps total",
    calories: "Calories",
    thisWeekVsLastWeek: "Cette semaine vs semaine dernière",
    calorieBurnTrend: "Tendance de dépense calorique",
    thisWeekTotal: "Total cette semaine",
    vsLastWeek: "{{val}}% vs semaine dernière",
    consistencyStreak: "Série de régularité",
    daysCount: "{{count}} jours",
    onFire: "🔥 En feu !",
    keepGoing: "Continuez !",
    avgSessionLength: "Durée moyenne de séance",
    workoutMix: "Mix d'entraînement",
    mostActiveDay: "Jour le plus actif",
    sessions_count: "{{count}} séances",
    noWorkoutDataYet: "Aucune donnée d'entraînement",
    logToUnlockTrends: "Enregistrez des séances pour voir les tendances.",
    unlockProAnalysis: "Débloquer l'analyse Pro",
    unlockProDesc: "Obtenez les tendances, le suivi du volume et vos records personnels.",
    upgradeToPro: "Passer à Pro",
    upNext: "À suivre",
    startWorkout: "Commencer l'entraînement",
    viewWorkout: "Voir l'entraînement",
    exercisesCount: "{{count}} exercices",
    startDayWorkout: "Démarrer l'entraînement jour {{day}}",
    dayPreview: "Aperçu jour {{day}}",
    weekOverview: "Aperçu de la semaine",
    detailInfo: "Touchez un exercice pour voir ses détails. Les membres Pro peuvent personnaliser leurs exercices.",
    exerciseVolume: "Volume d'exercice",
    nextExercise: "Exercice suivant",
    addExercise: "Ajouter un exercice",
    addSet: "+ Ajouter une série",
    restTimer: "Chronomètre de repos",
    iAmReady: "Je suis prêt",
    turnOff: "Désactiver",
    setShort: "SÉRIE",
    previousShort: "PRÉCÉDENT",
    kgShort: "KG",
    repsShort: "RÉPS",
    finish: "Terminer",
    duration: "Durée",
    volume: "Volume",
    sets: "Séries",
    syncedFromHealth: "Synchronisé depuis Santé",
    freePlanComplete: "Programme de base terminé — passez à Pro pour continuer",
    continueJourney: "Poursuivez votre transformation",
    freeUsers28DaysFull: "Le plan gratuit inclut un programme de 28 jours. Passez à Pro pour bénéficier d'un plan qui s'adapte à chaque cycle.",
    your4WeekProgram: "Votre programme de 4 semaines",
    weekProgress: "Semaine {{currentWeek}} sur {{totalWeeks}}",
    daysPerWeekText: "{{days}} jours/semaine",
    routeLoaded: "Itinéraire chargé",
    waypointsLoaded: "{{count}} points de passage.",
    gpxRoutes: "Tracés GPX",
    gpxRoutesDesc: "Importation de fichiers GPX prochainement.\nVous pourrez importer des fichiers .gpx Wikiloc pour superposer un itinéraire.",
    log: "Enregistrer"
  },
  modals: {
    logRecipe: {
      titleRecipe: "Ajouter une recette",
      titleFood: "Ajouter un aliment",
      logged: "Enregistré !",
      addedTo: "Ajouté à votre",
      logToMeal: "Enregistrer dans le repas",
      qty: "Quantité",
      skip: "Passer",
      logTo: "Enregistrer dans"
    },
    search: {
      addFood: "Ajouter un aliment",
      addRecipe: "Ajouter une recette"
    },
    addFood: {
      nextReview: "Suivant : Vérifier",
      reviewSave: "Vérifier & Enregistrer",
      by: "par",
      saving: "Enregistrement...",
      saveFood: "Enregistrer l'aliment"
    }
  },
  foodReview: {
    saveToMyFoods: "Enregistrer dans Mes Aliments",
    saveAsRecipe: "Enregistrer comme recette",
    savedToMyFoodsSuccess: "Enregistré dans Mes Aliments !",
    savedAsRecipeSuccess: "Enregistré comme recette !",
    addToDiary: "Ajouter au journal"
  },
  fuel: {
    detailedInsights: {
      title: "Nutrition Détaillée",
      calories: "Calories",
      protein: "Protéines totales",
      carbs: "Glucides totaux",
      fiber: "Fibres alimentaires",
      sugar: "Sucres totaux",
      fat: "Lipides totaux",
      saturatedFat: "Graisses saturées",
      polyunsaturatedFat: "Graisses polyinsaturées",
      monounsaturatedFat: "Graisses monoinsaturées",
      transFat: "Graisses trans"
    },
    quickActions: {
      nutritionInsights: "Analyse nutritionnelle",
      nutritionInsightsDesc: "Exploration détaillée des macros"
    }
  },
  common: {
    servings: "portions",
    protein: "Protéines",
    carbs: "Glucides",
    fat: "Lipides",
    kcal: "kcal",
    proteinShort: "P",
    carbsShort: "G",
    fatShort: "L",
    openSettings: "Ouvrir les Réglages",
    checkSettings: "Vérifier les Réglages",
    configError: "Erreur de configuration",
    disconnect: "Déconnecter",
    start: "Démarrer",
    yes: "Oui",
    resume: "Reprendre",
    pause: "Pause",
    close: "Fermer",
    cancel: "Annuler",
    beginner: "Débutant",
    intermediate: "Intermédiaire",
    advanced: "Avancé",
    veteran: "Vétéran",
    dayNum: "Jour {{num}}",
    today: "Aujourd'hui",
    units: { kg: "kg" }
  },
  disclaimer: {
    medical: "Bluom fournit uniquement des informations générales de bien-être. Consultez toujours un professionnel de santé pour tout conseil médical, diagnostic ou traitement."
  },
  sleeper: {
    sleepingStatus: "Module en veille",
    activateBtn: "Activer ce module"
  }
};

const masterMap = {
  en: ptEsData.en,
  pt: ptEsData.pt,
  es: ptEsData.es,
  de,
  fr
};

fs.writeFileSync(path.join(__dirname, 'translations_master_partial.json'), JSON.stringify(masterMap, null, 2), 'utf8');
console.log('Saved EN, PT, ES, DE, FR.');
