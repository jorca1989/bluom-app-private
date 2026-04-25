
const fs = require('fs');
const path = 'c:/Users/jwfca/Desktop/BluomAppNew/locales/pt/translation.json';
const content = fs.readFileSync(path, 'utf8');
const data = JSON.parse(content);

data.wellness.moods = {
  "excellent": "Excelente",
  "good": "Bom",
  "okay": "Normal",
  "low": "Baixo",
  "poor": "Mau",
  "great": "Ótimo",
  "meh": "Mais ou menos",
  "bad": "Mau",
  "struggling": "Com dificuldades"
};

data.wellness.habitCompletion = "Conclusão de Hábitos";
data.wellness.sleepAvg = "Média de Sono (7 dias)";
data.wellness.meditationWeek = "Meditação (Semana)";
data.wellness.moodStability = "Estabilidade de Humor";
data.wellness.stable = "Estável";
data.wellness.pro = "Pro";
data.wellness.logSleepTitle = "Registar Sono";
data.wellness.hoursSlept = "Horas dormidas";
data.wellness.sleepPlaceholder = "ex: 7.5";
data.wellness.howFeeling = "Como te sentes?";

fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
console.log('Success');
