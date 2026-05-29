export type Memory = {
  id: string;
  date: string;
  title: string;
  text: string;
  photos: string[];
  hiddenNote: string;
  unlockAt?: string;
  constellation: {
    x: number;
    y: number;
  };
};

export type DiaryEntry = {
  id: string;
  date: string;
  title: string;
  note: string;
  mood: "soft" | "safe" | "longing" | "magic" | "future";
  photo?: string;
};

export type Reminder = {
  id: string;
  date: string;
  title: string;
  note: string;
  kind: "anniversary" | "promise" | "care" | "dream";
};

export type ChatMessage = {
  id: string;
  author: "me" | "her";
  body: string;
  createdAt: string;
  reaction?: string;
  image?: string;
  voice?: string;
  pinned?: boolean;
};

export const universe = {
  herName: "Twinkle",
  myName: "Ansh",
  siteId: "twinkle-universe",
  trackTitle: "Ajj Din Chadheya",
  firstConversationAt: "2023-02-11T00:00:00+05:30",
  firstMeetingAt: "2026-01-28T15:38:08+05:30",
  relationshipStartedAt: "2026-01-23T00:00:00+05:30",
  finalMessage:
    "To the one who changed everything,\n\nI have been trying to find the right words for a long time. The truth is — no words are enough. But I want to try.\n\nDo you know what happens to me every time I see you? I lose myself completely. My eyes struggle to believe that you are actually standing in front of me. It takes me around twenty minutes to compose myself — not because I'm nervous, but because you are genuinely too much for my heart to process all at once.\n\nWhen you look at me, I look away. And the moment you're not looking — I go back to looking at you. Your eyes. Your smile. The way you carry yourself. Your simplicity is one of the most beautiful things I have ever known.\n\nBefore you, I was just living. After you, I started feeling alive. You made colours brighter, mornings lighter, and the future something I actually look forward to.\n\nAnd even though I have found you — even though you are right here — I still wake up afraid of losing you. Not because I don't trust us. But because you mean that much to me.\n\nThis little universe I've built — it is yours. Every star in here is a memory of you. Every word is something I've felt but couldn't always say. I want to spend my life with you. And I mean that with everything I have.\n\n— Yours, always 💜"
};

export const poemLines = [
  { text: "फिर से हवाओं से बातें करने लगा हूँ,", tone: "quiet" },
  { text: "फिर से पंख ले के उड़ने लगा हूँ।", tone: "quiet" },
  { text: "कोई पूछे मेरा हाल तो कहता हूँ,", tone: "warm" },
  { text: "उसकी सादगी पे मरने लगा हूँ।", tone: "warm" },
  { text: "और अभी तो ठीक से पाया भी नहीं उसको,", tone: "moon" },
  { text: "अभी से उसको खोने से डरने लगा हूँ।", tone: "moon", effect: "butterfly" }
];

export const seedMemories: Memory[] = [
  {
    id: "first-instagram-message",
    date: "2023-02-11",
    title: "The First Instagram Message",
    text: "On Instagram, one message quietly opened a door neither of us could see yet. The universe began in a notification.",
    photos: ["/memories/eyes-never-lie.jpg"],
    hiddenNote:
      "I still think about how something as small as pressing send became the beginning of everything I now protect with my whole heart.",
    constellation: { x: 9, y: 24 }
  },
  {
    id: "first-real-conversation",
    date: "2026-01-23",
    title: "Pehli Baar Sahi Se Baat Hui",
    text: "On this day, the talking finally felt real. Not just messages, not just passing words. A रिश्ता quietly found its beginning.",
    photos: ["/memories/half-frame.jpg", "/memories/held-hands.jpg"],
    hiddenNote:
      "January 23, 2026 is where the silence between us changed. It became comfort, trust, and the first real shape of us.",
    constellation: { x: 22, y: 52 }
  },
  {
    id: "first-meeting",
    date: "2026-01-28",
    title: "Pehli Baar Hum Mile",
    text: "January 28, 2026. The first time we met. A car became a small universe, two nervous smiles became a memory, and everything ordinary became sacred.",
    photos: ["/memories/first-meeting-sacred.jpg", "/memories/first-meeting-soft.jpg"],
    hiddenNote:
      "I remember this as the day your presence stopped being only a thought and became real in front of me. My heart still keeps that first meeting carefully.",
    constellation: { x: 14, y: 40 }
  },
  {
    id: "the-eyes",
    date: "2026-02-03",
    title: "The Eyes Never Lie",
    text: "Some photos do not capture faces. They keep proof that souls recognized each other before words could catch up.",
    photos: ["/memories/eyes-never-lie.jpg"],
    hiddenNote:
      "Your eyes have always made honesty look gentle. I hope you never doubt how deeply I notice them.",
    constellation: { x: 31, y: 22 }
  },
  {
    id: "white-glasses",
    date: "2026-02-08",
    title: "The Little Mischief We Became",
    text: "There was laughter in the middle of shyness, and somehow even the silly sunglasses looked like destiny being unserious.",
    photos: ["/memories/car-glasses.jpg", "/memories/car-laughing.jpg"],
    hiddenNote:
      "I love the version of us that can be soft and ridiculous in the same breath.",
    constellation: { x: 48, y: 54 }
  },
  {
    id: "held-hands",
    date: "2026-02-14",
    title: "A Promise Without Noise",
    text: "Hands do what words sometimes cannot. They say stay. They say I am here. They say I choose this.",
    photos: ["/memories/held-hands.jpg"],
    hiddenNote:
      "If I could keep one feeling safe forever, it would be the quiet trust in this photograph.",
    constellation: { x: 67, y: 32 }
  },
  {
    id: "black-white-smile",
    date: "2026-03-01",
    title: "Moonlight Smile",
    text: "Even in black and white, you make the world feel full of color.",
    photos: ["/memories/black-white-smile.jpg"],
    hiddenNote:
      "Your smile is not small to me. It has changed the weather of entire days.",
    constellation: { x: 80, y: 58 }
  },
  {
    id: "future-letter",
    date: "2027-01-28",
    title: "Future Wedding Letter",
    text: "A star waiting for its day. Some words should ripen slowly.",
    photos: ["/memories/cassette-smile.jpg", "/memories/half-frame.jpg", "/memories/shoulder-close.jpg"],
    hiddenNote:
      "Open this when life feels too heavy: I am still here. Still choosing you. Still building a forever that feels gentle.",
    unlockAt: "2027-01-28T00:00:00+05:30",
    constellation: { x: 90, y: 18 }
  },
  {
    id: "beautiful-drive",
    date: "2026-05-28",
    title: "A Beautiful Drive Together",
    text: "A magical day with beautiful selfies. Some drives aren't about the destination, but the smiles we share along the way.",
    photos: ["/memories/drive-1.jpg", "/memories/drive-2.jpg", "/memories/drive-3.jpg", "/memories/drive-4.jpg"],
    hiddenNote: "I'll never get bored of seeing you smile.",
    constellation: { x: 55, y: 80 }
  }
];

export const seedDiary: DiaryEntry[] = [
  {
    id: "diary-1",
    date: "2026-05-28T00:00:00+05:30",
    title: "A universe that keeps growing",
    note: "Today I built a place where our memories do not just sit still. They glow, breathe, and wait to be found.",
    mood: "magic",
    photo: "/memories/held-hands.jpg"
  }
];

export const seedReminders: Reminder[] = [
  {
    id: "reminder-1",
    date: "2027-01-28",
    title: "First meeting anniversary",
    note: "Let the whole sky get a little brighter for her.",
    kind: "anniversary"
  },
  {
    id: "reminder-2",
    date: "2026-12-31",
    title: "Open when sad note",
    note: "Write one honest paragraph she can return to on a difficult day.",
    kind: "care"
  }
];

export const seedMessages: ChatMessage[] = [
  {
    id: "message-1",
    author: "me",
    body: "I made this little universe because ordinary words felt too small.",
    createdAt: "2026-05-28T21:55:00+05:30",
    pinned: true
  },
  {
    id: "message-2",
    author: "her",
    body: "Then keep adding stars.",
    createdAt: "2026-05-28T21:59:00+05:30",
    reaction: "always"
  }
];
