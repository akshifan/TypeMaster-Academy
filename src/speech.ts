const letterNames: Record<string, string> = {
  a: "ay",
  b: "bee",
  c: "see",
  d: "dee",
  e: "ee",
  f: "eff",
  g: "jee",
  h: "aitch",
  i: "eye",
  j: "jay",
  k: "kay",
  l: "el",
  m: "em",
  n: "en",
  o: "oh",
  p: "pee",
  q: "cue",
  r: "ar",
  s: "ess",
  t: "tee",
  u: "you",
  v: "vee",
  w: "double u",
  x: "ex",
  y: "why",
  z: "zee",
};

const characterNames: Record<string, string> = {
  " ": "space",
  "\n": "new line",
  "0": "zero",
  "1": "one",
  "2": "two",
  "3": "three",
  "4": "four",
  "5": "five",
  "6": "six",
  "7": "seven",
  "8": "eight",
  "9": "nine",
  ".": "period",
  ",": "comma",
  "?": "question mark",
  "!": "exclamation mark",
  ":": "colon",
  ";": "semicolon",
  "'": "apostrophe",
  '"': "quotation mark",
  "-": "dash",
  "(": "open parenthesis",
  ")": "close parenthesis",
};

export function speakCharacter(character: string, interrupt = false) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window))
    return;
  const normalized = character.toLowerCase();
  const name =
    letterNames[normalized] ?? characterNames[character] ?? character;
  const spoken =
    character !== normalized && letterNames[normalized]
      ? `capital ${name}`
      : name;
  try {
    if (interrupt) window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = "en-US";
    utterance.rate = 1.45;
    utterance.pitch = 1;
    utterance.volume = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* speech is an optional browser capability */
  }
}

export function speakWordAt(text: string, index: number, interrupt = true) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window))
    return;
  const rest = text.slice(index).trimStart();
  const word = rest.match(/^[\p{L}\p{N}][\p{L}\p{N}'’-]*/u)?.[0];
  if (!word) return;
  try {
    if (interrupt) window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.86;
    utterance.pitch = 1;
    utterance.volume = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* speech is an optional browser capability */
  }
}
