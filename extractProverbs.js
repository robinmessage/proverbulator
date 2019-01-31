const fs = require('fs');
const proverbList = [];
const proverbMap = {};

const vectors = new Map();

const categoriesMap = new Map();

function toVector(proverb) {
  proverb = proverb.join(" ").replace(/[^a-z ]/ig, "").toLowerCase();
  proverb = proverb.split(" ");
  proverb.forEach(word => {
    if (!vectors.has(word)) {
      vectors.set(word, {count: 0});
    }
    const vector = vectors.get(word);
    vector.count++;
    vectors.set(word, vector);
  });
  return new Set(proverb);
}

function calcSimilarity(a, b) {
  if (! (a instanceof Set)) a = proverbMap[a].vector;
  if (! (b instanceof Set)) b = proverbMap[b].vector;
  var same = 0;
  a.forEach( item => {
    if (b.has(item)) {
      same += 1 / vectors.get(item).count;
    }
  });
  return same / Math.sqrt(a.size + b.size);
}

function runCategory(category) {
  var map = new Map(Object.entries(category.map || []));
  proverbList.forEach(proverb => {
    if (map.has(proverb.string)) return;
    category.aRegexps.forEach(regex => {
      if (proverb.string.match(regex)) {
        map.set(proverb.string, 1);
      }
    });
    if (map.has(proverb.string)) return;
    category.bRegexps.forEach(regex => {
      if (proverb.string.match(regex)) {
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
  calculatedMap.forEach((v, k) => map.set(k, v));
  category.map = map;
}

function standardDeviation(values){
  var avg = average(values);
  
  var squareDiffs = values.map(function(value){
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });
  
  var avgSquareDiff = average(squareDiffs);

  var stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
}

function average(data){
  var sum = data.reduce(function(sum, value){
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}

function shuffle(arr) {
  var i = arr.length;
  while(i-- > 0) {
    var j = Math.floor(Math.random() * i);
    var x = arr[i];
    arr[i] = arr[j];
    arr[j] = arr[i];
  }
  return arr;
}

function reportOnCategory(category) {
  var sorted = [...shuffle(category.map.entries())].sort((a, b) => b[1] - a[1]);
  var scores = sorted.map(a => a[1]);
  console.log("CATEGORY:", category.name);
  console.log("  Mean", average(scores), "Median", scores[Math.floor(scores.length / 2)], "Std dev", standardDeviation(scores));
  console.log("  Examples:");
  var lots = [0, 0, 0, 0, 0, 0.1, 0.1, 0.1, 0.1, 0.2, 0.2, 0.3, 0.5, 0.5, 0.6, 0.7, 0.8, 0.8, 0.9, 0.9, 0.9, 1, 1, 1, 1].reverse();
  var lot = lots.shift();
  for(var i = 0; i < sorted.length; i++) {
    if (sorted[i][1] <= lot) {
      console.log("    ", sorted[i][1].toFixed(2), ":", sorted[i][0]);
      lot = lots.shift();
      if (lot === null) break;
    }
  }
}

function walkPoints(categories) {
  if (categories.length == 0) return [[]];
  categories = [...categories];
  var category = categories.shift();
  var points = walkPoints(categories);
  return [
    ...points.map(p => [...p, {name: category.name, v: category.a, value: 1.0}]),
    ...points.map(p => [...p, {name: category.name, v: category.b, value: 0}])
  ];
}

function calcDistance(point, proverb, categories) {
  return point.reduce((sum, axis) => {
    const proverbScore = categoriesMap.get(axis.name).map.get(proverb.string);
    const difference = proverbScore - axis.value;
    const squaredDifference = difference * difference;
    return sum + squaredDifference;
  }, 0);
}

function categorize() {
  const categories = [
    {name: "Love or Money", a: "Love", b: "Money", aRegexps: [/\blust|beauty|husband|wife|woman\b/i], bRegexps: [/\bmoney|treasure|barn|harvest|poverty|poor|buy|buyeth\b/i]},
    {name: "About you or another", a: "Yourself", b: "Another", aRegexps: [/\bthou|own|my son|me|ye children|thy\b/i], bRegexps: [/\bhe|neighbour|they|man|his\b/i]},
    {name: "Minor or Life-changing", a: "Minor", b: "Life-changing", aRegexps: [/\bfool|quiet|house|wife|little\b/i], bRegexps: [/\bdeath|violence\b/i], map: {"For her house inclineth unto death, and her paths unto the dead.": 0} }
  ];
  categories.forEach(category => categoriesMap.set(category.name, category));
  categories.forEach(runCategory);
  //categories.forEach(reportOnCategory);
  var points = walkPoints(categories);
  const pointMap = new Map(points.map(p => [p, []]));
  var proverbs = new Set(proverbList);
  while(proverbs.size > 0) {
    var point = points.shift();
    // Find the closest
    var currentDistance = Number.POSITIVE_INFINITY;
    var currentProverb = null;
    proverbs.forEach(proverb => {
      const distance = calcDistance(point, proverb, categories);
      if (distance < currentDistance) {
        currentDistance = distance;
        currentProverb = proverb;
      }
    });
    proverbs.delete(currentProverb);
    pointMap.get(point).push(currentProverb);
    points.push(point);
  }
  const outputMap = {};
  pointMap.forEach((proverbList, point) => {
    const coords = point.map(p => p.v).sort().join(",");
    outputMap[coords] = proverbList.map(proverb => proverb.sentence);
  });
  fs.writeFileSync("proverbLookup.json", JSON.stringify(outputMap));
  fs.writeFileSync("categories.json", JSON.stringify(categories));
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
  fs.writeFileSync("proverbList.json", JSON.stringify(proverbList));
});

