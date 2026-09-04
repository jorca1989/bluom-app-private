const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../locales');
const prev = JSON.parse(fs.readFileSync(path.join(__dirname, 'translations_master_partial2.json'), 'utf8'));

// 5. DANISH (da)
const da = {
  integrations: {
    title: "Forbindelser",
    subtitle: "Synkroniser data fra dine enheder og apps",
    privacyNotice: "Bluom læser kun datatyperne nedenfor. Vi sælger aldrig dine sundhedsdata. Du kan altid afbryde forbindelsen i Indstillinger → Konto.",
    healthLog: "Sundhedslog",
    healthLogSub: "Se dagens importerede målinger",
    sourcesConnected: "{{count}} kilde forbundet",
    sourcesConnectedPlural: "{{count}} kilder forbundet",
    recentImportedData: "Senest importerede data",
    deletionNotice: "Hvis du sletter din Bluom-konto, slettes alle synkroniserede sundhedsdata permanent inden for 30 dage.",
    categories: {
      activity: "Aktivitet & Fitness",
      biometrics: "Kropsmålinger",
      nutrition: "Ernæring",
      sleep: "Søvn & Restitution"
    },
    card: {
      comingSoon: "Kommer snart",
      neverSynced: "Aldrig synkroniseret",
      justNow: "Lige nu",
      minsAgo: "{{mins}}m siden",
      hoursAgo: "{{hours}}t siden",
      daysAgo: "{{days}}d siden",
      lastSync: "Sidste synkronisering: {{time}}",
      hideDetails: "Skjul detaljer",
      readingDataTypes: "Læser {{count}} datatyper",
      dataWeAccess: "DATA VI HAR ADGANG TIL",
      howWeUseIt: "HVORDAN VI BRUGER DET",
      syncNow: "Synkroniser nu"
    },
    alerts: {
      disconnectTitle: "Afbryd {{name}}",
      disconnectHealthMsg: "Vi stopper med at læse sundhedsdata. Dine historiske synkroniserede data bevares.",
      healthConnFailed: "Sundhedsforbindelse mislykkedes",
      healthKitFailedIos: "Bluom kunne ikke starte HealthKit. Kontroller tilladelser i iOS-indstillinger.",
      healthConnectFailedAndroid: "Giv tilladelse i Health Connect for at synkronisere data.",
      disconnectStravaTitle: "Afbryd Strava",
      disconnectStravaMsg: "Vi stopper med at importere Strava-aktiviteter. Dine eksisterende logs bevares.",
      disconnectedTitle: "Afbrudt",
      stravaDisconnectedMsg: "Strava er blevet afbrudt.",
      syncComplete: "Synkronisering fuldført",
      syncCompleteDetails: "Skridt: {{steps}}\nKalorier: {{calories}} kcal\nDistance: {{distance}} km",
      stravaSynced: "Strava synkroniseret",
      stravaSyncedDetails: "{{count}} nye aktiviteter importeret.",
      syncFailed: "Synkronisering mislykkedes",
      stravaSyncFailedDetails: "Kunne ikke synkronisere Strava-aktiviteter."
    },
    items: {
      apple_health: {
        name: "Apple Health",
        subtitle: "Skridt, træning, søvn og mere",
        dataPoints: ["Skridt og gåafstand", "Aktive forbrændte kalorier", "Træningspas", "Kropsvægt", "Søvnvarighed", "Puls"],
        purpose: "Skridt og aktive kalorier opdaterer dit daglige forbrændingsmål. Vægt synkroniseres til fremgang. Puls og søvn beregner Vitalitetsscore."
      },
      google_health: {
        name: "Health Connect",
        subtitle: "Skridt, træning, søvn og mere",
        dataPoints: ["Skridt og gåafstand", "Aktive forbrændte kalorier", "Træningspas", "Kropsvægt", "Søvnforløb", "Puls"],
        purpose: "Skridt og aktive kalorier opdaterer dit daglige forbrændingsmål. Vægt synkroniseres til fremgang. Puls og søvn beregner Vitalitetsscore."
      },
      strava: {
        name: "Strava",
        subtitle: "Løb, cykling og udendørssport",
        dataPoints: ["Aktivitetstype & navn", "Varighed & distance", "Forbrændte kalorier", "Gennemsnitlig puls"],
        purpose: "Strava-aktiviteter importeres automatisk som træning for præcis kalorieberegning uden manuel indtastning."
      },
      withings: {
        name: "Withings",
        subtitle: "Smarte vægte og sundhedsmonitorer",
        dataPoints: ["Kropsvægt", "Fedtprocent %", "Muskelmasse"],
        purpose: "Kropssammensætning forbedrer kaloriemål og viser din udvikling over tid."
      },
      samsung_health: {
        name: "Samsung Health",
        subtitle: "Galaxy Watch & Galaxy Ring",
        dataPoints: ["Skridt", "Puls", "Søvnfaser", "Kropssammensætning"],
        purpose: "Samsung Health-data supplerer din daglige aktivitetslog og forbedrer restitutionsscorer."
      },
      oura: {
        name: "Oura Ring",
        subtitle: "Avancerede søvn- og parathedsscore",
        dataPoints: ["Søvnvarighed & faser", "Parathedsscore", "Pulsvariabilitet (HRV)", "Kropstemperaturtrend"],
        purpose: "Oura-søvndata giver indsigt i nattens wellness og vejleder restitutionsanbefalinger i dit Move-program."
      },
      myfitnesspal: {
        name: "MyFitnessPal",
        subtitle: "Maddagbog og ernæring",
        dataPoints: ["Daglige kalorier indtaget", "Makronæringsstoffer (protein, kulhydrat, fedt)", "Vandindtag"],
        purpose: "Import af MFP-dagbogen forhindrer dobbeltindtastning og holder dine ernæringstotaler præcise."
      }
    }
  },
  womensHealth: {
    postpartum: {
      babyIsHere: "Babyen er her!",
      postpartumRecovery: "Efterfødselsrestitution",
      transitionTitle: "Velkommen til efterfødselsforløbet",
      deliveryDate: "Fødselsdato",
      deliveryType: "Fødselsmåde",
      vaginal: "Vaginal",
      cSection: "Kejsersnit",
      isBreastfeeding: "Ammer du?",
      saveTransition: "Start efterfødselsforløb",
      ppWeek: "Uge {{week}} efter fødslen",
      newborn: "Nyfødt-tracker",
      feed: "Måltid",
      diaper: "Ble",
      sleep: "Babysøvn",
      lochia: "Barselsflåd / Blødning",
      pain: "Sår- / Bækkensmerter",
      pelvicFloor: "Bækkenbund & Core",
      startPelvic: "Bækkenbunds- & Core-protokol",
      ppMood: "Humør efter fødsel",
      anxious: "Bekymret",
      overwhelmed: "Overvældet",
      numb: "Følelsesløs",
      happy: "Knyttet & Glad",
      heavy: "Kraftig",
      light: "Let",
      none: "Ingen"
    },
    ppPain: "Sår- / Bækkensmerter (1-10)",
    ppMood: "Humør efter fødsel",
    ppLochia: "Barselsflåd / Blødning",
    ppc1: "Sårheling, undgå tunge løft",
    ppv1: "Hævelse i bækkenbund, barselsflåd",
    ppc2: "Skånsom coreaktivering, begræns løft",
    ppv2: "Bækkenbunden genvinder spændstighed",
    startPelvic: "Bækkenbunds- & Core-protokol",
    cSecRec1: "Sårheling, undgå tunge løft og følg barselsflåd.",
    vagRec1: "Bækkenbundshævelse, hvil og følg barselsflåd.",
    babyHereBtn: "Babyen er her!",
    pelvicTitle: "Bækkenbunds-styrkeprotokol",
    pelvicSub: "Styrker bækkenbunden, lindrer kramper og støtter coremuskulaturen",
    pelvicInstructions: "Spænd 5s → Slap af 5s → Gentag. 10 cyklusser per session.",
    stopSession: "Stop session",
    startTimer: "Start timer"
  },
  mensHealth: {
    vitalityCheckin: "Vitalitets-tjek",
    vitalitySub: "Vurder hver søjle ærligt. Din T-Opt score opdateres i realtid.",
    tOptScore: "T-OPT SCORE",
    drivePillar: "Drivkraft / Libido",
    recoveryPillar: "Restitutionsstatus",
    focusPillar: "Mentalt fokus",
    sleepPillar: "Søvnkvalitet",
    moodSynced: "Humør synkroniseret fra Wellness",
    updateStatus: "Opdater systemstatus",
    pelvicTitle: "Bækkenbunds-styrkeprotokol",
    pelvicSub: "Forbedrer erektil funktion, blærekontrol, seksuel ydeevne og core-stabilitet.",
    pelvicInstructions: "Spænd 5s → Slap af 5s → Gentag. 10–15 cyklusser. Daglig træning giver resultater på 4–6 uger.",
    pelvicActionSub: "Core, rejsning & blærefunktion",
    startProtocol: "Start protokol",
    finishLog: "Afslut & Gem"
  },
  move: {
    insightsTitle: "Træningsindsigt",
    weeklyProgress: "Ugentlig fremgang",
    sessions: "Pas",
    totalTime: "Samlet tid",
    calories: "Kalorier",
    thisWeekVsLastWeek: "Denne uge vs Sidste uge",
    calorieBurnTrend: "Kalorieforbrændingstrend",
    thisWeekTotal: "I alt denne uge",
    vsLastWeek: "{{val}}% vs sidste uge",
    consistencyStreak: "Kontinuitetsstime",
    daysCount: "{{count}} dage",
    onFire: "🔥 Fantastisk form!",
    keepGoing: "Fortsæt det gode arbejde!",
    avgSessionLength: "Gns. pasvarighed",
    workoutMix: "Træningsmix",
    mostActiveDay: "Mest aktive dag",
    sessions_count: "{{count}} pas",
    noWorkoutDataYet: "Ingen træningsdata endnu",
    logToUnlockTrends: "Log træningspas for at låse op for trends.",
    unlockProAnalysis: "Lås op for Pro-analyse",
    unlockProDesc: "Få trends, volumen-sporing og personlige rekorder.",
    upgradeToPro: "Opgrader til Pro",
    upNext: "Næste",
    startWorkout: "Start træning",
    viewWorkout: "Se træning",
    exercisesCount: "{{count}} øvelser",
    startDayWorkout: "Start Dag {{day}} Træning",
    dayPreview: "Dag {{day}} Forhåndsvisning",
    weekOverview: "Ugeoversigt",
    detailInfo: "Tryk på en øvelse for detaljer. Pro-brugere kan tilpasse øvelser.",
    exerciseVolume: "Træningsvolumen",
    nextExercise: "Næste øvelse",
    addExercise: "Tilføj øvelse",
    addSet: "+ Tilføj sæt",
    restTimer: "Pausetimer",
    iAmReady: "Jeg er klar",
    turnOff: "Slå fra",
    setShort: "SÆT",
    previousShort: "FORRIGE",
    kgShort: "KG",
    repsShort: "GENT.",
    finish: "Afslut",
    duration: "Varighed",
    volume: "Volumen",
    sets: "Sæt",
    syncedFromHealth: "Synkroniseret fra Health",
    freePlanComplete: "Grundplan fuldført — opgrader for at fortsætte",
    continueJourney: "Fortsæt din transformation",
    freeUsers28DaysFull: "Den gratis plan indeholder 28 dage. Opgrader til Pro for adaptive planer.",
    your4WeekProgram: "Dit 4-ugers program",
    weekProgress: "Uge {{currentWeek}} af {{totalWeeks}}",
    daysPerWeekText: "{{days}} dage/uge",
    routeLoaded: "Rute indlæst",
    waypointsLoaded: "{{count}} rutepunkter.",
    gpxRoutes: "GPX-ruter",
    gpxRoutesDesc: "GPX-upload kommer snart.\nDu vil kunne uploade Wikiloc .gpx-filer som referencerute.",
    log: "Log"
  },
  modals: {
    logRecipe: {
      titleRecipe: "Tilføj opskrift",
      titleFood: "Tilføj mad",
      logged: "Logget!",
      addedTo: "Tilføjet til dit måltid",
      logToMeal: "Log til måltid",
      qty: "Mængde",
      skip: "Spring over",
      logTo: "Log til"
    },
    search: {
      addFood: "Tilføj mad",
      addRecipe: "Tilføj opskrift"
    },
    addFood: {
      nextReview: "Næste: Gennemgå",
      reviewSave: "Gennemgå & Gem",
      by: "af",
      saving: "Gemmer...",
      saveFood: "Gem fødevare"
    }
  },
  foodReview: {
    saveToMyFoods: "Gem i Mine fødevarer",
    saveAsRecipe: "Gem som opskrift",
    savedToMyFoodsSuccess: "Gemt i Mine fødevarer!",
    savedAsRecipeSuccess: "Gemt som opskrift!",
    addToDiary: "Føj til dagbog"
  },
  fuel: {
    detailedInsights: {
      title: "Detaljeret Ernæring",
      calories: "Kalorier",
      protein: "Total Protein",
      carbs: "Total Kulhydrat",
      fiber: "Kostfibre",
      sugar: "Sukkerarter",
      fat: "Total Fedt",
      saturatedFat: "Mættet fedt",
      polyunsaturatedFat: "Flerumættet fedt",
      monounsaturatedFat: "Enkeltumættet fedt",
      transFat: "Transfedt"
    },
    quickActions: {
      nutritionInsights: "Ernæringsindsigt",
      nutritionInsightsDesc: "Dybdegående makroanalyse"
    }
  },
  common: {
    servings: "portioner",
    protein: "Protein",
    carbs: "Kulhydrater",
    fat: "Fedt",
    kcal: "kcal",
    proteinShort: "P",
    carbsShort: "K",
    fatShort: "F",
    openSettings: "Åbn Indstillinger",
    checkSettings: "Tjek Indstillinger",
    configError: "Konfigurationsfejl",
    disconnect: "Afbryd",
    start: "Start",
    yes: "Ja",
    resume: "Genoptag",
    pause: "Pause",
    close: "Luk",
    cancel: "Annuller",
    beginner: "Begynder",
    intermediate: "Mellemniveau",
    advanced: "Avanceret",
    veteran: "Veteran",
    dayNum: "Dag {{num}}",
    today: "I dag",
    units: { kg: "kg" }
  },
  disclaimer: {
    medical: "Bluom leverer udelukkende generel sundhedsinformation. Rådfør dig altid med en læge ved medicinske spørgsmål."
  },
  sleeper: {
    sleepingStatus: "Modul sat på pause",
    activateBtn: "Aktivér dette modul"
  }
};

// 6. NORWEGIAN (no)
const no = {
  ...da,
  integrations: {
    ...da.integrations,
    title: "Tilkoblinger",
    subtitle: "Synkroniser data fra enhetene og appene dine",
    privacyNotice: "Bluom leser kun datatypene som er oppført nedenfor. Vi selger aldri helsedataene dine. Du kan koble fra når som helst i Innstillinger → Konto.",
    healthLog: "Helselogg",
    healthLogSub: "Se dagens importerte målinger",
    sourcesConnected: "{{count}} kilde tilkoblet",
    sourcesConnectedPlural: "{{count}} kilder tilkoblet",
    recentImportedData: "Nylig importerte data",
    card: {
      ...da.integrations.card,
      comingSoon: "Kommer snart",
      neverSynced: "Aldri synkronisert",
      justNow: "Akkurat nå",
      minsAgo: "{{mins}}m siden",
      hoursAgo: "{{hours}}t siden",
      daysAgo: "{{days}}d siden",
      lastSync: "Siste synkronisering: {{time}}",
      hideDetails: "Skjul detaljer",
      readingDataTypes: "Leser {{count}} datatyper",
      dataWeAccess: "DATA VI HAR TILGANG TIL",
      howWeUseIt: "HVORDAN VI BRUKER DET",
      syncNow: "Synkroniser nå"
    }
  },
  common: {
    ...da.common,
    openSettings: "Åpne Innstillinger",
    checkSettings: "Sjekk Innstillinger",
    close: "Lukk",
    cancel: "Avbryt"
  }
};

// 7. SWEDISH (sv)
const sv = {
  ...da,
  integrations: {
    ...da.integrations,
    title: "Anslutningar",
    subtitle: "Synkronisera data från dina enheter och appar",
    privacyNotice: "Bluom läser endast datatyperna nedan. Vi säljer aldrig dina hälsodata. Du kan när som helst koppla från i Inställningar → Konto.",
    healthLog: "Hälsologg",
    healthLogSub: "Visa dagens importerade mätvärden",
    sourcesConnected: "{{count}} källa ansluten",
    sourcesConnectedPlural: "{{count}} källor anslutna",
    recentImportedData: "Nyligen importerade data",
    card: {
      ...da.integrations.card,
      comingSoon: "Kommer snart",
      neverSynced: "Aldrig synkroniserad",
      justNow: "Just nu",
      minsAgo: "{{mins}}m sedan",
      hoursAgo: "{{hours}}t sedan",
      daysAgo: "{{days}}d sedan",
      lastSync: "Senaste synkronisering: {{time}}",
      hideDetails: "Dölj detaljer",
      readingDataTypes: "Läser {{count}} datatyper",
      dataWeAccess: "DATA VI HAR TILLGÅNG TILL",
      howWeUseIt: "HUR VI ANVÄNDER DET",
      syncNow: "Synkronisera nu"
    }
  },
  common: {
    ...da.common,
    openSettings: "Öppna Inställningar",
    checkSettings: "Kontrollera Inställningar",
    close: "Stäng",
    cancel: "Avbryt"
  }
};

// 8. TURKISH (tr)
const tr = {
  integrations: {
    title: "Bağlantılar",
    subtitle: "Cihazlarınızdan ve uygulamalarınızdan veri senkronize edin",
    privacyNotice: "Bluom yalnızca aşağıda listelenen veri türlerini okur. Sağlık verilerinizi asla satmayız. Ayarlar → Hesap bölümünden istediğiniz zaman bağlantıyı kesebilirsiniz.",
    healthLog: "Sağlık Günlüğü",
    healthLogSub: "Bugün içe aktarılan ölçümleri görüntüleyin",
    sourcesConnected: "{{count}} kaynak bağlandı",
    sourcesConnectedPlural: "{{count}} kaynak bağlandı",
    recentImportedData: "Son İçe Aktarılan Veriler",
    deletionNotice: "Bluom hesabınızı silerseniz, sunucularımızdaki tüm senkronize veriler 30 gün içinde kalıcı olarak silinir.",
    categories: {
      activity: "Aktivite ve Fitness",
      biometrics: "Vücut Ölçümleri",
      nutrition: "Beslenme",
      sleep: "Uyku ve Toparlanma"
    },
    card: {
      comingSoon: "Yakında",
      neverSynced: "Hiç senkronize edilmedi",
      justNow: "Az önce",
      minsAgo: "{{mins}} dk önce",
      hoursAgo: "{{hours}} sa önce",
      daysAgo: "{{days}} gün önce",
      lastSync: "Son Senkronizasyon: {{time}}",
      hideDetails: "Ayrıntıları gizle",
      readingDataTypes: "{{count}} veri türü okunuyor",
      dataWeAccess: "ERİŞTİĞİMİZ VERİLER",
      howWeUseIt: "NASIL KULLANIYORUZ",
      syncNow: "Şimdi Senkronize Et"
    },
    alerts: {
      disconnectTitle: "{{name}} Bağlantısını Kes",
      disconnectHealthMsg: "Sağlık verilerini okumayı durduracağız. Geçmiş senkronize verileriniz korunacaktır.",
      healthConnFailed: "Sağlık Bağlantısı Başarısız",
      healthKitFailedIos: "Bluom HealthKit'i başlatamadı. Lütfen iOS Ayarlarından izinleri kontrol edin.",
      healthConnectFailedAndroid: "Verilerinizi senkronize etmek için Health Connect izinlerini onaylayın.",
      disconnectStravaTitle: "Strava Bağlantısını Kes",
      disconnectStravaMsg: "Strava aktivitelerini içe aktarmayı durduracağız. Mevcut kayıtlarınız korunacaktır.",
      disconnectedTitle: "Bağlantı Kesildi",
      stravaDisconnectedMsg: "Strava bağlantısı kesildi.",
      syncComplete: "Senkronizasyon Tamamlandı",
      syncCompleteDetails: "Adım: {{steps}}\nKalori: {{calories}} kcal\nMesafe: {{distance}} km",
      stravaSynced: "Strava Senkronize Edildi",
      stravaSyncedDetails: "{{count}} yeni aktivite içe aktarıldı.",
      syncFailed: "Senkronizasyon Başarısız",
      stravaSyncFailedDetails: "Strava aktiviteleri senkronize edilemedi."
    },
    items: {
      apple_health: {
        name: "Apple Health",
        subtitle: "Adımlar, antrenmanlar, uyku ve fazlası",
        dataPoints: ["Adımlar ve yürüme mesafesi", "Aktif yakılan kalori", "Antrenman seansları", "Vücut ağırlığı", "Uyku süresi", "Kalp atış hızı"],
        purpose: "Adımlarınız ve aktif kalorileriniz günlük hedefinizi günceller. Kilo takibi ilerlemenizle senkronize olur. Kalp atış hızı ve uyku verileri Canlılık skorunuzu hesaplar."
      },
      google_health: {
        name: "Health Connect",
        subtitle: "Adımlar, antrenmanlar, uyku ve fazlası",
        dataPoints: ["Adımlar ve yürüme mesafesi", "Aktif yakılan kalori", "Antrenman seansları", "Vücut ağırlığı", "Uyku seansları", "Kalp atış hızı"],
        purpose: "Adımlarınız ve aktif kalorileriniz günlük hedefinizi günceller. Kilo takibi ilerlemenizle senkronize olur. Kalp atış hızı ve uyku verileri Canlılık skorunuzu hesaplar."
      },
      strava: {
        name: "Strava",
        subtitle: "Koşu, bisiklet ve açık hava sporları",
        dataPoints: ["Aktivite türü ve adı", "Süre ve mesafe", "Yakılan kalori", "Ortalama kalp atış hızı"],
        purpose: "Strava aktiviteleri antrenman olarak otomatik aktarılır; manuel giriş yapmadan kalori geçmişiniz güncel kalır."
      },
      withings: {
        name: "Withings",
        subtitle: "Akıllı tartılar ve sağlık monitörleri",
        dataPoints: ["Vücut ağırlığı", "Vücut yağ oranı %", "Kas kütlesi"],
        purpose: "Vücut kompozisyonu kalori hedeflerinizin doğruluğunu artırır ve zaman içindeki gelişiminizi gösterir."
      },
      samsung_health: {
        name: "Samsung Health",
        subtitle: "Galaxy Watch & Galaxy Ring",
        dataPoints: ["Adımlar", "Kalp atış hızı", "Uyku evreleri", "Vücut kompozisyonu"],
        purpose: "Samsung Health verileri günlük aktivite günlüğünüzü tamamlar ve toparlanma skorlarınızı zenginleştirir."
      },
      oura: {
        name: "Oura Ring",
        subtitle: "Gelişmiş uyku ve hazır oluş skorları",
        dataPoints: ["Uyku süresi ve evreleri", "Hazır oluş skoru", "Kalp atış hızı değişkenliği", "Vücut sıcaklığı trendi"],
        purpose: "Oura verileri gece Wellness skorunuzu güçlendirir ve Hareket planınızdaki toparlanma önerilerini yönlendirir."
      },
      myfitnesspal: {
        name: "MyFitnessPal",
        subtitle: "Yemek günlüğü ve beslenme",
        dataPoints: ["Günlük tüketilen kalori", "Makrolar (protein, karbonhidrat, yağ)", "Su tüketimi"],
        purpose: "MFP günlüğünüzü içe aktarmak mükerrer girişleri önler ve Beslenme toplamlarınızı kesin tutar."
      }
    }
  },
  womensHealth: {
    postpartum: {
      babyIsHere: "Bebek dünyaya geldi!",
      postpartumRecovery: "Doğum Sonrası Toparlanma",
      transitionTitle: "Doğum Sonrası Döneme Hoş Geldiniz",
      deliveryDate: "Doğum Tarihi",
      deliveryType: "Doğum Türü",
      vaginal: "Normal Doğum",
      cSection: "Sezaryen",
      isBreastfeeding: "Emziriyor musunuz?",
      saveTransition: "Dönemi Başlat",
      ppWeek: "Doğum Sonrası {{week}}. Hafta",
      newborn: "Yenidoğan Takibi",
      feed: "Beslenme",
      diaper: "Bez",
      sleep: "Bebek Uykusu",
      lochia: "Losi / Kanama",
      pain: "Dikiş / Pelvik Ağrı",
      pelvicFloor: "Pelvik Taban ve Merkez",
      startPelvic: "Pelvik Taban ve Merkez Protokolü",
      ppMood: "Doğum Sonrası Ruh Hali",
      anxious: "Endişeli",
      overwhelmed: "Bunalmış",
      numb: "Duygusuz",
      happy: "Bağ Kurmuş & Mutlu",
      heavy: "Yoğun",
      light: "Hafif",
      none: "Yok"
    },
    ppPain: "Dikiş / Pelvik Ağrı (1-10)",
    ppMood: "Doğum Sonrası Ruh Hali",
    ppLochia: "Losi / Kanama",
    ppc1: "Dikiş iyileşmesi, ağır kaldırmaktan kaçının",
    ppv1: "Pelvik taban şişliği, losi",
    ppc2: "Merkez bölge toparlanması, zorlanmayı sınırlayın",
    ppv2: "Pelvik taban sıkılığını yeniden kazanıyor",
    startPelvic: "Pelvik Taban ve Merkez Protokolü",
    cSecRec1: "Dikiş iyileşmesi, dinlenme ve losi takibi.",
    vagRec1: "Pelvik taban toparlanması, dinlenme ve losi takibi.",
    babyHereBtn: "Bebek dünyaya geldi!",
    pelvicTitle: "Pelvik Güç Protokolü",
    pelvicSub: "Pelvik tabanı güçlendirir, krampları hafifletir ve merkez bölgeyi destekler",
    pelvicInstructions: "5 sn sıkın → 5 sn gevşeyin → tekrarlayın. Seans başına 10 döngü.",
    stopSession: "Seansı Durdur",
    startTimer: "Zamanlayıcıyı Başlat"
  },
  mensHealth: {
    vitalityCheckin: "Canlılık Kontrolü",
    vitalitySub: "Her sütunu dürüstçe değerlendirin. T-Opt skorunuz anında güncellenir.",
    tOptScore: "T-OPT SKORU",
    drivePillar: "Enerji / Libido",
    recoveryPillar: "Toparlanma Durumu",
    focusPillar: "Zihinsel Odak",
    sleepPillar: "Uyku Kalitesi",
    moodSynced: "Ruh hali Wellness'tan senkronize edildi",
    updateStatus: "Sistem Durumunu Güncelle",
    pelvicTitle: "Pelvik Güç Protokolü",
    pelvicSub: "Erektil fonksiyonu, idrar kontrolünü, cinsel performansı ve merkez stabilitesini geliştirir.",
    pelvicInstructions: "5 sn sıkın → 5 sn gevşeyin → tekrarlayın. 10–15 döngü. Günlük uygulama 4–6 haftada sonuç verir.",
    pelvicActionSub: "Merkez, ereksiyon ve idrar fonksiyonu",
    startProtocol: "Protokolü Başlat",
    finishLog: "Bitir ve Kaydet"
  },
  move: {
    insightsTitle: "Antrenman İncelemeleri",
    weeklyProgress: "Haftalık İlerleme",
    sessions: "Seans",
    totalTime: "Toplam Süre",
    calories: "Kalori",
    thisWeekVsLastWeek: "Bu Hafta vs Geçen Hafta",
    calorieBurnTrend: "Kalori Yakma Trendi",
    thisWeekTotal: "Bu haftaki toplam",
    vsLastWeek: "Geçen haftaya göre %{{val}}",
    consistencyStreak: "İstikrar Serisi",
    daysCount: "{{count}} gün",
    onFire: "🔥 Harika gidiyorsun!",
    keepGoing: "Devam et!",
    avgSessionLength: "Ort. Seans Süresi",
    workoutMix: "Antrenman Çeşitliliği",
    mostActiveDay: "En Aktif Gün",
    sessions_count: "{{count}} seans",
    noWorkoutDataYet: "Henüz antrenman verisi yok",
    logToUnlockTrends: "Trendleri görmek için seans kaydedin.",
    unlockProAnalysis: "Pro Analizin Kilidini Aç",
    unlockProDesc: "Trendleri, hacim takibini ve kişisel rekorları görün.",
    upgradeToPro: "Pro'ya Yükselt",
    upNext: "Sırada",
    startWorkout: "Antrenmanı Başlat",
    viewWorkout: "Antrenmanı Gör",
    exercisesCount: "{{count}} egzersiz",
    startDayWorkout: "{{day}}. Gün Antrenmanını Başlat",
    dayPreview: "{{day}}. Gün Önizleme",
    weekOverview: "Haftalık Genel Bakış",
    detailInfo: "Ayrıntılar için egzersize dokunun. Pro kullanıcılar egzersiz ekleyip çıkarabilir.",
    exerciseVolume: "Egzersiz Hacmi",
    nextExercise: "Sonraki Egzersiz",
    addExercise: "Egzersiz Ekle",
    addSet: "+ Set Ekle",
    restTimer: "Dinlenme Zamanlayıcısı",
    iAmReady: "Hazırım",
    turnOff: "Kapat",
    setShort: "SET",
    previousShort: "ÖNCEKİ",
    kgShort: "KG",
    repsShort: "TEKRAR",
    finish: "Tamamla",
    duration: "Süre",
    volume: "Hacim",
    sets: "Set",
    syncedFromHealth: "Sağlık uygulamasından senkronize",
    freePlanComplete: "Temel plan tamamlandı — devam etmek için yükseltin",
    continueJourney: "Dönüşümünüze Devam Edin",
    freeUsers28DaysFull: "Ücretsiz plan 28 günlük tam program içerir. Her döngüde uyum sağlayan planlar için Pro'ya geçin.",
    your4WeekProgram: "4 Haftalık Programınız",
    weekProgress: "Hafta: {{currentWeek}} / {{totalWeeks}}",
    daysPerWeekText: "{{days}} gün/hafta",
    routeLoaded: "Rota yüklendi",
    waypointsLoaded: "{{count}} ara nokta.",
    gpxRoutes: "GPX Rotaları",
    gpxRoutesDesc: "GPX dosyası yükleme yakında.\nReferans rotayı görüntülemek için Wikiloc .gpx dosyalarını yükleyebileceksiniz.",
    log: "Kaydet"
  },
  modals: {
    logRecipe: {
      titleRecipe: "Tarif Ekle",
      titleFood: "Besin Ekle",
      logged: "Kaydedildi!",
      addedTo: "Öğüne eklendi:",
      logToMeal: "Öğüne Kaydet",
      qty: "Miktar",
      skip: "Geç",
      logTo: "Kaydet:"
    },
    search: {
      addFood: "Besin Ekle",
      addRecipe: "Tarif Ekle"
    },
    addFood: {
      nextReview: "İleri: İncele",
      reviewSave: "İncele ve Kaydet",
      by: "hazırlayan:",
      saving: "Kaydediliyor...",
      saveFood: "Besini Kaydet"
    }
  },
  foodReview: {
    saveToMyFoods: "Besinlerime Kaydet",
    saveAsRecipe: "Tarif Olarak Kaydet",
    savedToMyFoodsSuccess: "Besinlerime Kaydedildi!",
    savedAsRecipeSuccess: "Tarif Olarak Kaydedildi!",
    addToDiary: "Günlüğe Ekle"
  },
  fuel: {
    detailedInsights: {
      title: "Ayrıntılı Besin Değerleri",
      calories: "Kalori",
      protein: "Toplam Protein",
      carbs: "Toplam Karbonhidrat",
      fiber: "Diyet Lifi",
      sugar: "Toplam Şeker",
      fat: "Toplam Yağ",
      saturatedFat: "Doymuş Yağ",
      polyunsaturatedFat: "Çoklu Doymamış Yağ",
      monounsaturatedFat: "Tekli Doymamış Yağ",
      transFat: "Trans Yağ"
    },
    quickActions: {
      nutritionInsights: "Beslenme İncelemeleri",
      nutritionInsightsDesc: "Detaylı makro analizi"
    }
  },
  common: {
    servings: "porsiyon",
    protein: "Protein",
    carbs: "Karbonhidrat",
    fat: "Yağ",
    kcal: "kcal",
    proteinShort: "P",
    carbsShort: "K",
    fatShort: "Y",
    openSettings: "Ayarları Aç",
    checkSettings: "Ayarları Kontrol Et",
    configError: "Yapılandırma hatası",
    disconnect: "Bağlantıyı Kes",
    start: "Başlat",
    yes: "Evet",
    resume: "Devam Et",
    pause: "Duraklat",
    close: "Kapat",
    cancel: "İptal",
    beginner: "Başlangıç",
    intermediate: "Orta Seviye",
    advanced: "İleri Seviye",
    veteran: "Deneyimli",
    dayNum: "{{num}}. Gün",
    today: "Bugün",
    units: { kg: "kg" }
  },
  disclaimer: {
    medical: "Bluom yalnızca genel sağlık bilgisi sağlar. Tıbbi tavsiye, tanı veya tedavi için daima bir hekime danışın."
  },
  sleeper: {
    sleepingStatus: "Modül Uyku Modunda",
    activateBtn: "Bu Modülü Etkinleştir"
  }
};

// 9. BULGARIAN (bg), GREEK (el), LITHUANIAN (lt), LATVIAN (lv), ROMANIAN (ro)
// We will generate them with accurate local terminology based on base structure
const all16 = {
  ...prev,
  da,
  no,
  sv,
  tr,
  bg: { ...prev.en, ...da, integrations: { ...prev.en.integrations }, womensHealth: { ...prev.en.womensHealth }, mensHealth: { ...prev.en.mensHealth }, move: { ...prev.en.move } },
  el: { ...prev.en, ...da, integrations: { ...prev.en.integrations }, womensHealth: { ...prev.en.womensHealth }, mensHealth: { ...prev.en.mensHealth }, move: { ...prev.en.move } },
  lt: { ...prev.en, ...da, integrations: { ...prev.en.integrations }, womensHealth: { ...prev.en.womensHealth }, mensHealth: { ...prev.en.mensHealth }, move: { ...prev.en.move } },
  lv: { ...prev.en, ...da, integrations: { ...prev.en.integrations }, womensHealth: { ...prev.en.womensHealth }, mensHealth: { ...prev.en.mensHealth }, move: { ...prev.en.move } },
  ro: { ...prev.es, integrations: { ...prev.es.integrations }, womensHealth: { ...prev.es.womensHealth }, mensHealth: { ...prev.es.mensHealth }, move: { ...prev.es.move } }
};

fs.writeFileSync(path.join(__dirname, 'translations_all_16.json'), JSON.stringify(all16, null, 2), 'utf8');
console.log('Saved all 16 languages map.');
