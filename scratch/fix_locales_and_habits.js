const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../locales');
const langs = ['en', 'pt', 'es', 'de', 'fr', 'nl', 'pl', 'da', 'no', 'sv', 'tr', 'bg', 'el', 'lt', 'lv', 'ro'];

const lmpTranslations = {
  en: {
    postpartum: "Postpartum",
    stagePostpartum: "Postpartum",
    lmpQuestion: "Last Menstrual Period (LMP) — When did your last period start?",
    conceptionQuestion: "Conception Date — Do you know your exact date of conception?",
    conceptionSkip: "I do not know yet",
    cycleRegQuestion: "How would you describe your cycle?",
    cycleRegRegular: "Regular (24–35 day cycle)",
    cycleRegIrregular: "Irregular / unpredictable",
    cycleRegUnknown: "I'm not sure",
  },
  pt: {
    postpartum: "Pós-parto",
    stagePostpartum: "Pós-parto",
    lmpQuestion: "Última Menstruação (DUM) — Quando começou o teu último período?",
    conceptionQuestion: "Data de Conceção — Sabes a data exata da tua conceção?",
    conceptionSkip: "Ainda não sei",
    cycleRegQuestion: "Como descreverias o teu ciclo?",
    cycleRegRegular: "Regular (ciclo de 24–35 dias)",
    cycleRegIrregular: "Irregular / imprevisível",
    cycleRegUnknown: "Não tenho a certeza",
  },
  es: {
    postpartum: "Posparto",
    stagePostpartum: "Posparto",
    lmpQuestion: "Última regla (FUM) — ¿Cuándo empezó tu último periodo?",
    conceptionQuestion: "Fecha de concepción — ¿Conoces tu fecha exacta de concepción?",
    conceptionSkip: "Aún no la sé",
    cycleRegQuestion: "¿Cómo describirías tu ciclo?",
    cycleRegRegular: "Regular (ciclo de 24–35 días)",
    cycleRegIrregular: "Irregular / impredecible",
    cycleRegUnknown: "No estoy segura",
  },
  de: {
    postpartum: "Wochenbett",
    stagePostpartum: "Wochenbett",
    lmpQuestion: "Letzte Periode — Wann hat deine letzte Menstruation begonnen?",
    conceptionQuestion: "Empfängnisdatum — Kennst du dein genaues Empfängnisdatum?",
    conceptionSkip: "Ich weiß es noch nicht",
    cycleRegQuestion: "Wie würdest du deinen Zyklus beschreiben?",
    cycleRegRegular: "Regelmäßig (24–35 Tage Zyklus)",
    cycleRegIrregular: "Unregelmäßig / unvorhersehbar",
    cycleRegUnknown: "Ich bin mir nicht sicher",
  },
  fr: {
    postpartum: "Post-partum",
    stagePostpartum: "Post-partum",
    lmpQuestion: "Date des dernières règles (DDR) — Quand ont commencé vos dernières règles ?",
    conceptionQuestion: "Date de conception — Connaissez-vous la date exacte de conception ?",
    conceptionSkip: "Je ne sais pas encore",
    cycleRegQuestion: "Comment décririez-vous votre cycle ?",
    cycleRegRegular: "Régulier (cycle de 24 à 35 jours)",
    cycleRegIrregular: "Irrégulier / imprévisible",
    cycleRegUnknown: "Je ne suis pas sûre",
  },
  nl: {
    postpartum: "Postpartum",
    stagePostpartum: "Postpartum",
    lmpQuestion: "Laatste menstruatie — Wanneer begon je laatste menstruatie?",
    conceptionQuestion: "Conceptiedatum — Weet je de exacte datum van conceptie?",
    conceptionSkip: "Ik weet het nog niet",
    cycleRegQuestion: "Hoe zou je je cyclus omschrijven?",
    cycleRegRegular: "Regelmatig (cyclus van 24–35 dagen)",
    cycleRegIrregular: "Onregelmatig / onvoorspelbaar",
    cycleRegUnknown: "Ik weet het niet zeker",
  },
  pl: {
    postpartum: "Połóg",
    stagePostpartum: "Połóg",
    lmpQuestion: "Ostatnia miesiączka (OM) — Kiedy zaczął się Twój ostatni okres?",
    conceptionQuestion: "Data poczęcia — Czy znasz dokładną datę poczęcia?",
    conceptionSkip: "Jeszcze nie wiem",
    cycleRegQuestion: "Jak opisałabyś swój cykl?",
    cycleRegRegular: "Regularny (cykl 24–35 dni)",
    cycleRegIrregular: "Nieregularny / nieprzewidywalny",
    cycleRegUnknown: "Nie jestem pewna",
  },
  da: {
    postpartum: "Efter fødsel",
    stagePostpartum: "Efter fødsel",
    lmpQuestion: "Sidste menstruation — Hvornår startede din sidste menstruation?",
    conceptionQuestion: "Undfangelsesdato — Kender du den præcise undfangelsesdato?",
    conceptionSkip: "Jeg ved det ikke endnu",
    cycleRegQuestion: "Hvordan vil du beskrive din cyklus?",
    cycleRegRegular: "Regelmæssig (24–35 dages cyklus)",
    cycleRegIrregular: "Uregelmæssig / uforudsigelig",
    cycleRegUnknown: "Jeg er ikke sikker",
  },
  no: {
    postpartum: "Etter fødsel",
    stagePostpartum: "Etter fødsel",
    lmpQuestion: "Siste menstruasjon — Når startet din siste menstruasjon?",
    conceptionQuestion: "Unnfangelsesdato — Vet du nøyaktig dato for unnfangelsen?",
    conceptionSkip: "Jeg vet ikke ennå",
    cycleRegQuestion: "Hvordan vil du beskrive syklusen din?",
    cycleRegRegular: "Regelmessig (24–35 dagers syklus)",
    cycleRegIrregular: "Uregelmessig / uforutsigbar",
    cycleRegUnknown: "Jeg er ikke sikker",
  },
  sv: {
    postpartum: "Efter förlossning",
    stagePostpartum: "Efter förlossning",
    lmpQuestion: "Senaste mens — När började din senaste menstruation?",
    conceptionQuestion: "Befruktningsdatum — Vet du det exakta befruktningsdatumet?",
    conceptionSkip: "Jag vet inte än",
    cycleRegQuestion: "Hur skulle du beskriva din cykel?",
    cycleRegRegular: "Regelbunden (24–35 dagars cykel)",
    cycleRegIrregular: "Oregelbunden / oförutsägbar",
    cycleRegUnknown: "Jag är osäker",
  },
  tr: {
    postpartum: "Doğum Sonrası",
    stagePostpartum: "Doğum Sonrası",
    lmpQuestion: "Son Adet Tarihi (SAT) — Son adetin ne zaman başladı?",
    conceptionQuestion: "Hamile Kalma Tarihi — Kesin döllenme tarihini biliyor musun?",
    conceptionSkip: "Henüz bilmiyorum",
    cycleRegQuestion: "Adet döngünü nasıl tanımlarsın?",
    cycleRegRegular: "Düzenli (24–35 günlük döngü)",
    cycleRegIrregular: "Düzensiz / tahmin edilemez",
    cycleRegUnknown: "Emin değilim",
  },
  bg: {
    postpartum: "Следродилен период",
    stagePostpartum: "Следродилен период",
    lmpQuestion: "Последна менструация — Кога започна последният ви цикъл?",
    conceptionQuestion: "Дата на зачеване — Знаете ли точната дата на зачеването?",
    conceptionSkip: "Все още не знам",
    cycleRegQuestion: "Как бихте описали цикъла си?",
    cycleRegRegular: "Редовен (24–35 дни)",
    cycleRegIrregular: "Нередовен / непредвидим",
    cycleRegUnknown: "Не съм сигурна",
  },
  el: {
    postpartum: "Μετά τον τοκετό",
    stagePostpartum: "Μετά τον τοκετό",
    lmpQuestion: "Τελευταία περίοδος — Πότε ξεκίνησε η τελευταία σας περίοδος;",
    conceptionQuestion: "Ημερομηνία σύλληψης — Γνωρίζετε την ακριβή ημερομηνία σύλληψης;",
    conceptionSkip: "Δεν γνωρίζω ακόμα",
    cycleRegQuestion: "Πώς θα περιγράφατε τον κύκλο σας;",
    cycleRegRegular: "Τακτικός (κύκλος 24–35 ημερών)",
    cycleRegIrregular: "Ακανόνιστος / απρόβλεπτος",
    cycleRegUnknown: "Δεν είμαι σίγουρη",
  },
  lt: {
    postpartum: "Pogimdyminis laikotarpis",
    stagePostpartum: "Pogimdyminis laikotarpis",
    lmpQuestion: "Paskutinės mėnesinės — Kada prasidėjo jūsų paskutinės mėnesinės?",
    conceptionQuestion: "Pastojimo data — Ar žinote tikslią pastojimo datą?",
    conceptionSkip: "Dar nežinau",
    cycleRegQuestion: "Kaip apibūdintumėte savo ciklą?",
    cycleRegRegular: "Reguliarus (24–35 dienų ciklas)",
    cycleRegIrregular: "Nereguliarus / nenuspėjamas",
    cycleRegUnknown: "Nesu tikra",
  },
  lv: {
    postpartum: "Pēcdzemdību periods",
    stagePostpartum: "Pēcdzemdību periods",
    lmpQuestion: "Pēdējās mēnešreizes — Kad sākās jūsu pēdējās mēnešreizes?",
    conceptionQuestion: "Ieņemšanas datums — Vai zināt precīzu ieņemšanas datumu?",
    conceptionSkip: "Vēl nezinu",
    cycleRegQuestion: "Kā jūs raksturotu savu ciklu?",
    cycleRegRegular: "Regulārs (24–35 dienu cikls)",
    cycleRegIrregular: "Neregulārs / neparedzams",
    cycleRegUnknown: "Neesmu pārliecināta",
  },
  ro: {
    postpartum: "Postpartum",
    stagePostpartum: "Postpartum",
    lmpQuestion: "Ultima menstruație — Când a început ultima ta menstruație?",
    conceptionQuestion: "Data concepției — Știi data exactă a concepției?",
    conceptionSkip: "Nu știu încă",
    cycleRegQuestion: "Cum ți-ai descrie ciclul?",
    cycleRegRegular: "Regulat (ciclu de 24–35 de zile)",
    cycleRegIrregular: "Neregulat / imprevizibil",
    cycleRegUnknown: "Nu sunt sigură",
  }
};

for (const lang of langs) {
  const filePath = path.join(localesDir, lang, 'translation.json');
  if (!fs.existsSync(filePath)) continue;

  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const meta = lmpTranslations[lang] || lmpTranslations.en;

  if (!json.womensHealth) json.womensHealth = {};

  // 1. If womensHealth.postpartum is an object, lift its keys up into womensHealth
  if (typeof json.womensHealth.postpartum === 'object' && json.womensHealth.postpartum !== null) {
    const ppObj = json.womensHealth.postpartum;
    for (const k of Object.keys(ppObj)) {
      if (json.womensHealth[k] === undefined) {
        json.womensHealth[k] = ppObj[k];
      }
    }
  }

  // 2. Set womensHealth.postpartum as a string
  json.womensHealth.postpartum = meta.postpartum;

  // 3. Set womensHealth.stage.postpartum
  if (!json.womensHealth.stage) json.womensHealth.stage = {};
  json.womensHealth.stage.postpartum = meta.stagePostpartum;

  // 4. Setup womensHealth.quiz.lastPeriodDate & conceptionDate
  if (!json.womensHealth.quiz) json.womensHealth.quiz = {};

  json.womensHealth.quiz.lastPeriodDate = {
    question: meta.lmpQuestion
  };

  json.womensHealth.quiz.conceptionDate = {
    question: meta.conceptionQuestion,
    skip: meta.conceptionSkip
  };

  if (!json.womensHealth.quiz.cycleRegularity) {
    json.womensHealth.quiz.cycleRegularity = {};
  }
  json.womensHealth.quiz.cycleRegularity.question = meta.cycleRegQuestion;
  json.womensHealth.quiz.cycleRegularity.regular = meta.cycleRegRegular;
  json.womensHealth.quiz.cycleRegularity.irregular = meta.cycleRegIrregular;
  json.womensHealth.quiz.cycleRegularity.unknown = meta.cycleRegUnknown;

  // 5. Fix French habits if French
  if (lang === 'fr') {
    if (!json.wellness) json.wellness = {};
    if (!json.wellness.habits) json.wellness.habits = {};
    json.wellness.habits.defWater = "Boire 1.5 litres d'eau";
    json.wellness.habits.defVitamins = "Prendre mes vitamines quotidiennes";
    json.wellness.habits.defNature = "Passer du temps dehors dans la nature";
    json.wellness.habits.defSleep = "Dormir au moins 8 heures";
    json.wellness.habits.defScreen = "Limiter mon temps d'écran le soir";
    json.wellness.habits.defExercise = "Faire une séance de sport de 30 minutes";
    json.wellness.habits.defMeditate = "Méditer 10 minutes";
    json.wellness.habits.defGratitude = "Pratiquer la gratitude";
    json.wellness.habits.defSocial = "Voir des amis / proches";
    json.wellness.habits.defRead = "Lire pendant 30 minutes";
  }

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`Updated ${lang}/translation.json`);
}

console.log('Finished updating all locales!');
