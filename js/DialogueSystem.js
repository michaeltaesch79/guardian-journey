/* ====================================================================
   DialogueSystem — NPC dialogue trees with correct/wrong choices
==================================================================== */

const DIALOGUES = {
  'anger-1': {
    portrait: '🌋',
    name: 'Lava Rock',
    text: '"Someone knocked over my tower and I want to SMASH everything! I am SO ANGRY!"',
    choices: [
      { label: 'Push them and yell "I HATE YOU!" really loud.',   correct: false,
        wrong: 'Pushing and yelling usually makes things worse — and hurts feelings even more. Let\'s try expressing it with words.' },
      { label: 'Stomp away and ignore everyone forever.',          correct: false,
        wrong: 'Ignoring our feelings doesn\'t help them go away. There\'s a better way to let others know how we feel.' },
      { label: '"I feel angry when you knock over my tower without asking."', correct: true,
        right: '🌟 That\'s an I-Statement! Sharing how YOU feel — without blame — helps others understand. The Lava Rock feels a little cooler now!' },
    ]
  },

  'anger-2': {
    portrait: '🔥',
    name: 'Steam Cloud',
    text: '"We lost the game and it\'s NOT FAIR! I worked so hard and now I feel like giving up FOREVER."',
    choices: [
      { label: 'Quit the game and never play again!',              correct: false,
        wrong: 'Quitting when things are tough can keep us from getting better. Feelings ARE hard — but they pass!' },
      { label: 'Blame everyone on the team.',                      correct: false,
        wrong: 'Blaming others usually hurts friendships. Let\'s try sharing how WE feel instead.' },
      { label: '"I feel frustrated when we lose, but I can try again!"', correct: true,
        right: '🌟 Wonderful! Naming your feelings and choosing to try again is so brave. The Steam Cloud feels lighter!' },
    ]
  },

  'anxiety-1': {
    portrait: '👻',
    name: 'What-If Shadow',
    text: '"What if I try and FAIL? What if everyone LAUGHS? I\'m too scared to even start!"',
    choices: [
      { label: 'Never try anything new — just to be safe.',        correct: false,
        wrong: 'Staying safe can sometimes keep us from growing. Mistakes aren\'t the end — they\'re how we learn!' },
      { label: 'Hide and pretend you\'re sick so you don\'t have to go.', correct: false,
        wrong: 'Hiding from fears can make them feel even bigger. There is a braver way forward.' },
      { label: '"Mistakes help me learn. I am safe to try."',       correct: true,
        right: '🌟 Perfect! That\'s a Truth Lantern thought. Brave try! The Shadow gets a little smaller now.' },
    ]
  },

  'anxiety-2': {
    portrait: '🌫️',
    name: 'Worry Fog',
    text: '"What if nobody likes me at the new school? What if I have no friends — EVER?"',
    choices: [
      { label: 'Decide everyone will hate you before you even arrive.', correct: false,
        wrong: 'Our brain sometimes imagines the worst. The future hasn\'t happened yet — we can\'t know for sure!' },
      { label: 'Stay home and never go.',                           correct: false,
        wrong: 'Running from worries makes them grow. There\'s a better way to face the fog.' },
      { label: '"I can be a good friend. I\'ll try talking to one person."', correct: true,
        right: '🌟 That\'s courageous! One small step clears the fog. The Worry Fog is lifting!' },
    ]
  },

  'sadness-1': {
    portrait: '😢',
    name: 'Blue Cloud',
    text: '"Nobody ever wants to play with me. I am always alone… Maybe I don\'t matter."',
    choices: [
      { label: 'You probably deserve to be alone.',                 correct: false,
        wrong: 'Every single person matters — especially when they are hurting. Let\'s try kindness.' },
      { label: 'Just stop feeling sad.',                            correct: false,
        wrong: 'We can\'t just turn off feelings. But we CAN help someone feel less alone.' },
      { label: '"I see you and you matter. Would you like to play?"', correct: true,
        right: '🌟 That\'s the Kindness Compass! Seeing others and saying so can change everything. The Blue Cloud brightens!' },
    ]
  },

  'sadness-2': {
    portrait: '🌧️',
    name: 'Drooping Flower',
    text: '"Everything feels too hard today. I can\'t do anything right. I give up."',
    choices: [
      { label: 'You should just give up then.',                     correct: false,
        wrong: 'Even on our hardest days, giving up isn\'t the answer. Kindness and encouragement can lift others.' },
      { label: '"Just smile! Be happy!"',                           correct: false,
        wrong: 'Telling someone to "just cheer up" can feel dismissive. Let\'s try understanding them first.' },
      { label: '"You\'re doing your best and that\'s enough. I\'m proud of you."', correct: true,
        right: '🌟 That\'s the most powerful kind of kindness — seeing someone\'s effort. The Flower begins to bloom!' },
    ]
  },
};

// ------------------------------------------------------------------
export class DialogueSystem {
  constructor() {
    this.active   = false;
    this._cb      = null;
    this._dlgId   = null;
    this._answered = false;

    const ov  = document.getElementById('dialogue-overlay');
    this._overlay  = ov;
    this._portrait = document.getElementById('dialogue-portrait');
    this._name     = document.getElementById('dialogue-name');
    this._text     = document.getElementById('dialogue-text');
    this._choices  = document.getElementById('dialogue-choices');
    this._feedback = document.getElementById('dialogue-feedback');
    this._contBtn  = document.getElementById('dialogue-continue');

    if (this._contBtn) {
      this._contBtn.addEventListener('click', () => this._handleContinue());
    }
  }

  // ------------------------------------------------------------------
  open(dialogueId, onComplete) {
    const dlg = DIALOGUES[dialogueId];
    if (!dlg) return;

    this._dlgId    = dialogueId;
    this._cb       = onComplete;
    this._answered = false;
    this.active    = true;

    this._portrait.textContent = dlg.portrait;
    this._name.textContent     = dlg.name;
    this._text.textContent     = dlg.text;
    this._feedback.style.display  = 'none';
    this._feedback.className      = '';
    this._contBtn.style.display   = 'none';

    this._choices.innerHTML = '';
    dlg.choices.forEach((ch, i) => {
      const btn = document.createElement('button');
      btn.className   = 'dlg-choice';
      btn.textContent = ch.label;
      btn.addEventListener('click', () => this._handleChoice(i));
      this._choices.appendChild(btn);
    });

    this._overlay.style.display = 'flex';
  }

  // ------------------------------------------------------------------
  _handleChoice(idx) {
    if (this._answered) return;
    this._answered = true;

    const dlg  = DIALOGUES[this._dlgId];
    const ch   = dlg.choices[idx];
    const btns = this._choices.querySelectorAll('.dlg-choice');

    // Disable all buttons & highlight
    btns.forEach((b, i) => {
      b.disabled = true;
      if (i === idx) b.classList.add(ch.correct ? 'correct' : 'wrong');
      if (!ch.correct && dlg.choices[i].correct) b.classList.add('correct');
    });

    this._feedback.style.display = 'block';
    if (ch.correct) {
      this._feedback.textContent  = ch.right;
      this._feedback.className    = '';
    } else {
      this._feedback.textContent  = ch.wrong;
      this._feedback.className    = 'wrong-feedback';
      // Allow retry after reading feedback
      setTimeout(() => this._allowRetry(), 2200);
      return;
    }

    this._contBtn.textContent   = 'Great! ✨ Continue';
    this._contBtn.style.display = 'inline-block';
  }

  // ------------------------------------------------------------------
  _allowRetry() {
    if (!this.active) return;
    // Re-enable choices for another try
    this._answered = false;
    const btns = this._choices.querySelectorAll('.dlg-choice');
    btns.forEach(b => {
      b.disabled = false;
      b.className = 'dlg-choice';
    });
    this._feedback.style.display = 'none';
  }

  // ------------------------------------------------------------------
  _handleContinue() {
    this.close(true);
  }

  // ------------------------------------------------------------------
  close(success = false) {
    this.active = false;
    this._overlay.style.display = 'none';
    const cb = this._cb;
    this._cb = null;
    if (cb) cb(success);
  }
}
