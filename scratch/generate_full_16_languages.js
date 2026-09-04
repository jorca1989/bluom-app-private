const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../locales');
const partial = JSON.parse(fs.readFileSync(path.join(__dirname, 'translations_master_partial.json'), 'utf8'));

// 3. DUTCH (nl)
const nl = {
  integrations: {
    title: "Verbindingen",
    subtitle: "Synchroniseer gegevens van je apparaten en apps",
    privacyNotice: "Bluom leest alleen de onderstaande gegevenstypen. We verkopen je gezondheidsgegevens nooit. Je kunt op elk moment ontkoppelen en volledige verwijdering aanvragen via Instellingen → Account.",
    healthLog: "Gezondheidslogboek",
    healthLogSub: "Bekijk de vandaag geïmporteerde metingen",
    sourcesConnected: "{{count}} bron verbonden",
    sourcesConnectedPlural: "{{count}} bronnen verbonden",
    recentImportedData: "Recent geïmporteerde gegevens",
    deletionNotice: "Als je je Bluom-account verwijdert, worden alle gesynchroniseerde gegevens op onze servers binnen 30 dagen definitief verwijderd. Lokale apparaatgegevens blijven onaangeroerd.",
    categories: {
      activity: "Activiteit & Fitness",
      biometrics: "Lichaamsmetingen",
      nutrition: "Voeding",
      sleep: "Slaap & Herstel"
    },
    card: {
      comingSoon: "Binnenkort",
      neverSynced: "Nooit gesynchroniseerd",
      justNow: "Zojuist",
      minsAgo: "{{mins}}m geleden",
      hoursAgo: "{{hours}}u geleden",
      daysAgo: "{{days}}d geleden",
      lastSync: "Laatste synchronisatie: {{time}}",
      hideDetails: "Details verbergen",
      readingDataTypes: "Leest {{count}} gegevenstypen",
      dataWeAccess: "GEGEVENS WAAR WE TOEGANG TOE HEBBEN",
      howWeUseIt: "HOE WE HET GEBRUIKEN",
      syncNow: "Nu synchroniseren"
    },
    alerts: {
      disconnectTitle: "{{name}} ontkoppelen",
      disconnectHealthMsg: "We stoppen met het uitlezen van gezondheidsgegevens. Je historische gesynchroniseerde gegevens blijven bewaard.",
      healthConnFailed: "Gezondheidsverbinding mislukt",
      healthKitFailedIos: "Bluom kon HealthKit niet initialiseren. Controleer de machtigingen in de iOS-instellingen.",
      healthConnectFailedAndroid: "Verleen machtigingen in Health Connect om je gegevens te synchroniseren.",
      disconnectStravaTitle: "Strava ontkoppelen",
      disconnectStravaMsg: "We importeren geen Strava-activiteiten meer. Je bestaande logs blijven bewaard.",
      disconnectedTitle: "Ontkoppeld",
      stravaDisconnectedMsg: "Strava is ontkoppeld.",
      syncComplete: "Synchronisatie voltooid",
      syncCompleteDetails: "Stappen: {{steps}}\nCalorieën: {{calories}} kcal\nAfstand: {{distance}} km",
      stravaSynced: "Strava gesynchroniseerd",
      stravaSyncedDetails: "{{count}} nieuwe activiteiten geïmporteerd.",
      syncFailed: "Synchronisatie mislukt",
      stravaSyncFailedDetails: "Kon Strava-activiteiten niet synchroniseren."
    },
    items: {
      apple_health: {
        name: "Apple Health",
        subtitle: "Stappen, workouts, slaap & meer",
        dataPoints: ["Stappen & wandelafstand", "Actief verbrande calorieën", "Workoutsessies", "Lichaamsgewicht", "Slaapduur", "Hartslag"],
        purpose: "Je stappen en actieve calorieën werken je dagelijkse doel bij. Gewicht synchroniseert met je voortgangstracker. Hartslag en slaap berekenen je Vitaliteitsscores."
      },
      google_health: {
        name: "Health Connect",
        subtitle: "Stappen, workouts, slaap & meer",
        dataPoints: ["Stappen & wandelafstand", "Actief verbrande calorieën", "Workoutsessies", "Lichaamsgewicht", "Slaapsessies", "Hartslag"],
        purpose: "Je stappen en actieve calorieën werken je dagelijkse doel bij. Gewicht synchroniseert met je voortgangstracker. Hartslag en slaap berekenen je Vitaliteitsscore."
      },
      strava: {
        name: "Strava",
        subtitle: "Hardlopen, fietsen & buitensporten",
        dataPoints: ["Activiteitstype & naam", "Duur & afstand", "Verbrande calorieën", "Gemiddelde hartslag"],
        purpose: "Strava-activiteiten worden automatisch geïmporteerd als workouts zodat je calorieverbruik en trainingsgeschiedenis actueel blijven."
      },
      withings: {
        name: "Withings",
        subtitle: "Slimme weegschalen & gezondheidsmonitors",
        dataPoints: ["Lichaamsgewicht", "Vetpercentage %", "Spiermassa"],
        purpose: "Lichaamssamenstelling verbetert de nauwkeurigheid van je caloriedoelen en toont je voortgang over tijd."
      },
      samsung_health: {
        name: "Samsung Health",
        subtitle: "Galaxy Watch & Galaxy Ring",
        dataPoints: ["Stappen", "Hartslag", "Slaapfasen", "Lichaamssamenstelling"],
        purpose: "Samsung Health-gegevens vullen je dagelijkse activiteitenlogboek en verrijken je slaap- en herstelscores."
      },
      oura: {
        name: "Oura Ring",
        subtitle: "Geavanceerde slaap- & gereedheidsscores",
        dataPoints: ["Slaapduur & -fasen", "Gereedheidsscore", "Hartslagvariabiliteit (HRV)", "Lichaamstemperatuurtrend"],
        purpose: "Oura-slaapgegevens voeden je nachtelijke Wellness-score en bepalen herstelaanbevelingen in je Move-plan."
      },
      myfitnesspal: {
        name: "MyFitnessPal",
        subtitle: "Voedingsdagboek & calorieën",
        dataPoints: ["Dagelijks geconsumeerde calorieën", "Macro's (eiwitten, koolhydraten, vet)", "Waterinname"],
        purpose: "Het importeren van je MFP-dagboek voorkomt dubbele invoer en houdt je voedingstotalen exact."
      }
    }
  },
  womensHealth: {
    postpartum: {
      babyIsHere: "De baby is er!",
      postpartumRecovery: "Postpartum herstel",
      transitionTitle: "Welkom bij postpartum herstel",
      deliveryDate: "Bevallingsdatum",
      deliveryType: "Type bevalling",
      vaginal: "Vaginaal",
      cSection: "Keizersnede",
      isBreastfeeding: "Borstvoeding?",
      saveTransition: "Start postpartum traject",
      ppWeek: "Week {{week}} postpartum",
      newborn: "Pasgeboren tracker",
      feed: "Voeding",
      diaper: "Luier",
      sleep: "Babyslaap",
      lochia: "Lochia / Bloeding",
      pain: "Wond- / Bekkenpijn",
      pelvicFloor: "Bekkenbodem & Core",
      startPelvic: "Bekkenbodem & Core Protocol",
      ppMood: "Postpartum stemming",
      anxious: "Bezorgd",
      overwhelmed: "Overweldigd",
      numb: "Afgevlakt",
      happy: "Verbonden & Blij",
      heavy: "Veel",
      light: "Licht",
      none: "Geen"
    },
    ppPain: "Wond- / Bekkenpijn (1-10)",
    ppMood: "Postpartum stemming",
    ppLochia: "Lochia / Bloeding",
    ppc1: "Wondgenezing, zwaar tillen vermijden",
    ppv1: "Bekkenbodemzwelling, lochia",
    ppc2: "Core zacht activeren, rustig opbouwen",
    ppv2: "Bekkenbodem hervindt spierspanning",
    startPelvic: "Bekkenbodem & Core Protocol",
    cSecRec1: "Wondgenezing, tillen vermijden en lochia opvolgen.",
    vagRec1: "Bekkenbodemzwelling, rust en lochia opvolgen.",
    babyHereBtn: "De baby is er!",
    pelvicTitle: "Bekkenbodem Krachtprotocol",
    pelvicSub: "Versterkt de bekkenbodem, verlicht krampen en ondersteunt de core",
    pelvicInstructions: "5s aanspannen → 5s ontspannen → herhalen. 10 cycli per sessie.",
    stopSession: "Sessie stoppen",
    startTimer: "Timer starten"
  },
  mensHealth: {
    vitalityCheckin: "Vitaliteitscheck",
    vitalitySub: "Beoordeel elke pijler eerlijk. Je T-Opt-score wordt direct bijgewerkt.",
    tOptScore: "T-OPT-SCORE",
    drivePillar: "Energie / Libido",
    recoveryPillar: "Herstelstatus",
    focusPillar: "Mentale focus",
    sleepPillar: "Slaapkwaliteit",
    moodSynced: "Stemming gesynchroniseerd vanuit Wellness",
    updateStatus: "Systeemstatus bijwerken",
    pelvicTitle: "Bekkenbodem Krachtprotocol",
    pelvicSub: "Verbetert erectiele functie, blaascontrole, seksuele prestaties en core-stabiliteit.",
    pelvicInstructions: "5s aanspannen → 5s ontspannen → herhalen. 10–15 cycli. Dagelijkse oefening geeft resultaat in 4–6 weken.",
    pelvicActionSub: "Core, erectie- & blaasfunctie",
    startProtocol: "Start protocol",
    finishLog: "Voltooien & Opslaan"
  },
  move: {
    insightsTitle: "Trainingsinzichten",
    weeklyProgress: "Wekelijkse voortgang",
    sessions: "Sessies",
    totalTime: "Totale tijd",
    calories: "Calorieën",
    thisWeekVsLastWeek: "Deze week vs. Vorige week",
    calorieBurnTrend: "Calorieverbranding trend",
    thisWeekTotal: "Totaal deze week",
    vsLastWeek: "{{val}}% vs. vorige week",
    consistencyStreak: "Consistentie-reeks",
    daysCount: "{{count}} dagen",
    onFire: "🔥 Uitstekend bezig!",
    keepGoing: "Ga zo door!",
    avgSessionLength: "Gem. sessieduur",
    workoutMix: "Trainingsmix",
    mostActiveDay: "Meest actieve dag",
    sessions_count: "{{count}} sessies",
    noWorkoutDataYet: "Nog geen trainingsgegevens",
    logToUnlockTrends: "Log sessies om trends te ontgrendelen.",
    unlockProAnalysis: "Ontgrendel Pro-analyse",
    unlockProDesc: "Krijg trends, volume-tracking en persoonlijke records.",
    upgradeToPro: "Upgraden naar Pro",
    upNext: "Volgende",
    startWorkout: "Start Workout",
    viewWorkout: "Bekijk Workout",
    exercisesCount: "{{count}} oefeningen",
    startDayWorkout: "Start Dag {{day}} Workout",
    dayPreview: "Voorbeeld Dag {{day}}",
    weekOverview: "Weekoverzicht",
    detailInfo: "Tik op een oefening voor details. Pro-gebruikers kunnen oefeningen aanpassen.",
    exerciseVolume: "Oefeningsvolume",
    nextExercise: "Volgende oefening",
    addExercise: "Oefening toevoegen",
    addSet: "+ Set toevoegen",
    restTimer: "Rusttimer",
    iAmReady: "Ik ben er klaar voor",
    turnOff: "Uitschakelen",
    setShort: "SET",
    previousShort: "VORIGE",
    kgShort: "KG",
    repsShort: "REPS",
    finish: "Voltooien",
    duration: "Duur",
    volume: "Volume",
    sets: "Sets",
    syncedFromHealth: "Gesynchroniseerd via Health",
    freePlanComplete: "Basisplan voltooid — upgrade om door te gaan",
    continueJourney: "Vervolg je transformatie",
    freeUsers28DaysFull: "Het gratis plan bevat een compleet 28-dagen programma. Upgrade naar Pro voor adaptieve plannen.",
    your4WeekProgram: "Jouw 4-Weken Programma",
    weekProgress: "Week {{currentWeek}} van {{totalWeeks}}",
    daysPerWeekText: "{{days}} dagen/week",
    routeLoaded: "Route geladen",
    waypointsLoaded: "{{count}} routepunten.",
    gpxRoutes: "GPX-routes",
    gpxRoutesDesc: "GPX-bestand upload binnenkort beschikbaar.\nJe kunt Wikiloc .gpx-bestanden uploaden als referentieroute.",
    log: "Loggen"
  },
  modals: {
    logRecipe: {
      titleRecipe: "Recept toevoegen",
      titleFood: "Voedingsmiddel toevoegen",
      logged: "Gelogd!",
      addedTo: "Toegevoegd aan je",
      logToMeal: "Aan maaltijd toevoegen",
      qty: "Hoeveelheid",
      skip: "Overslaan",
      logTo: "Loggen in"
    },
    search: {
      addFood: "Voedingsmiddel toevoegen",
      addRecipe: "Recept toevoegen"
    },
    addFood: {
      nextReview: "Volgende: Controleren",
      reviewSave: "Controleren & Opslaan",
      by: "door",
      saving: "Opslaan...",
      saveFood: "Voeding opslaan"
    }
  },
  foodReview: {
    saveToMyFoods: "Opslaan in Mijn Voedingsmiddelen",
    saveAsRecipe: "Opslaan als recept",
    savedToMyFoodsSuccess: "Opgeslagen in Mijn Voedingsmiddelen!",
    savedAsRecipeSuccess: "Opgeslagen als recept!",
    addToDiary: "Aan dagboek toevoegen"
  },
  fuel: {
    detailedInsights: {
      title: "Gedetailleerde Voedingswaarden",
      calories: "Calorieën",
      protein: "Totale Eiwitten",
      carbs: "Totale Koolhydraten",
      fiber: "Voedingsvezels",
      sugar: "Totale Suikers",
      fat: "Totaal Vet",
      saturatedFat: "Verzadigd Vet",
      polyunsaturatedFat: "Meervoudig Onverzadigd Vet",
      monounsaturatedFat: "Enkelvoudig Onverzadigd Vet",
      transFat: "Transvetten"
    },
    quickActions: {
      nutritionInsights: "Voedingsinzichten",
      nutritionInsightsDesc: "Gedetailleerde macro-analyse"
    }
  },
  common: {
    servings: "porties",
    protein: "Eiwit",
    carbs: "Koolhydraten",
    fat: "Vet",
    kcal: "kcal",
    proteinShort: "E",
    carbsShort: "K",
    fatShort: "V",
    openSettings: "Instellingen openen",
    checkSettings: "Instellingen controleren",
    configError: "Configuratiefout",
    disconnect: "Ontkoppelen",
    start: "Start",
    yes: "Ja",
    resume: "Hervatten",
    pause: "Pauze",
    close: "Sluiten",
    cancel: "Annuleren",
    beginner: "Beginner",
    intermediate: "Gemiddeld",
    advanced: "Gevorderd",
    veteran: "Veteraan",
    dayNum: "Dag {{num}}",
    today: "Vandaag",
    units: { kg: "kg" }
  },
  disclaimer: {
    medical: "Bluom biedt uitsluitend algemene wellnessinformatie. Raadpleeg altijd een gekwalificeerde arts voor medisch advies, diagnose of behandeling."
  },
  sleeper: {
    sleepingStatus: "Module in rust",
    activateBtn: "Activeer deze module"
  }
};

// 4. POLISH (pl)
const pl = {
  integrations: {
    title: "Połączenia",
    subtitle: "Synchronizuj dane ze swoich urządzeń i aplikacji",
    privacyNotice: "Bluom odczytuje wyłącznie typy danych wymienione poniżej. Nigdy nie sprzedajemy Twoich danych zdrowotnych. Możesz w każdej chwili odłączyć integrację w Ustawienia → Konto.",
    healthLog: "Dziennik Zdrowia",
    healthLogSub: "Zobacz dzisiejsze zaimportowane pomiary",
    sourcesConnected: "Połączono {{count}} źródło",
    sourcesConnectedPlural: "Połączono {{count}} źródła/źródeł",
    recentImportedData: "Ostatnio zaimportowane dane",
    deletionNotice: "Jeśli usuniesz konto Bluom, wszystkie zsynchronizowane dane na naszych serwerach zostaną trwale usunięte w ciągu 30 dni.",
    categories: {
      activity: "Aktywność i Fitness",
      biometrics: "Pomiary Ciała",
      nutrition: "Odżywianie",
      sleep: "Sen i Regeneracja"
    },
    card: {
      comingSoon: "Wkrótce",
      neverSynced: "Nigdy nie synchronizowano",
      justNow: "Przed chwilą",
      minsAgo: "{{mins}} min temu",
      hoursAgo: "{{hours}} godz. temu",
      daysAgo: "{{days}} dni temu",
      lastSync: "Ostatnia synchronizacja: {{time}}",
      hideDetails: "Ukryj szczegóły",
      readingDataTypes: "Odczyt {{count}} typów danych",
      dataWeAccess: "DANE, DO KTÓRYCH MAMY DOSTĘP",
      howWeUseIt: "JAK ICH UŻYWAMY",
      syncNow: "Synchronizuj teraz"
    },
    alerts: {
      disconnectTitle: "Odłącz {{name}}",
      disconnectHealthMsg: "Przestaniemy pobierać dane zdrowotne. Twoje dotychczasowe zsynchronizowane dane zostaną zachowane.",
      healthConnFailed: "Błąd połączenia ze Zdrowiem",
      healthKitFailedIos: "Bluom nie mógł zainicjować HealthKit. Sprawdź uprawnienia w Ustawieniach iOS.",
      healthConnectFailedAndroid: "Przyznaj uprawnienia w Health Connect, aby zsynchronizować dane.",
      disconnectStravaTitle: "Odłącz Strava",
      disconnectStravaMsg: "Przestaniemy importować aktywności Strava. Dotychczasowe wpisy zostaną zachowane.",
      disconnectedTitle: "Odłączono",
      stravaDisconnectedMsg: "Konto Strava zostało odłączone.",
      syncComplete: "Synchronizacja zakończona",
      syncCompleteDetails: "Kroki: {{steps}}\nKalorie: {{calories}} kcal\nDystans: {{distance}} km",
      stravaSynced: "Zsynchronizowano ze Strava",
      stravaSyncedDetails: "Zaimportowano {{count}} nowych aktywności.",
      syncFailed: "Błąd synchronizacji",
      stravaSyncFailedDetails: "Nie udało się zsynchronizować aktywności Strava."
    },
    items: {
      apple_health: {
        name: "Apple Health",
        subtitle: "Kroki, treningi, sen i więcej",
        dataPoints: ["Kroki i przebyty dystans", "Spalone kalorie aktywne", "Sesje treningowe", "Masa ciała", "Czas snu", "Tętno"],
        purpose: "Kroki i aktywne kalorie aktualizują Twój dzienny cel spalania. Masa ciała synchronizuje się ze śledzeniem postępów. Tętno i sen obliczają wskaźniki Witalności."
      },
      google_health: {
        name: "Health Connect",
        subtitle: "Kroki, treningi, sen i więcej",
        dataPoints: ["Kroki i przebyty dystans", "Spalone kalorie aktywne", "Sesje treningowe", "Masa ciała", "Sesje snu", "Tętno"],
        purpose: "Kroki i aktywne kalorie aktualizują Twój dzienny cel spalania. Masa ciała synchronizuje się ze śledzeniem postępów. Tętno i sen obliczają Twój wynik Witalności."
      },
      strava: {
        name: "Strava",
        subtitle: "Bieganie, kolarstwo i sporty na świeżym powietrzu",
        dataPoints: ["Typ i nazwa aktywności", "Czas trwania i dystans", "Spalone kalorie", "Średnie tętno"],
        purpose: "Aktywności Strava są automatycznie importowane jako treningi, co zapewnia dokładny bilans kaloryczny bez ręcznego wpisywania."
      },
      withings: {
        name: "Withings",
        subtitle: "Inteligentne wagi i monitory zdrowia",
        dataPoints: ["Masa ciała", "% Tkanki tłuszczowej", "Masa mięśniowa"],
        purpose: "Skład ciała zwiększa dokładność celów kalorycznych i obrazuje Twoje postępy w czasie."
      },
      samsung_health: {
        name: "Samsung Health",
        subtitle: "Galaxy Watch i Galaxy Ring",
        dataPoints: ["Kroki", "Tętno", "Fazy snu", "Skład ciała"],
        purpose: "Dane Samsung Health uzupełniają dziennik aktywności i wzbogacają wskaźniki regeneracji oraz snu."
      },
      oura: {
        name: "Oura Ring",
        subtitle: "Zaawansowane wskaźniki snu i gotowości",
        dataPoints: ["Czas i fazy snu", "Wynik gotowości (Readiness)", "Zmienność rytmu zatokowego (HRV)", "Trend temperatury ciała"],
        purpose: "Dane Oura zasilają Twój nocny wynik Wellness i wspierają rekomendacje regeneracyjne w planie treningowym."
      },
      myfitnesspal: {
        name: "MyFitnessPal",
        subtitle: "Dziennik posiłków i odżywianie",
        dataPoints: ["Spożyte kalorie", "Makroskładniki (białko, węglowodany, tłuszcz)", "Spożycie wody"],
        purpose: "Import dziennika MFP zapobiega podwójnemu wpisywaniu posiłków i utrzymuje dokładne bilanse odżywiania."
      }
    }
  },
  womensHealth: {
    postpartum: {
      babyIsHere: "Dziecko jest już na świecie!",
      postpartumRecovery: "Regeneracja Połogowa",
      transitionTitle: "Witaj w okresie regeneracji poporodowej",
      deliveryDate: "Data porodu",
      deliveryType: "Rodzaj porodu",
      vaginal: "Siłami natury",
      cSection: "Cięcie cesarskie",
      isBreastfeeding: "Karmisz piersią?",
      saveTransition: "Rozpocznij regenerację",
      ppWeek: "Tydzień {{week}} po porodzie",
      newborn: "Dziennik Noworodka",
      feed: "Karmienie",
      diaper: "Pieluszka",
      sleep: "Sen dziecka",
      lochia: "Odchody połogowe / Krwawienie",
      pain: "Ból rany / dna miednicy",
      pelvicFloor: "Dno miednicy i Core",
      startPelvic: "Protokół dna miednicy i Core",
      ppMood: "Nastrój po porodzie",
      anxious: "Niespokojna",
      overwhelmed: "Przeciążona",
      numb: "Obojętna",
      happy: "Bliska i Szczęśliwa",
      heavy: "Obfite",
      light: "Skąpe",
      none: "Brak"
    },
    ppPain: "Ból rany / dna miednicy (1-10)",
    ppMood: "Nastrój po porodzie",
    ppLochia: "Odchody połogowe / Krwawienie",
    ppc1: "Gojenie rany, unikanie dźwigania",
    ppv1: "Obrzęk dna miednicy, odchody połogowe",
    ppc2: "Delikatne wzmacnianie core, ograniczanie wysiłku",
    ppv2: "Dno miednicy odzyskuje napięcie",
    startPelvic: "Protokół dna miednicy i Core",
    cSecRec1: "Gojenie rany, unikanie ciężarów, kontrola odchodów połogowych.",
    vagRec1: "Obrzęk dna miednicy, odpoczynek i kontrola odchodów połogowych.",
    babyHereBtn: "Dziecko jest już na świecie!",
    pelvicTitle: "Protokół Mocy Dna Miednicy",
    pelvicSub: "Wzmacnia dno miednicy, łagodzi skurcze i wspiera mięśnie głębokie",
    pelvicInstructions: "Napinaj 5s → Rozluźniaj 5s → Powtórz. 10 cykli na sesję.",
    stopSession: "Zakończ sesję",
    startTimer: "Rozpocznij timer"
  },
  mensHealth: {
    vitalityCheckin: "Bilan Witalności",
    vitalitySub: "Oceń każdy filar szczerze. Twój wynik T-Opt aktualizuje się w czasie rzeczywistym.",
    tOptScore: "WYNIK T-OPT",
    drivePillar: "Energia / Libido",
    recoveryPillar: "Stan Regeneracji",
    focusPillar: "Koncentracja",
    sleepPillar: "Jakość Snu",
    moodSynced: "Nastrój zsynchronizowany z Wellness",
    updateStatus: "Zaktualizuj status systemu",
    pelvicTitle: "Protokół Mocy Dna Miednicy",
    pelvicSub: "Poprawia funkcje erekcyjne, kontrolę pęcherza, sprawność seksualną i stabilność core.",
    pelvicInstructions: "Napinaj 5s → Rozluźniaj 5s → Powtórz. 10–15 cykli. Codzienny trening przynosi efekty w 4–6 tygodni.",
    pelvicActionSub: "Core, funkcje erekcyjne i pęcherza",
    startProtocol: "Rozpocznij protokół",
    finishLog: "Zakończ i Zapisz"
  },
  move: {
    insightsTitle: "Wgląd w Trening",
    weeklyProgress: "Postęp Tygodniowy",
    sessions: "Sesje",
    totalTime: "Całkowity czas",
    calories: "Kalorie",
    thisWeekVsLastWeek: "Ten tydzień vs Poprzedni tydzień",
    calorieBurnTrend: "Trend spalania kalorii",
    thisWeekTotal: "Łącznie w tym tygodniu",
    vsLastWeek: "{{val}}% vs poprzedni tydzień",
    consistencyStreak: "Seria regularności",
    daysCount: "{{count}} dni",
    onFire: "🔥 Wspaniała forma!",
    keepGoing: "Tak trzymaj!",
    avgSessionLength: "Śr. czas trwania sesji",
    workoutMix: "Zróżnicowanie treningów",
    mostActiveDay: "Najbardziej aktywny dzień",
    sessions_count: "{{count}} sesji",
    noWorkoutDataYet: "Brak danych treningowych",
    logToUnlockTrends: "Zapisuj sesje, aby odblokować trendy.",
    unlockProAnalysis: "Odblokuj analizę Pro",
    unlockProDesc: "Zyskaj analizę trendów, objętości i rekordów osobistych.",
    upgradeToPro: "Przejdź na Pro",
    upNext: "Następny",
    startWorkout: "Rozpocznij trening",
    viewWorkout: "Zobacz trening",
    exercisesCount: "{{count}} ćwiczeń",
    startDayWorkout: "Rozpocznij trening Dzień {{day}}",
    dayPreview: "Podgląd Dzień {{day}}",
    weekOverview: "Przegląd tygodnia",
    detailInfo: "Dotknij ćwiczenia, aby zobaczyć szczegóły. Użytkownicy Pro mogą dostosowywać ćwiczenia.",
    exerciseVolume: "Objętość ćwiczenia",
    nextExercise: "Następne ćwiczenie",
    addExercise: "Dodaj ćwiczenie",
    addSet: "+ Dodaj serię",
    restTimer: "Timer odpoczynku",
    iAmReady: "Gotowy",
    turnOff: "Wyłącz",
    setShort: "SERIA",
    previousShort: "POPRZEDNIO",
    kgShort: "KG",
    repsShort: "POWT.",
    finish: "Zakończ",
    duration: "Czas trwania",
    volume: "Objętość",
    sets: "Serie",
    syncedFromHealth: "Zsynchronizowano ze Zdrowia",
    freePlanComplete: "Plan podstawowy ukończony — przejdź na Pro, aby kontynuować",
    continueJourney: "Kontynuuj swoją transformację",
    freeUsers28DaysFull: "Bezpłatny plan zawiera pełny 28-dniowy program. Przejdź na Pro, aby uzyskać plany adaptacyjne w każdym cyklu.",
    your4WeekProgram: "Twój 4-tygodniowy program",
    weekProgress: "Tydzień {{currentWeek}} z {{totalWeeks}}",
    daysPerWeekText: "{{days}} dni/tydz.",
    routeLoaded: "Trasa wczytana",
    waypointsLoaded: "{{count}} punktów trasy.",
    gpxRoutes: "Trasy GPX",
    gpxRoutesDesc: "Import plików GPX już wkrótce.\nBędziesz mógł wgrać pliki .gpx z Wikiloc jako trasę referencyjną.",
    log: "Zapisz"
  },
  modals: {
    logRecipe: {
      titleRecipe: "Dodaj przepis",
      titleFood: "Dodaj produkt",
      logged: "Zapisano!",
      addedTo: "Dodano do posiłku",
      logToMeal: "Zapisz w posiłku",
      qty: "Ilość",
      skip: "Pomiń",
      logTo: "Zapisz w"
    },
    search: {
      addFood: "Dodaj produkt",
      addRecipe: "Dodaj przepis"
    },
    addFood: {
      nextReview: "Dalej: Podsumowanie",
      reviewSave: "Sprawdź i Zapisz",
      by: "autor:",
      saving: "Zapisywanie...",
      saveFood: "Zapisz produkt"
    }
  },
  foodReview: {
    saveToMyFoods: "Zapisz w Moich Produktach",
    saveAsRecipe: "Zapisz jako przepis",
    savedToMyFoodsSuccess: "Zapisano w Moich Produktach!",
    savedAsRecipeSuccess: "Zapisano jako przepis!",
    addToDiary: "Dodaj do Dziennika"
  },
  fuel: {
    detailedInsights: {
      title: "Szczegółowe Wartości Odżywcze",
      calories: "Kalorie",
      protein: "Białko całkowite",
      carbs: "Węglowodany całkowite",
      fiber: "Błonnik",
      sugar: "Cukry proste",
      fat: "Tłuszcz całkowity",
      saturatedFat: "Tłuszcze nasycone",
      polyunsaturatedFat: "Tłuszcze wielonienasycone",
      monounsaturatedFat: "Tłuszcze jednonienasycone",
      transFat: "Tłuszcze trans"
    },
    quickActions: {
      nutritionInsights: "Analiza Odżywiania",
      nutritionInsightsDesc: "Szczegółowy rozkład makroskładników"
    }
  },
  common: {
    servings: "porcji",
    protein: "Białko",
    carbs: "Węglowodany",
    fat: "Tłuszcz",
    kcal: "kcal",
    proteinShort: "B",
    carbsShort: "W",
    fatShort: "T",
    openSettings: "Otwórz Ustawienia",
    checkSettings: "Sprawdź Ustawienia",
    configError: "Błąd konfiguracji",
    disconnect: "Odłącz",
    start: "Start",
    yes: "Tak",
    resume: "Wznów",
    pause: "Pauza",
    close: "Zamknij",
    cancel: "Anuluj",
    beginner: "Początkujący",
    intermediate: "Średniozaawansowany",
    advanced: "Zaawansowany",
    veteran: "Weteran",
    dayNum: "Dzień {{num}}",
    today: "Dzisiaj",
    units: { kg: "kg" }
  },
  disclaimer: {
    medical: "Bluom dostarcza wyłącznie ogólnych informacji o zdrowiu i stylu życia. Zawsze konsultuj się z lekarzem w sprawach diagnozy, leczenia i porad medycznych."
  },
  sleeper: {
    sleepingStatus: "Moduł uśpiony",
    activateBtn: "Aktywuj ten moduł"
  }
};

const fullMap = {
  ...partial,
  nl,
  pl
};

fs.writeFileSync(path.join(__dirname, 'translations_master_partial2.json'), JSON.stringify(fullMap, null, 2), 'utf8');
console.log('Saved NL and PL.');
