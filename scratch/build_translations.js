const fs = require('fs');
const path = require('path');

const data = {};

// 1. ENGLISH
data.en = {
  integrations: {
    title: "Connections",
    subtitle: "Sync data from your devices & apps",
    privacyNotice: "Bluom only reads the data types listed below. We never sell your health data. You can disconnect at any time and request full deletion from Settings → Account.",
    healthLog: "Health Log",
    healthLogSub: "View today’s imported metrics",
    sourcesConnected: "{{count}} source connected",
    sourcesConnectedPlural: "{{count}} sources connected",
    recentImportedData: "Recent Imported Data",
    deletionNotice: "If you delete your Bluom account, all synced health data stored on our servers is permanently deleted within 30 days. Local device data managed by Apple Health or Google Health Connect is unaffected.",
    categories: {
      activity: "Activity & Fitness",
      biometrics: "Body Metrics",
      nutrition: "Nutrition",
      sleep: "Sleep & Recovery"
    },
    card: {
      comingSoon: "Coming soon",
      neverSynced: "Never synced",
      justNow: "Just now",
      minsAgo: "{{mins}}m ago",
      hoursAgo: "{{hours}}h ago",
      daysAgo: "{{days}}d ago",
      lastSync: "Last Sync: {{time}}",
      hideDetails: "Hide details",
      readingDataTypes: "Reading {{count}} data types",
      dataWeAccess: "DATA WE ACCESS",
      howWeUseIt: "HOW WE USE IT",
      syncNow: "Sync Now"
    },
    alerts: {
      disconnectTitle: "Disconnect {{name}}",
      disconnectHealthMsg: "We will stop reading health data. Your historical synced data will be kept.",
      healthConnFailed: "Health Connection Failed",
      healthKitFailedIos: "Bluom was unable to initialize HealthKit. This could be due to missing entitlements, a build configuration error, or the OS blocking the request. Ensure you have made a fresh native build with the latest config.",
      healthConnectFailedAndroid: "Please grant Health Connect permissions to sync your data.",
      disconnectStravaTitle: "Disconnect Strava",
      disconnectStravaMsg: "We will stop importing Strava activities. Your existing logs will be kept.",
      disconnectedTitle: "Disconnected",
      stravaDisconnectedMsg: "Strava has been disconnected.",
      syncComplete: "Sync Complete",
      syncCompleteDetails: "Steps: {{steps}}\nCalories: {{calories}} kcal\nDistance: {{distance}} km",
      stravaSynced: "Strava Synced",
      stravaSyncedDetails: "{{count}} new activities imported.",
      syncFailed: "Sync Failed",
      stravaSyncFailedDetails: "Could not sync Strava activities."
    },
    items: {
      apple_health: {
        name: "Apple Health",
        subtitle: "Steps, workouts, sleep & more",
        dataPoints: [
          "Steps & distance walked",
          "Active calories burned",
          "Workout sessions",
          "Body weight",
          "Sleep duration",
          "Heart rate"
        ],
        purpose: "Your step count and active calories update your daily burn goal. Weight syncs to your progress tracker. Heart rate and sleep data are used to calculate your Vitality recovery scores and optimize your Men’s Health protocols. Women’s Health data (cycle tracking) is used for cycle tracking insights within the Wellness dashboard."
      },
      google_health: {
        name: "Health Connect",
        subtitle: "Steps, workouts, sleep & more",
        dataPoints: [
          "Steps & distance walked",
          "Active calories burned",
          "Workout sessions",
          "Body weight",
          "Sleep sessions",
          "Heart rate"
        ],
        purpose: "Your step count and active calories update your daily burn goal. Weight syncs to your progress tracker. Heart rate and sleep data are used to calculate your Vitality recovery scores and optimize your Men’s Health protocols."
      },
      strava: {
        name: "Strava",
        subtitle: "Running, cycling & outdoor sports",
        dataPoints: [
          "Activity type & name",
          "Duration & distance",
          "Calories burned",
          "Average heart rate"
        ],
        purpose: "Strava activities are automatically imported as exercise entries so your weekly calorie burn and workout history stay accurate without manual logging."
      },
      withings: {
        name: "Withings",
        subtitle: "Smart scales & health monitors",
        dataPoints: [
          "Body weight",
          "Body fat %",
          "Muscle mass"
        ],
        purpose: "Body composition data improves the accuracy of your calorie targets and shows your progress over time."
      },
      samsung_health: {
        name: "Samsung Health",
        subtitle: "Galaxy Watch & Galaxy Ring",
        dataPoints: [
          "Steps",
          "Heart rate",
          "Sleep stages",
          "Body composition"
        ],
        purpose: "Samsung Health data fills your daily activity log and enriches your sleep and recovery scores."
      },
      oura: {
        name: "Oura Ring",
        subtitle: "Advanced sleep & readiness scores",
        dataPoints: [
          "Sleep duration & stages",
          "Readiness score",
          "Heart rate variability",
          "Body temperature trend"
        ],
        purpose: "Oura sleep data powers your nightly Wellness score and informs recovery recommendations in your Move plan."
      },
      myfitnesspal: {
        name: "MyFitnessPal",
        subtitle: "Food diary & nutrition",
        dataPoints: [
          "Daily calories consumed",
          "Macros (protein, carbs, fat)",
          "Water intake"
        ],
        purpose: "Importing your MFP food diary prevents double-entry when you already log there, keeping your Fuel totals accurate."
      }
    }
  },
  womensHealth: {
    postpartum: {
      babyIsHere: "Baby is here!",
      postpartumRecovery: "Postpartum Recovery",
      transitionTitle: "Welcome to Postpartum Recovery",
      deliveryDate: "Delivery Date",
      deliveryType: "Delivery Type",
      vaginal: "Vaginal",
      cSection: "C-Section",
      isBreastfeeding: "Breastfeeding?",
      saveTransition: "Start Postpartum Journey",
      ppWeek: "Week {{week}} Postpartum",
      newborn: "Newborn Tracker",
      feed: "Feed",
      diaper: "Diaper",
      sleep: "Baby Sleep",
      lochia: "Lochia / Bleeding",
      pain: "Incision / Pelvic Pain",
      pelvicFloor: "Pelvic Floor & Core",
      startPelvic: "Pelvic Floor & Core Protocol",
      ppMood: "Postpartum Mood",
      anxious: "Anxious",
      overwhelmed: "Overwhelmed",
      numb: "Numb",
      happy: "Bonding & Happy",
      heavy: "Heavy",
      light: "Light",
      none: "None"
    },
    ppPain: "Incision / Pelvic Pain (1-10)",
    ppMood: "Postpartum Mood",
    ppLochia: "Lochia / Bleeding",
    ppc1: "Incision healing, restricted lifting",
    ppv1: "Pelvic floor swelling, lochia",
    ppc2: "Core gently knitting, restrict lifting",
    ppv2: "Pelvic floor regaining tone",
    startPelvic: "Pelvic Floor & Core Protocol",
    cSecRec1: "Incision healing, restricted lifting, manage lochia.",
    vagRec1: "Pelvic floor swelling, manage lochia and rest.",
    babyHereBtn: "Baby is here!",
    pelvicTitle: "Pelvic Power Protocol",
    pelvicSub: "Strengthens pelvic floor, eases cramps and supports core",
    pelvicInstructions: "Contract 5s → Relax 5s → Repeat. Do 10 cycles per session.",
    stopSession: "Stop Session",
    startTimer: "Start Timer"
  },
  mensHealth: {
    vitalityCheckin: "Vitality Check-in",
    vitalitySub: "Assess each pillar honestly. Your T-Opt score updates in real-time.",
    tOptScore: "T-OPT SCORE",
    drivePillar: "Drive / Libido",
    recoveryPillar: "Recovery State",
    focusPillar: "Mental Focus",
    sleepPillar: "Sleep Quality",
    moodSynced: "Mood synced from Wellness",
    updateStatus: "Update System Status",
    pelvicTitle: "Pelvic Power Protocol",
    pelvicSub: "Improves erectile function, urinary control, sexual performance and core stability.",
    pelvicInstructions: "Contract 5s → Relax 5s → Repeat. 10–15 cycles. Daily practice delivers results in 4–6 weeks.",
    pelvicActionSub: "Core, erectile & urinary function",
    startProtocol: "Start Protocol",
    finishLog: "Finish & Log"
  },
  move: {
    insightsTitle: "Move Insights",
    weeklyProgress: "Weekly Progress",
    sessions: "Sessions",
    totalTime: "Total Time",
    calories: "Calories",
    thisWeekVsLastWeek: "This Week vs Last Week",
    calorieBurnTrend: "Calorie Burn Trend",
    thisWeekTotal: "This week total",
    vsLastWeek: "{{val}}% vs last week",
    consistencyStreak: "Consistency Streak",
    daysCount: "{{count}} days",
    onFire: "🔥 On fire!",
    keepGoing: "Keep going!",
    avgSessionLength: "Avg Session Length",
    workoutMix: "Workout Mix",
    mostActiveDay: "Most Active Day",
    sessions_count: "{{count}} sessions",
    noWorkoutDataYet: "No workout data yet",
    logToUnlockTrends: "Log sessions to unlock trends.",
    unlockProAnalysis: "Unlock Pro Analysis",
    unlockProDesc: "Get trends, volume tracking, and personal bests.",
    upgradeToPro: "Upgrade to Pro",
    upNext: "Up Next",
    startWorkout: "Start Workout",
    viewWorkout: "View Workout",
    exercisesCount: "{{count}} exercises",
    startDayWorkout: "Start Day {{day}} Workout",
    dayPreview: "Day {{day}} Preview",
    weekOverview: "Week Overview",
    detailInfo: "Tap any exercise to see its details. Pro users can add or remove exercises.",
    exerciseVolume: "Exercise Volume",
    nextExercise: "Next Exercise",
    addExercise: "Add Exercise",
    addSet: "+ Add set",
    restTimer: "Rest Timer",
    iAmReady: "I am ready",
    turnOff: "Turn off",
    setShort: "SET",
    previousShort: "PREVIOUS",
    kgShort: "KG",
    repsShort: "REPS",
    finish: "Finish",
    duration: "Duration",
    volume: "Volume",
    sets: "Sets",
    syncedFromHealth: "Synced from Health",
    freePlanComplete: "Blueprint complete — upgrade to continue",
    continueJourney: "Continue Your Journey",
    freeUsers28DaysFull: "Free users get a full 28-day blueprint. When your 28 days finish, upgrade to Pro to continue your transformation with an AI-generated plan that adapts every cycle.",
    your4WeekProgram: "Your 4-Week Program",
    weekProgress: "Week {{currentWeek}} of {{totalWeeks}}",
    daysPerWeekText: "{{days}} days/week",
    routeLoaded: "Route loaded",
    waypointsLoaded: "{{count}} waypoints.",
    gpxRoutes: "GPX Routes",
    gpxRoutesDesc: "GPX file upload coming soon.\nYou can upload Wikiloc .gpx files to overlay a reference path.",
    log: "Log"
  },
  modals: {
    logRecipe: {
      titleRecipe: "Add Recipe",
      titleFood: "Add Food",
      logged: "Logged!",
      addedTo: "Added to your",
      logToMeal: "Log to Meal",
      qty: "Quantity",
      skip: "Skip",
      logTo: "Log to"
    },
    search: {
      addFood: "Add Food",
      addRecipe: "Add Recipe"
    },
    addFood: {
      nextReview: "Next: Review",
      reviewSave: "Review & Save",
      by: "by",
      saving: "Saving...",
      saveFood: "Save Food"
    }
  },
  foodReview: {
    saveToMyFoods: "Save to My Foods",
    saveAsRecipe: "Save as Recipe",
    savedToMyFoodsSuccess: "Saved to My Foods!",
    savedAsRecipeSuccess: "Saved as Recipe!",
    addToDiary: "Add to Diary"
  },
  fuel: {
    detailedInsights: {
      title: "Detailed Nutrition",
      calories: "Calories",
      protein: "Total Protein",
      carbs: "Total Carbohydrate",
      fiber: "Dietary Fiber",
      sugar: "Total Sugars",
      fat: "Total Fat",
      saturatedFat: "Saturated Fat",
      polyunsaturatedFat: "Polyunsaturated Fat",
      monounsaturatedFat: "Monounsaturated Fat",
      transFat: "Trans Fat"
    },
    quickActions: {
      nutritionInsights: "Nutrition Insights",
      nutritionInsightsDesc: "Deep macro dive"
    }
  },
  common: {
    servings: "servings",
    protein: "Protein",
    carbs: "Carbs",
    fat: "Fat",
    kcal: "kcal",
    proteinShort: "P",
    carbsShort: "C",
    fatShort: "F",
    openSettings: "Open Settings",
    checkSettings: "Check Settings",
    configError: "Configuration error",
    disconnect: "Disconnect",
    start: "Start",
    yes: "Yes",
    resume: "Resume",
    pause: "Pause",
    close: "Close",
    cancel: "Cancel",
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    veteran: "Veteran",
    dayNum: "Day {{num}}",
    today: "Today",
    units: {
      kg: "kg"
    }
  },
  disclaimer: {
    medical: "Bluom provides general wellness information only. Always consult a qualified healthcare professional for medical advice, diagnosis, or treatment."
  },
  sleeper: {
    sleepingStatus: "Module Asleep",
    activateBtn: "Activate This Module"
  }
};

fs.writeFileSync(path.join(__dirname, 'translations_data.json'), JSON.stringify(data, null, 2), 'utf8');
console.log('Saved translations_data.json');
