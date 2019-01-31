import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function useJSONRef(file) {
  const ref = useRef(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loading) {
      fetch(file)
        .then(response => response.json())
        .then(json => {
          ref.current = json;
          setLoading(false);
        });
    }
  }, []);

  return ref.current;
}

if ('speechSynthesis' in window) {
  var voiceList = [];
  speechSynthesis.onvoiceschanged = function() {
    speechSynthesis.getVoices().forEach(function(voice, index) {
      voiceList.push(voice);
    });
  };
}

function speak(text) {
  var msg = new SpeechSynthesisUtterance();
  var voice = speechSynthesis.getVoices().find(voice => voice.name === "Trinoids");
  msg.voice = voice;
  msg.rate = 8.5 / 10;
  msg.pitch = 0;
  msg.text = text;
  
  speechSynthesis.speak(msg);
}

function App() {
  const [answers, setAnswers] = useState([]);
  const [proverb, setProverb] = useState(null);

  function reset() {
    setProverb(null);
    setAnswers([]);
  }

  const proverbLookup = useJSONRef("proverbLookup.json");
  const categories = useJSONRef("categories.json");

  if (categories === null || proverbLookup === null) {
    return (
      <div className="App">
        <div>Proverbs are loading...</div>
      </div>
    );
  }

  if (proverb !== null) {
    return (
      <div className="App">
        <div className="Explanation">On your question on the topics of {
          answers.map(a => a.v).join(", ").replace(/, (?=[^,]*$)/, " and ")
        }, Solomon's wisdom is:</div>
        <div className="Proverb">{proverb.map(line => <div key={line}>{line}</div>)}</div>
        <a className="Instruction" onClick={reset}>Again</a>
      </div>
    );
  }

  function select(option) {
    const answer = {name: category.name, v: category[option], value: option === category.a ? 1 : 0};
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    
    const address = newAnswers.map(a => a.v).sort().join(",");
    const proverbList = proverbLookup[address];
    if (proverbList) {
      const newProverb = proverbList[Math.floor(Math.random() * proverbList.length)];
      setProverb(newProverb);
      speak(newProverb);
    }
  }

  var categoryNames = new Set(categories.map(c => c.name));
  answers.forEach(answer => categoryNames.delete(answer.name));
  categoryNames = [...categoryNames.values()];

  var categoryName = categoryNames[Math.floor(Math.random() * categoryNames.length)];
  
  var category = categories.find(category => category.name === categoryName);

  return (
    <div className="App">
      <div className="Explanation">Choose what your question relates to</div>
      <a className="OptionA" onClick={() => select("a")}>{category.a}</a>
      <a className="OptionB" onClick={() => select("b")}>{category.b}</a>
    </div>
  );
}

export default App;
