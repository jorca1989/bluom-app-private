const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../locales');

const translationsMap = {
  en: {
    week: 'Week',
    weeksToGo: 'weeks to go',
    trimester: 'Trimester',
    pregnancyTimeline: 'Pregnancy Timeline',
    youAreHere: '(You are here)',
    tri1: 'Weeks 1–13 · Organ formation, nausea, fatigue',
    tri2: 'Weeks 14–27 · Energy returns, baby moves, anomaly scan',
    tri3: 'Weeks 28–40 · Growth, preparation, birth planning'
  },
  de: {
    week: 'Woche',
    weeksToGo: 'Wochen verbleibend',
    trimester: 'Trimester',
    pregnancyTimeline: 'Schwangerschafts-Zeitleiste',
    youAreHere: '(Du bist hier)',
    tri1: 'Wochen 1–13 · Organbildung, Übelkeit, Müdigkeit',
    tri2: 'Wochen 14–27 · Energie kehrt zurück, Baby bewegt sich, Ultraschall',
    tri3: 'Wochen 28–40 · Wachstum, Vorbereitung, Geburtsplanung'
  },
  fr: {
    week: 'Semaine',
    weeksToGo: 'semaines restantes',
    trimester: 'Trimestre',
    pregnancyTimeline: 'Chronologie de la grossesse',
    youAreHere: '(Vous êtes ici)',
    tri1: 'Semaines 1–13 · Formation des organes, nausées, fatigue',
    tri2: 'Semaines 14–27 · Énergie de retour, le bébé bouge, échographie',
    tri3: 'Semaines 28–40 · Croissance, préparation, projet de naissance'
  },
  es: {
    week: 'Semana',
    weeksToGo: 'semanas restantes',
    trimester: 'Trimestre',
    pregnancyTimeline: 'Cronología del embarazo',
    youAreHere: '(Estás aquí)',
    tri1: 'Semanas 1–13 · Formación de órganos, náuseas, fatiga',
    tri2: 'Semanas 14–27 · Vuelve la energía, el bebé se mueve, ecografía',
    tri3: 'Semanas 28–40 · Crecimiento, preparación, plan de parto'
  },
  pt: {
    week: 'Semana',
    weeksToGo: 'semanas restantes',
    trimester: 'Trimestre',
    pregnancyTimeline: 'Linha do Tempo da Gravidez',
    youAreHere: '(Estás aqui)',
    tri1: 'Semanas 1–13 · Formação dos órgãos, náuseas, fadiga',
    tri2: 'Semanas 14–27 · Energia de volta, bebé mexe, ecografia anatómica',
    tri3: 'Semanas 28–40 · Crescimento, preparação, planeamento do parto'
  },
  da: {
    week: 'Uge',
    weeksToGo: 'uger tilbage',
    trimester: 'Trimester',
    pregnancyTimeline: 'Graviditetstidslinje',
    youAreHere: '(Du er her)',
    tri1: 'Uger 1–13 · Organdannelse, kvalme, træthed',
    tri2: 'Uger 14–27 · Energi vender tilbage, baby bevæger sig, scanning',
    tri3: 'Uger 28–40 · Vækst, forberedelse, fødselsplanlægning'
  },
  no: {
    week: 'Uke',
    weeksToGo: 'uker igjen',
    trimester: 'Trimester',
    pregnancyTimeline: 'Tidslinje for graviditet',
    youAreHere: '(Du er her)',
    tri1: 'Uker 1–13 · Organdannelse, kvalme, tretthet',
    tri2: 'Uker 14–27 · Energi kommer tilbake, babyen beveger seg, ultralyd',
    tri3: 'Uker 28–40 · Vekst, forberedelse, fødselsplanlegging'
  },
  sv: {
    week: 'Vecka',
    weeksToGo: 'veckor kvar',
    trimester: 'Trimester',
    pregnancyTimeline: 'Graviditetstidslinje',
    youAreHere: '(Du är här)',
    tri1: 'Veckor 1–13 · Organbildning, välmående, trötthet',
    tri2: 'Veckor 14–27 · Energi tillbaka, bebis rör sig, ultraljud',
    tri3: 'Veckor 28–40 · Tillväxt, förberedelse, förlossningsplanering'
  },
  nl: {
    week: 'Week',
    weeksToGo: 'weken te gaan',
    trimester: 'Trimester',
    pregnancyTimeline: 'Zwangerschapstijdlijn',
    youAreHere: '(Je bent hier)',
    tri1: 'Weken 1–13 · Orgaanvorming, misselijkheid, vermoeidheid',
    tri2: 'Weken 14–27 · Energie keert terug, baby beweegt, echo',
    tri3: 'Weken 28–40 · Groei, voorbereiding, geboorteplanning'
  },
  pl: {
    week: 'Tydzień',
    weeksToGo: 'tygodni do końca',
    trimester: 'Trymestr',
    pregnancyTimeline: 'Harmonogram ciąży',
    youAreHere: '(Jesteś tutaj)',
    tri1: 'Tygodnie 1–13 · Formowanie narządów, nudności, zmęczenie',
    tri2: 'Tygodnie 14–27 · Powrót energii, ruchy dziecka, USG',
    tri3: 'Tygodnie 28–40 · Wzrost, przygotowanie, plan porodu'
  },
  ro: {
    week: 'Săptămâna',
    weeksToGo: 'săptămâni rămase',
    trimester: 'Trimestru',
    pregnancyTimeline: 'Cronologia sarcinii',
    youAreHere: '(Ești aici)',
    tri1: 'Săptămânile 1–13 · Formarea organelor, greață, oboseală',
    tri2: 'Săptămânile 14–27 · Revine energia, bebelușul se mișcă, ecografie',
    tri3: 'Săptămânile 28–40 · Creștere, pregătire, plan de naștere'
  },
  el: {
    week: 'Εβδομάδα',
    weeksToGo: 'εβδομάδες απομένουν',
    trimester: 'Τρίμηνο',
    pregnancyTimeline: 'Χρονοδιάγραμμα εγκυμοσύνης',
    youAreHere: '(Είστε εδώ)',
    tri1: 'Εβδομάδες 1–13 · Σχηματισμός οργάνων, ναυτία, κόπωση',
    tri2: 'Εβδομάδες 14–27 · Επιστροφή ενέργειας, το μωρό κινείται, υπερηχογράφημα',
    tri3: 'Εβδομάδες 28–40 · Ανάπτυξη, προετοιμασία, τοκετός'
  },
  bg: {
    week: 'Седмица',
    weeksToGo: 'седмици остават',
    trimester: 'Триместър',
    pregnancyTimeline: 'Хронология на бременността',
    youAreHere: '(Вие сте тук)',
    tri1: 'Седмици 1–13 · Образуване на органи, гадене, умора',
    tri2: 'Седмици 14–27 · Връщане на енергията, бебето се движи, ултразвук',
    tri3: 'Седмици 28–40 · Растеж, подготовка, план за раждане'
  },
  lv: {
    week: 'Nedēļa',
    weeksToGo: 'nedēļas atlikušas',
    trimester: 'Trimestris',
    pregnancyTimeline: 'Grūtniecības laika skala',
    youAreHere: '(Jūs esat šeit)',
    tri1: 'Nedēļas 1–13 · Orgānu veidošanās, nelabums, nogurums',
    tri2: 'Nedēļas 14–27 · Enerģija atgriežas, mazulis kustas, ultrasonogrāfija',
    tri3: 'Nedēļas 28–40 · Augšana, sagatavošanās, dzemdību plānošana'
  },
  lt: {
    week: 'Savaitė',
    weeksToGo: 'savaičių liko',
    trimester: 'Trimesteris',
    pregnancyTimeline: 'Nėštumo laiko juosta',
    youAreHere: '(Jūs esate čia)',
    tri1: 'Savaitės 1–13 · Organų formavimasis, pykinimas, nuovargis',
    tri2: 'Savaitės 14–27 · Grįžta energija, kūdikis juda, echoskopija',
    tri3: 'Savaitės 28–40 · Augimas, pasirengimas, gimdymo planavimas'
  },
  tr: {
    week: 'Hafta',
    weeksToGo: 'hafta kaldı',
    trimester: 'Trimester',
    pregnancyTimeline: 'Hamilelik Zaman Çizelgesi',
    youAreHere: '(Buradasınız)',
    tri1: 'Haftalar 1–13 · Organ oluşumu, bulantı, yorgunluk',
    tri2: 'Haftalar 14–27 · Enerji geri döner, bebek hareket eder, ultrason',
    tri3: 'Haftalar 28–40 · Büyüme, hazırlık, doğum planlaması'
  }
};

const dirs = fs.readdirSync(localesDir);

dirs.forEach(lang => {
  const filePath = path.join(localesDir, lang, 'translation.json');
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!data.womensHealth) data.womensHealth = {};

      const map = translationsMap[lang] || translationsMap.en;
      
      data.womensHealth.week = map.week;
      data.womensHealth.weeksToGo = map.weeksToGo;
      data.womensHealth.trimester = map.trimester;
      data.womensHealth.pregnancyTimeline = map.pregnancyTimeline;
      data.womensHealth.youAreHere = map.youAreHere;
      data.womensHealth.tri1 = map.tri1;
      data.womensHealth.tri2 = map.tri2;
      data.womensHealth.tri3 = map.tri3;

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Updated translation file: ${lang}`);
    } catch (e) {
      console.error(`Error updating ${lang}:`, e);
    }
  }
});
