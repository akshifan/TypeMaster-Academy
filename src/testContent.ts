export type TestStyle = "sentences" | "paragraphs";

const sentences = [
  "A steady pace gives your hands room to make accurate movements.",
  "Look ahead at the next phrase while your fingers finish this one.",
  "Daily practice turns careful movements into comfortable habits.",
  "When you make a mistake, correct it calmly and continue forward.",
  "Good posture helps your hands stay relaxed during a longer session.",
  "Each finger has a home position and a useful area to reach.",
  "The small marks on F and J help you find the home row by touch.",
  "Accurate typing grows from rhythm, attention, and repeated practice.",
  "A quiet morning can be a good time to focus on a new skill.",
  "Short breaks help your shoulders and wrists remain comfortable.",
  "Read the whole phrase before you begin typing its first few words.",
  "Clear writing makes ideas easier to understand and share with others.",
  "The quickest route to speed is often a slower and cleaner start.",
  "Careful practice gives every hand a chance to learn its own pattern.",
  "Punctuation creates small pauses that make a passage easier to read.",
  "A consistent rhythm is more useful than a burst of hurried typing.",
  "Keep your wrists loose and let each finger return to its resting place.",
  "A thoughtful routine can make a difficult task feel much simpler.",
  "Notice which keys feel unfamiliar and give them a little extra time.",
  "Typing becomes smoother when your eyes stay on the words ahead.",
  "Take a breath, settle your hands, and begin the next sentence.",
  "A patient learner can make meaningful progress one day at a time.",
  "Confidence comes from knowing where the keys are without looking.",
  "Practice both hands evenly so that no finger has to do all the work.",
  "Write a clear message, check the details, and send it with care.",
  "The useful habit is returning to accuracy whenever speed gets difficult.",
  "A good paragraph connects each sentence to the idea that follows.",
  "Steady effort makes new movements feel natural over time.",
  "Let your hands move lightly instead of pressing each key too hard.",
  "A comfortable desk and chair can support a focused practice session.",
  "Notice your progress across several days rather than one short test.",
  "With practice, the keyboard begins to feel familiar beneath your fingers.",
  "Finish one thought, pause at the comma, and continue with care.",
  "It is easier to improve when you pay attention to both speed and accuracy.",
  "The next line is easier when you keep a calm and even rhythm.",
  "Learning a skill takes time, and each attempt adds useful experience.",
  "Give difficult words another try, then move on without losing your pace.",
  "Small improvements are easier to keep when practice feels sustainable.",
  "A focused learner watches the text and lets the hands do their work.",
  "Choose accuracy first, and allow speed to grow from confident movement.",
];

const paragraphs = [
  "A reliable typing routine does not need to be complicated. Choose a short time each day, sit comfortably, and begin with a pace that lets you stay accurate. As the movements become familiar, your hands will travel more smoothly across the keyboard. Small improvements build on one another, and regular practice is easier to maintain than an occasional long session.",
  "Good communication depends on more than speed. A clear message has a useful purpose, well chosen words, and punctuation that helps the reader follow each idea. Typing practice can support all of these habits because it asks you to pay attention to letters, spacing, and sentence structure at the same time. Stay relaxed, look ahead, and keep your rhythm steady.",
  "When learning touch typing, it can be tempting to look down whenever a key feels unfamiliar. Try to return your eyes to the screen instead. The raised marks on the home row give your index fingers a reliable starting point, while the other fingers rest nearby. With patient repetition, each reach becomes easier to remember and the keyboard begins to feel more predictable.",
  "A long paragraph is best approached a few words at a time. Read ahead while your fingers finish the current phrase, then keep moving without rushing. If you make an error, correct it calmly and return to the text. This method protects your rhythm and helps you notice where accuracy begins to slip. Consistent technique is a stronger foundation for speed than tension or hurried movement.",
  "Focused work often improves when the environment is comfortable. Place the screen at a natural height, keep your shoulders loose, and let your wrists rest without pressing them against the desk. Take a brief pause if your hands become tired. The goal is to build a skill you can use comfortably for a long time, not to finish one practice session as quickly as possible.",
  "People use keyboards for many different kinds of work. They write notes, prepare reports, answer messages, organize information, and create software. Each task brings its own vocabulary and punctuation, so varied practice is useful. A mix of short sentences and longer paragraphs helps the hands adapt to new patterns while the mind stays focused on communicating a complete idea.",
  "Progress is easier to recognize when you record it. Compare several sessions instead of judging your ability from a single result. Your speed may change with the text, the time of day, or how comfortable you feel. Accuracy, consistency, and relaxed technique are also meaningful signs of improvement. Over time, these measures give a more complete picture of the skill you are building.",
  "A thoughtful reader often notices details that are easy to miss at first. A comma changes the rhythm of a sentence, a number requires a different reach, and a capital letter asks the opposite hand to use Shift. Practicing these details gradually makes complex text less intimidating. Keep your eyes moving forward and let each hand respond to the pattern in front of you.",
  "Working toward a new goal is more manageable when the next step is clear. Complete one exercise, review the keys that caused difficulty, and choose a short drill for your next session. A small plan keeps practice purposeful without making it feel like a chore. As confidence grows, add longer passages and more varied material while preserving the same careful technique.",
  "The best practice pace is one you can maintain with control. If your hands begin to hurry, slow down until each movement feels deliberate again. When accuracy is stable, make a small increase and observe how it feels. This gradual approach helps your fingers learn useful patterns while protecting the comfortable rhythm that will support faster typing later.",
  "Clear documentation helps a team share knowledge. A useful note explains what changed, why it matters, and what someone should do next. Headings and short paragraphs make details easier to find, while precise punctuation prevents confusion. Typing these kinds of passages offers practice with the language people use in everyday work and encourages careful attention to the complete message.",
  "A fresh start is available each time you sit down to practice. Let go of the last mistake, find the home row, and focus on the next phrase. The hands do not need to move forcefully; light, accurate touches are enough. With repeated sessions, the pauses between thoughts become shorter and the movement across familiar words begins to feel more natural.",
];

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function makeTypingTestText(style: TestStyle, targetLength?: number) {
  const bank = style === "sentences" ? sentences : paragraphs;
  const requestedLength = targetLength ?? (style === "sentences" ? 4600 : 5000);
  const separator = style === "sentences" ? " " : "\n\n";
  const chunks: string[] = [];
  let deck: string[] = [];
  let currentLength = 0;

  while (currentLength < requestedLength) {
    if (deck.length === 0) deck = shuffled(bank);
    const next = deck.pop()!;
    chunks.push(next);
    currentLength += next.length + (chunks.length > 1 ? separator.length : 0);
  }

  return chunks.join(separator);
}
