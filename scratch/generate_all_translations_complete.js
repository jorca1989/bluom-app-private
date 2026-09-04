const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../locales');

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const baseEn = JSON.parse(fs.readFileSync(path.join(__dirname, 'translations_data.json'), 'utf8')).en;

// Load specific language maps
const translations = {
  en: baseEn,
  pt: {
    integrations: {
      title: "Conexões",
      subtitle: "Sincroniza dados dos teus dispositivos e apps",
      privacyNotice: "O Bluom só lê os tipos de dados listados abaixo. Nunca vendemos os teus dados de saúde. Podes desligar a qualquer momento e solicitar a eliminação total em Definições → Conta.",
      healthLog: "Registo de Saúde",
      healthLogSub: "Vê as métricas importadas hoje",
      sourcesConnected: "{{count}} fonte ligada",
      sourcesConnectedPlural: "{{count}} fontes ligadas",
      recentImportedData: "Dados Importados Recentes",
      deletionNotice: "Se eliminares a tua conta Bluom, todos os dados de saúde sincronizados guardados nos nossos servidores são eliminados permanentemente em 30 dias. Os dados no dispositivo geridos pelo Apple Health ou Google Health Connect não são afetados.",
      categories: {
        activity: "Atividade e Fitness",
        biometrics: "Métricas Corporais",
        nutrition: "Nutrição",
        sleep: "Sono e Recuperação"
      },
      card: {
        comingSoon: "Em breve",
        neverSynced: "Nunca sincronizado",
        justNow: "Agora mesmo",
        minsAgo: "há {{mins}}m",
        hoursAgo: "há {{hours}}h",
        daysAgo: "há {{days}}d",
        lastSync: "Última Sincronização: {{time}}",
        hideDetails: "Ocultar detalhes",
        readingDataTypes: "A ler {{count}} tipos de dados",
        dataWeAccess: "DADOS QUE ACEDEMOS",
        howWeUseIt: "COMO UTILIZAMOS",
        syncNow: "Sincronizar Agora"
      },
      alerts: {
        disconnectTitle: "Desligar {{name}}",
        disconnectHealthMsg: "Deixaremos de ler os dados de saúde. Os teus dados históricos sincronizados serão mantidos.",
        healthConnFailed: "Falha na Ligação de Saúde",
        healthKitFailedIos: "O Bluom não conseguiu inicializar o HealthKit. Verifica se concedeste as permissões necessárias nas Definições do iOS.",
        healthConnectFailedAndroid: "Concede permissões no Health Connect para sincronizar os teus dados.",
        disconnectStravaTitle: "Desligar Strava",
        disconnectStravaMsg: "Deixaremos de importar atividades do Strava. Os teus registos existentes serão mantidos.",
        disconnectedTitle: "Desligado",
        stravaDisconnectedMsg: "O Strava foi desligado.",
        syncComplete: "Sincronização Concluída",
        syncCompleteDetails: "Passos: {{steps}}\nCalorias: {{calories}} kcal\nDistância: {{distance}} km",
        stravaSynced: "Strava Sincronizado",
        stravaSyncedDetails: "{{count}} novas atividades importadas.",
        syncFailed: "Falha na Sincronização",
        stravaSyncFailedDetails: "Não foi possível sincronizar as atividades do Strava."
      },
      items: {
        apple_health: {
          name: "Apple Health",
          subtitle: "Passos, treinos, sono e mais",
          dataPoints: ["Passos e distância percorrida", "Calorias ativas queimadas", "Sessões de treino", "Peso corporal", "Duração do sono", "Frequência cardíaca"],
          purpose: "O número de passos e as calorias ativas atualizam a tua meta de queima diária. O peso sincroniza com o registo de progresso. Os batimentos e sono calculam os scores de Vitalidade e otimizam os protocolos de Saúde Masculina e Feminina."
        },
        google_health: {
          name: "Health Connect",
          subtitle: "Passos, treinos, sono e mais",
          dataPoints: ["Passos e distância percorrida", "Calorias ativas queimadas", "Sessões de treino", "Peso corporal", "Sessões de sono", "Frequência cardíaca"],
          purpose: "O número de passos e as calorias ativas atualizam a tua meta de queima diária. O peso sincroniza com o registo de progresso. O ritmo cardíaco e sono calculam a tua pontuação de Vitalidade."
        },
        strava: {
          name: "Strava",
          subtitle: "Corrida, ciclismo e desportos ao ar livre",
          dataPoints: ["Tipo e nome da atividade", "Duração e distância", "Calorias queimadas", "Frequência cardíaca média"],
          purpose: "As atividades do Strava são importadas automaticamente como treinos para manter o histórico e gasto calórico precisos sem registo manual."
        },
        withings: {
          name: "Withings",
          subtitle: "Balanças inteligentes e monitores de saúde",
          dataPoints: ["Peso corporal", "% Gordura corporal", "Massa muscular"],
          purpose: "A composição corporal melhora a precisão das tuas metas calóricas e mostra a tua evolução ao longo do tempo."
        },
        samsung_health: {
          name: "Samsung Health",
          subtitle: "Galaxy Watch e Galaxy Ring",
          dataPoints: ["Passos", "Frequência cardíaca", "Fases do sono", "Composição corporal"],
          purpose: "Os dados do Samsung Health preenchem o teu registo de atividade diário e enriquecem os scores de sono e recuperação."
        },
        oura: {
          name: "Oura Ring",
          subtitle: "Métricas avançadas de sono e prontidão",
          dataPoints: ["Duração e fases do sono", "Score de prontidão", "Variabilidade cardíaca (VFC)", "Tendência de temperatura corporal"],
          purpose: "Os dados do Oura alimentam o score noturno de Bem-estar e informam as recomendações de recuperação no teu plano de Treino."
        },
        myfitnesspal: {
          name: "MyFitnessPal",
          subtitle: "Diário alimentar e nutrição",
          dataPoints: ["Calorias diárias consumidas", "Macronutrientes (proteína, hidratos, gordura)", "Ingestão de água"],
          purpose: "Importar o teu diário do MFP evita registos duplicados, mantendo os totais de Nutrição sempre exatos."
        }
      }
    },
    womensHealth: {
      postpartum: {
        babyIsHere: "O bebé chegou!",
        postpartumRecovery: "Recuperação Pós-Parto",
        transitionTitle: "Bem-vinda à Recuperação Pós-Parto",
        deliveryDate: "Data do Parto",
        deliveryType: "Tipo de Parto",
        vaginal: "Vaginal",
        cSection: "Cesariana",
        isBreastfeeding: "A amamentar?",
        saveTransition: "Iniciar Jornada Pós-Parto",
        ppWeek: "Semana {{week}} Pós-Parto",
        newborn: "Registo do Recém-Nascido",
        feed: "Amamentação",
        diaper: "Fralda",
        sleep: "Sono do Bebé",
        lochia: "Lóquios / Sangramento",
        pain: "Dor na Incisão / Pélvica",
        pelvicFloor: "Pavimento Pélvico e Core",
        startPelvic: "Protocolo Pélvico e Core",
        ppMood: "Humor Pós-Parto",
        anxious: "Ansiosa",
        overwhelmed: "Sobrecarregada",
        numb: "Apática",
        happy: "Conectada e Feliz",
        heavy: "Intenso",
        light: "Leve",
        none: "Nenhum"
      },
      ppPain: "Dor na Incisão / Pélvica (1-10)",
      ppMood: "Humor Pós-Parto",
      ppLochia: "Lóquios / Sangramento",
      ppc1: "Cicatrização da incisão, evitar carregar pesos",
      ppv1: "Inchaço no pavimento pélvico, lóquios",
      ppc2: "Core a recuperar suavemente, restringir esforço",
      ppv2: "Pavimento pélvico a recuperar tónus",
      startPelvic: "Protocolo Pélvico e Core",
      cSecRec1: "Cicatrização da incisão, evitar pesos e gerir lóquios.",
      vagRec1: "Inchaço pélvico, descanso e gestão de lóquios.",
      babyHereBtn: "O bebé chegou!",
      pelvicTitle: "Protocolo de Poder Pélvico",
      pelvicSub: "Fortalece o pavimento pélvico, reduz cólicas e apoia o core",
      pelvicInstructions: "Contrai 5s → Relaxa 5s → Repete. Faz 10 ciclos por sessão.",
      stopSession: "Parar Sessão",
      startTimer: "Iniciar Timer"
    },
    mensHealth: {
      vitalityCheckin: "Registo de Vitalidade",
      vitalitySub: "Avalia cada pilar honestamente. O teu T-Opt score atualiza em tempo real.",
      tOptScore: "T-OPT SCORE",
      drivePillar: "Vitalidade / Líbido",
      recoveryPillar: "Estado de Recuperação",
      focusPillar: "Foco Mental",
      sleepPillar: "Qualidade do Sono",
      moodSynced: "Humor sincronizado do Wellness",
      updateStatus: "Atualizar Estado do Sistema",
      pelvicTitle: "Protocolo de Poder Pélvico",
      pelvicSub: "Melhora a função erétil, controlo urinário, desempenho sexual e estabilidade do core.",
      pelvicInstructions: "Contrai 5s → Relaxa 5s → Repete. 10–15 ciclos. Prática diária dá resultados em 4–6 semanas.",
      pelvicActionSub: "Core, função erétil & urinária",
      startProtocol: "Iniciar Protocolo",
      finishLog: "Terminar & Registar"
    },
    move: {
      insightsTitle: "Insights de Treino",
      weeklyProgress: "Progresso Semanal",
      sessions: "Sessões",
      totalTime: "Tempo Total",
      calories: "Calorias",
      thisWeekVsLastWeek: "Esta Semana vs Semana Passada",
      calorieBurnTrend: "Tendência de Calorias Queimadas",
      thisWeekTotal: "Total desta semana",
      vsLastWeek: "{{val}}% vs semana passada",
      consistencyStreak: "Sequência de Consistência",
      daysCount: "{{count}} dias",
      onFire: "🔥 Em alta!",
      keepGoing: "Continua!",
      avgSessionLength: "Duração Média da Sessão",
      workoutMix: "Mix de Treinos",
      mostActiveDay: "Dia Mais Ativo",
      sessions_count: "{{count}} sessões",
      noWorkoutDataYet: "Ainda sem dados de treino",
      logToUnlockTrends: "Regista sessões para desbloquear tendências.",
      unlockProAnalysis: "Desbloquear Análise Pro",
      unlockProDesc: "Obtém tendências, volume e recordes pessoais.",
      upgradeToPro: "Atualizar para Pro",
      upNext: "A Seguir",
      startWorkout: "Começar Treino",
      viewWorkout: "Ver Treino",
      exercisesCount: "{{count}} exercícios",
      startDayWorkout: "Começar Treino Dia {{day}}",
      dayPreview: "Pré-visualização Dia {{day}}",
      weekOverview: "Visão Geral da Semana",
      detailInfo: "Toca em qualquer exercício para ver detalhes. Utilizadores Pro podem adicionar ou remover exercícios.",
      exerciseVolume: "Volume do Exercício",
      nextExercise: "Próximo Exercício",
      addExercise: "Adicionar Exercício",
      addSet: "+ Adicionar série",
      restTimer: "Temporizador de Descanso",
      iAmReady: "Estou pronto",
      turnOff: "Desativar",
      setShort: "SÉRIE",
      previousShort: "ANTERIOR",
      kgShort: "KG",
      repsShort: "REPS",
      finish: "Concluir",
      duration: "Duração",
      volume: "Volume",
      sets: "Séries",
      syncedFromHealth: "Sincronizado da Saúde",
      freePlanComplete: "Plano base concluído — atualiza para continuar",
      continueJourney: "Continua a Tua Transformação",
      freeUsers28DaysFull: "O plano gratuito inclui um programa completo de 28 dias. Atualiza para o Pro para continuar com adaptações inteligentes a cada ciclo.",
      your4WeekProgram: "O Teu Programa de 4 Semanas",
      weekProgress: "Semana {{currentWeek}} de {{totalWeeks}}",
      daysPerWeekText: "{{days}} dias/semana",
      routeLoaded: "Rota carregada",
      waypointsLoaded: "{{count}} pontos de passagem.",
      gpxRoutes: "Rotas GPX",
      gpxRoutesDesc: "Importação de ficheiros GPX em breve.\nPoderás carregar ficheiros .gpx do Wikiloc para sobrepor um percurso de referência.",
      log: "Registar"
    },
    modals: {
      logRecipe: {
        titleRecipe: "Adicionar Receita",
        titleFood: "Adicionar Alimento",
        logged: "Registado!",
        addedTo: "Adicionado ao teu",
        logToMeal: "Registar na Refeição",
        qty: "Quantidade",
        skip: "Saltar",
        logTo: "Registar em"
      },
      search: {
        addFood: "Adicionar Alimento",
        addRecipe: "Adicionar Receita"
      },
      addFood: {
        nextReview: "Seguinte: Rever",
        reviewSave: "Rever e Guardar",
        by: "por",
        saving: "A guardar...",
        saveFood: "Guardar Alimento"
      }
    },
    foodReview: {
      saveToMyFoods: "Guardar nos Meus Alimentos",
      saveAsRecipe: "Guardar como Receita",
      savedToMyFoodsSuccess: "Guardado nos Meus Alimentos!",
      savedAsRecipeSuccess: "Guardado como Receita!",
      addToDiary: "Adicionar ao Diário"
    },
    fuel: {
      detailedInsights: {
        title: "Nutrição Detalhada",
        calories: "Calorias",
        protein: "Proteína Total",
        carbs: "Hidratos de Carbono Totais",
        fiber: "Fibra Dietética",
        sugar: "Açúcares Totais",
        fat: "Gordura Total",
        saturatedFat: "Gordura Saturada",
        polyunsaturatedFat: "Gordura Polinsaturada",
        monounsaturatedFat: "Gordura Monoinsaturada",
        transFat: "Gordura Trans"
      },
      quickActions: {
        nutritionInsights: "Análise de Nutrição",
        nutritionInsightsDesc: "Exploração detalhada de macros"
      }
    },
    common: {
      servings: "porções",
      protein: "Proteína",
      carbs: "Hidratos",
      fat: "Gordura",
      kcal: "kcal",
      proteinShort: "P",
      carbsShort: "H",
      fatShort: "G",
      openSettings: "Abrir Definições",
      checkSettings: "Verificar Definições",
      configError: "Erro de configuração",
      disconnect: "Desligar",
      start: "Iniciar",
      yes: "Sim",
      resume: "Retomar",
      pause: "Pausa",
      close: "Fechar",
      cancel: "Cancelar",
      beginner: "Iniciante",
      intermediate: "Intermédio",
      advanced: "Avançado",
      veteran: "Veterano",
      dayNum: "Dia {{num}}",
      today: "Hoje",
      units: { kg: "kg" }
    },
    disclaimer: {
      medical: "O Bluom fornece apenas informações gerais de bem-estar. Consulta sempre um profissional de saúde qualificado para aconselhamento, diagnóstico ou tratamento médico."
    },
    sleeper: {
      sleepingStatus: "Módulo em Espera",
      activateBtn: "Ativar Este Módulo"
    }
  },
  es: {
    integrations: {
      title: "Conexiones",
      subtitle: "Sincroniza datos de tus dispositivos y aplicaciones",
      privacyNotice: "Bluom solo lee los tipos de datos enumerados a continuación. Nunca vendemos tus datos de salud. Puedes desconectarte en cualquier momento y solicitar la eliminación total en Ajustes → Cuenta.",
      healthLog: "Registro de Salud",
      healthLogSub: "Ver métricas importadas de hoy",
      sourcesConnected: "{{count}} fuente conectada",
      sourcesConnectedPlural: "{{count}} fuentes conectadas",
      recentImportedData: "Datos Importados Recientes",
      deletionNotice: "Si eliminas tu cuenta de Bluom, todos los datos de salud sincronizados en nuestros servidores se eliminarán permanentemente en 30 días. Los datos locales de Apple Health o Google Health Connect no se verán afectados.",
      categories: {
        activity: "Actividad y Fitness",
        biometrics: "Métricas Corporales",
        nutrition: "Nutrición",
        sleep: "Sueño y Recuperación"
      },
      card: {
        comingSoon: "Próximamente",
        neverSynced: "Nunca sincronizado",
        justNow: "Ahora mismo",
        minsAgo: "hace {{mins}}m",
        hoursAgo: "hace {{hours}}h",
        daysAgo: "hace {{days}}d",
        lastSync: "Última Sincronización: {{time}}",
        hideDetails: "Ocultar detalles",
        readingDataTypes: "Leyendo {{count}} tipos de datos",
        dataWeAccess: "DATOS A LOS QUE ACCEDEMOS",
        howWeUseIt: "CÓMO LOS UTILIZAMOS",
        syncNow: "Sincronizar Ahora"
      },
      alerts: {
        disconnectTitle: "Desconectar {{name}}",
        disconnectHealthMsg: "Dejaremos de leer los datos de salud. Tus datos sincronizados anteriores se conservarán.",
        healthConnFailed: "Error de Conexión de Salud",
        healthKitFailedIos: "Bluom no pudo iniciar HealthKit. Asegúrate de otorgar los permisos necesarios en Ajustes.",
        healthConnectFailedAndroid: "Concede permisos en Health Connect para sincronizar tus datos.",
        disconnectStravaTitle: "Desconectar Strava",
        disconnectStravaMsg: "Dejaremos de importar actividades de Strava. Tus registros actuales se conservarán.",
        disconnectedTitle: "Desconectado",
        stravaDisconnectedMsg: "Se ha desconectado Strava.",
        syncComplete: "Sincronización Completada",
        syncCompleteDetails: "Pasos: {{steps}}\nCalorías: {{calories}} kcal\nDistancia: {{distance}} km",
        stravaSynced: "Strava Sincronizado",
        stravaSyncedDetails: "{{count}} nuevas actividades importadas.",
        syncFailed: "Error al Sincronizar",
        stravaSyncFailedDetails: "No se pudieron sincronizar las actividades de Strava."
      },
      items: {
        apple_health: {
          name: "Apple Health",
          subtitle: "Pasos, entrenamientos, sueño y más",
          dataPoints: ["Pasos y distancia caminada", "Calorías activas quemadas", "Sesiones de entrenamiento", "Peso corporal", "Duración del sueño", "Frecuencia cardíaca"],
          purpose: "Tus pasos y calorías activas actualizan tu meta diaria. El peso se sincroniza con el seguimiento de progreso. Los datos cardíacos y de sueño calculan tus puntuaciones de Vitalidad y optimizan los protocolos de Salud."
        },
        google_health: {
          name: "Health Connect",
          subtitle: "Pasos, entrenamientos, sueño y más",
          dataPoints: ["Pasos y distancia caminada", "Calorías activas quemadas", "Sesiones de entrenamiento", "Peso corporal", "Sesiones de sueño", "Frecuencia cardíaca"],
          purpose: "Tus pasos y calorías activas actualizan tu meta diaria. El peso se sincroniza con el seguimiento de progreso. Los datos cardíacos y de sueño calculan tu puntuación de Vitalidad."
        },
        strava: {
          name: "Strava",
          subtitle: "Carrera, ciclismo y deportes al aire libre",
          dataPoints: ["Tipo y nombre de actividad", "Duración y distancia", "Calorías quemadas", "Frecuencia cardíaca media"],
          purpose: "Las actividades de Strava se importan automáticamente como entrenamientos para mantener tu historial y gasto calórico al día sin registro manual."
        },
        withings: {
          name: "Withings",
          subtitle: "Básculas inteligentes y monitores",
          dataPoints: ["Peso corporal", "% Grasa corporal", "Masa muscular"],
          purpose: "La composición corporal mejora la precisión de tus objetivos calóricos y muestra tu progreso en el tiempo."
        },
        samsung_health: {
          name: "Samsung Health",
          subtitle: "Galaxy Watch y Galaxy Ring",
          dataPoints: ["Pasos", "Frecuencia cardíaca", "Fases del sueño", "Composición corporal"],
          purpose: "Los datos de Samsung Health completan tu registro diario y enriquecen tus puntuaciones de sueño y recuperación."
        },
        oura: {
          name: "Oura Ring",
          subtitle: "Puntuaciones avanzadas de sueño y preparación",
          dataPoints: ["Duración y fases del sueño", "Puntuación de preparación", "Variabilidad cardíaca", "Tendencia de temperatura corporal"],
          purpose: "Los datos de Oura impulsan tu puntuación de Bienestar nocturna e informan las recomendaciones de recuperación en tus entrenamientos."
        },
        myfitnesspal: {
          name: "MyFitnessPal",
          subtitle: "Diario de comidas y nutrición",
          dataPoints: ["Calorías diarias consumidas", "Macronutrientes (proteína, carbohidratos, grasa)", "Consumo de agua"],
          purpose: "Importar tu diario de MFP evita registros duplicados y mantiene tus totales de Nutrición exactos."
        }
      }
    },
    womensHealth: {
      postpartum: {
        babyIsHere: "¡El bebé ya está aquí!",
        postpartumRecovery: "Recuperación Posparto",
        transitionTitle: "Bienvenida a la Recuperación Posparto",
        deliveryDate: "Fecha del Parto",
        deliveryType: "Tipo de Parto",
        vaginal: "Vaginal",
        cSection: "Cesárea",
        isBreastfeeding: "¿Amamantando?",
        saveTransition: "Iniciar Etapa Posparto",
        ppWeek: "Semana {{week}} Posparto",
        newborn: "Registro del Recién Nacido",
        feed: "Toma",
        diaper: "Pañal",
        sleep: "Sueño del Bebé",
        lochia: "Loquios / Sangrado",
        pain: "Dolor en Incisión / Pélvico",
        pelvicFloor: "Suelo Pélvico y Core",
        startPelvic: "Protocolo de Suelo Pélvico y Core",
        ppMood: "Estado de Ánimo Posparto",
        anxious: "Ansiosa",
        overwhelmed: "Abrumada",
        numb: "Insensible",
        happy: "Conectada y Feliz",
        heavy: "Intenso",
        light: "Ligero",
        none: "Ninguno"
      },
      ppPain: "Dolor en Incisión / Pélvico (1-10)",
      ppMood: "Estado de Ánimo Posparto",
      ppLochia: "Loquios / Sangrado",
      ppc1: "Cicatrización de la incisión, evitar levantar peso",
      ppv1: "Inflamación del suelo pélvico, loquios",
      ppc2: "Core recuperándose suavemente, restringir esfuerzo",
      ppv2: "Suelo pélvico recuperando tono",
      startPelvic: "Protocolo de Suelo Pélvico y Core",
      cSecRec1: "Cicatrización de la incisión, evitar peso y gestionar loquios.",
      vagRec1: "Inflamación pélvica, descanso y control de loquios.",
      babyHereBtn: "¡El bebé ya está aquí!",
      pelvicTitle: "Protocolo de Poder Pélvico",
      pelvicSub: "Fortalece el suelo pélvico, alivia cólicos y apoya el core",
      pelvicInstructions: "Contrae 5s → Relaja 5s → Repite. Haz 10 ciclos por sesión.",
      stopSession: "Detener Sesión",
      startTimer: "Iniciar Temporizador"
    },
    mensHealth: {
      vitalityCheckin: "Registro de Vitalidad",
      vitalitySub: "Evalúa cada pilar con honestidad. Tu puntuación T-Opt se actualiza en tiempo real.",
      tOptScore: "PUNTUACIÓN T-OPT",
      drivePillar: "Impulso / Libido",
      recoveryPillar: "Estado de Recuperación",
      focusPillar: "Enfoque Mental",
      sleepPillar: "Calidad del Sueño",
      moodSynced: "Ánimo sincronizado desde Bienestar",
      updateStatus: "Actualizar Estado del Sistema",
      pelvicTitle: "Protocolo de Poder Pélvico",
      pelvicSub: "Mejora la función eréctil, el control urinario, el rendimiento sexual y la estabilidad del core.",
      pelvicInstructions: "Contrae 5s → Relaja 5s → Repite. 10–15 ciclos. La práctica diaria da resultados en 4–6 semanas.",
      pelvicActionSub: "Core, función eréctil y urinaria",
      startProtocol: "Iniciar Protocolo",
      finishLog: "Terminar y Registrar"
    },
    move: {
      insightsTitle: "Estadísticas de Movimiento",
      weeklyProgress: "Progreso Semanal",
      sessions: "Sesiones",
      totalTime: "Tiempo Total",
      calories: "Calorías",
      thisWeekVsLastWeek: "Esta Semana vs Semana Anterior",
      calorieBurnTrend: "Tendencia de Calorías Quemadas",
      thisWeekTotal: "Total de esta semana",
      vsLastWeek: "{{val}}% vs semana anterior",
      consistencyStreak: "Racha de Constancia",
      daysCount: "{{count}} días",
      onFire: "🔥 ¡En racha!",
      keepGoing: "¡Sigue así!",
      avgSessionLength: "Duración Media de Sesión",
      workoutMix: "Variedad de Entrenamientos",
      mostActiveDay: "Día Más Activo",
      sessions_count: "{{count}} sesiones",
      noWorkoutDataYet: "Aún no hay datos de entrenamiento",
      logToUnlockTrends: "Registra sesiones para desbloquear tendencias.",
      unlockProAnalysis: "Desbloquear Análisis Pro",
      unlockProDesc: "Obtén tendencias, seguimiento de volumen y mejores marcas.",
      upgradeToPro: "Mejorar a Pro",
      upNext: "Siguiente",
      startWorkout: "Comenzar Entrenamiento",
      viewWorkout: "Ver Entrenamiento",
      exercisesCount: "{{count}} ejercicios",
      startDayWorkout: "Comenzar Entrenamiento Día {{day}}",
      dayPreview: "Vista Previa Día {{day}}",
      weekOverview: "Resumen Semanal",
      detailInfo: "Toca cualquier ejercicio para ver detalles. Los usuarios Pro pueden añadir o eliminar ejercicios.",
      exerciseVolume: "Volumen de Ejercicio",
      nextExercise: "Siguiente Ejercicio",
      addExercise: "Añadir Ejercicio",
      addSet: "+ Añadir serie",
      restTimer: "Temporizador de Descanso",
      iAmReady: "Estoy listo",
      turnOff: "Desactivar",
      setShort: "SERIE",
      previousShort: "ANTERIOR",
      kgShort: "KG",
      repsShort: "REPS",
      finish: "Finalizar",
      duration: "Duración",
      volume: "Volumen",
      sets: "Series",
      syncedFromHealth: "Sincronizado de Salud",
      freePlanComplete: "Plan base completado — mejora a Pro para continuar",
      continueJourney: "Continúa Tu Transformación",
      freeUsers28DaysFull: "El plan gratuito incluye un programa de 28 días. Mejora a Pro para continuar con entrenamientos adaptativos en cada ciclo.",
      your4WeekProgram: "Tu Programa de 4 Semanas",
      weekProgress: "Semana {{currentWeek}} de {{totalWeeks}}",
      daysPerWeekText: "{{days}} días/semana",
      routeLoaded: "Ruta cargada",
      waypointsLoaded: "{{count}} puntos de paso.",
      gpxRoutes: "Rutas GPX",
      gpxRoutesDesc: "Importación de archivos GPX próximamente.\nPodrás subir archivos .gpx de Wikiloc para seguir una ruta de referencia.",
      log: "Registrar"
    },
    modals: {
      logRecipe: {
        titleRecipe: "Añadir Receta",
        titleFood: "Añadir Alimento",
        logged: "¡Registrado!",
        addedTo: "Añadido a tu",
        logToMeal: "Registrar en Comida",
        qty: "Cantidad",
        skip: "Saltar",
        logTo: "Registrar en"
      },
      search: {
        addFood: "Añadir Alimento",
        addRecipe: "Añadir Receta"
      },
      addFood: {
        nextReview: "Siguiente: Revisar",
        reviewSave: "Revisar y Guardar",
        by: "por",
        saving: "Guardando...",
        saveFood: "Guardar Alimento"
      }
    },
    foodReview: {
      saveToMyFoods: "Guardar en Mis Alimentos",
      saveAsRecipe: "Guardar como Receta",
      savedToMyFoodsSuccess: "¡Guardado en Mis Alimentos!",
      savedAsRecipeSuccess: "¡Guardado como Receta!",
      addToDiary: "Añadir al Diario"
    },
    fuel: {
      detailedInsights: {
        title: "Nutrición Detallada",
        calories: "Calorías",
        protein: "Proteína Total",
        carbs: "Carbohidratos Totales",
        fiber: "Fibra Dietética",
        sugar: "Azúcares Totales",
        fat: "Grasa Total",
        saturatedFat: "Grasa Saturada",
        polyunsaturatedFat: "Grasa Poliinsaturada",
        monounsaturatedFat: "Grasa Monoinsaturada",
        transFat: "Grasa Trans"
      },
      quickActions: {
        nutritionInsights: "Análisis Nutricional",
        nutritionInsightsDesc: "Exploración a fondo de macros"
      }
    },
    common: {
      servings: "porciones",
      protein: "Proteína",
      carbs: "Carbohidratos",
      fat: "Grasa",
      kcal: "kcal",
      proteinShort: "P",
      carbsShort: "C",
      fatShort: "G",
      openSettings: "Abrir Ajustes",
      checkSettings: "Comprobar Ajustes",
      configError: "Error de configuración",
      disconnect: "Desconectar",
      start: "Iniciar",
      yes: "Sí",
      resume: "Reanudar",
      pause: "Pausa",
      close: "Cerrar",
      cancel: "Cancelar",
      beginner: "Principiante",
      intermediate: "Intermedio",
      advanced: "Avanzado",
      veteran: "Veterano",
      dayNum: "Día {{num}}",
      today: "Hoy",
      units: { kg: "kg" }
    },
    disclaimer: {
      medical: "Bluom proporciona únicamente información general de bienestar. Consulta siempre a un profesional médico cualificado para diagnóstico, tratamiento o asesoramiento."
    },
    sleeper: {
      sleepingStatus: "Módulo en Suspensión",
      activateBtn: "Activar Este Módulo"
    }
  }
};

fs.writeFileSync(path.join(__dirname, 'translations_data_pt_es.json'), JSON.stringify(translations, null, 2), 'utf8');
console.log('Saved pt and es.');
