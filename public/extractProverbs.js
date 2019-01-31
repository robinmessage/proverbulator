var fs = require('fs');
var proverbList = [];
var proverbMap = {};

var vectors = {};
var vectorNum = 0;

function toVector(proverb) {
  proverb = proverb.join(" ").replace(/[^a-z ]/ig, "").toLowerCase();
  proverb = proverb.split(" ");
  var vector = [];
  proverb.forEach(word => {
    if (!vectors.hasOwnProperty(word)) {
      vectors[word] = vectorNum++;
    }
    vector.push(vectors[word]);
  });
  return new Set(vector);
}

function calcSimilarity(a, b) {
  if (! (a instanceof Set)) a = proverbMap[a].vector;
  if (! (b instanceof Set)) b = proverbMap[b].vector;
  var same = 0;
  a.forEach( item => {
    if (b.has(item)) same++;
  });
  return same / Math.sqrt(a.size + b.size);
}

function runCategory(category) {
  console.log("Running", category.name);
  var map = new Map(Object.entries(category.map || []));
  proverbList.forEach(proverb => {
    if (map.has(proverb.string)) return;
    category.aRegexps.forEach(regex => {
      if (proverb.string.match(regex)) {
        console.log(category.a, proverb.string);
        map.set(proverb.string, 1);
      }
    });
    if (map.has(proverb.string)) return;
    category.bRegexps.forEach(regex => {
      if (proverb.string.match(regex)) {
        console.log(category.b, proverb.string);
        map.set(proverb.string, 0);
      }
    });
  });
  var calculatedMap = new Map();
  proverbList.forEach(proverb => {
  if (map.has(proverb.string)) return;
    // Place it in between
    var similarities = [0, 0];
    map.forEach((v, k) => {
      const s = calcSimilarity(k, proverb.string);
      if (s > similarities[v]) similarities[v] = s;
    });
    var similarity;
    if (similarities[0] == 0 && similarities[1] == 0) {
      similarity = 0.5;
    } else {
      similarity = similarities[0] / (similarities[0] + similarities[1]);
    }
    calculatedMap.set(proverb.string, similarity);
  });
  console.log(calculatedMap);
  map = map + calculatedMap;
}

function categorize() {
  const categories = [
    {name: "Love or Money", a: "Love", b: "Money", aRegexps: [/\blove|husband|wife\b/i], bRegexps: [/\bmoney|treasure|barn|harvest\b/i]}
  ];
  categories.forEach(runCategory);
}

fs.readFile('Proverbs.json', 'utf8', function (err, data) {
  if (err) throw err;
  var proverbs = JSON.parse(data);
  var sentence = [];
  proverbs.chapters.forEach(chapter => {
    chapter.verses.forEach(verse => {
      verse = verse[Object.keys(verse)[0]];
      verse = verse.replace(/^\(|\)$/g, "");
      verse = verse.replace(/2019/g, "'");
      sentence.push(verse);
      if (verse.match(/\.$/)) {
        // Discard too long ones
        if (sentence.length <= 2) {
          const vector = toVector(sentence);
          const string = sentence.join(" ");
          const proverb = {sentence, vector, string};
          proverbList.push(proverb);
          proverbMap[string] = proverb;
        }
        sentence = [];
      }
    });
  });
  categorize();
  fs.writeFile("proverbList.json", JSON.stringify(proverbList), () => null);
  console.log(proverbList.length);
});

