/* ====================================================================
   SocialStory — Opening intro slideshow + post-quest reflection
==================================================================== */

const STORY_PAGES = [
  {
    icon: '🌤️',
    text: '<strong>Welcome, Guardian!</strong><br><br>Deep in a magical world, feelings are like weather. On bright days, the sun shines and everything feels <em>easy and calm</em>.',
  },
  {
    icon: '🌥️',
    text: 'But some days, <strong>clouds come</strong>. Sometimes we feel <em>nervous</em> — like a misty morning that makes it hard to see. That\'s okay.',
  },
  {
    icon: '⛈️',
    text: 'And some days it <strong>storms inside</strong> — like a volcano rumbling with anger, or rain that feels heavy and sad. Those feelings are okay too.',
  },
  {
    icon: '🛡️',
    text: 'You are the <strong>Guardian of Calm</strong>. Your job isn\'t to make the storms disappear — it\'s to <em>breathe through them</em> and help others find their calm too.',
  },
  {
    icon: '🗺️',
    text: '<strong>Your tools on this journey:</strong><br>💎 Collect <em>Calm Crystals</em> by helping creatures<br>🌬️ Hold <kbd>SPACE</kbd> to breathe when overwhelmed<br>💬 Use kind, brave words to help others<br>👁️ Shine your <em>Truth Lantern</em> on scary thoughts',
  },
  {
    icon: '🌋🌫️💙',
    text: 'Three islands need your Guardian help!<br><br><strong>🌋 Volcanic Valley</strong> — where anger burns<br><strong>🌫️ Misty Marsh</strong> — where worry fogs every path<br><strong>💙 Blue Valley</strong> — where sadness slows every step<br><br><em>Press Next or SPACE to begin your quest!</em>',
  },
];

const TRUTH_STATEMENTS = [
  '"Mistakes help me learn. I am safe to try."',
  '"I can take a deep breath when I feel angry."',
  '"I can ask for help when things feel hard."',
  '"My feelings are not wrong — I just need to handle them well."',
  '"I can be brave even when I\'m scared."',
  '"Being kind to others makes me feel better too."',
];

// ==================================================================
export class SocialStory {
  constructor(onComplete) {
    this._onComplete  = onComplete;
    this._page        = 0;

    this._overlay  = document.getElementById('social-story-overlay');
    this._iconEl   = document.getElementById('story-icon');
    this._textEl   = document.getElementById('story-text');
    this._dotsEl   = document.getElementById('story-dots');
    this._nextBtn  = document.getElementById('story-next-btn');

    this._nextBtn.addEventListener('click',  () => this._advance());
    this._keyHandler = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this._advance();
      }
    };
  }

  // ------------------------------------------------------------------
  start() {
    this._overlay.style.display = 'flex';
    document.addEventListener('keydown', this._keyHandler);
    this._show(0);
  }

  // ------------------------------------------------------------------
  _show(idx) {
    const p = STORY_PAGES[idx];
    this._iconEl.innerHTML = p.icon;
    this._textEl.innerHTML = p.text;
    this._nextBtn.textContent = idx === STORY_PAGES.length - 1 ? 'Begin Quest! ⚔️' : 'Next →';

    // Progress dots
    this._dotsEl.innerHTML = STORY_PAGES
      .map((_, i) => '<span class="story-dot' +
        (i === idx ? ' active' : i < idx ? ' done' : '') + '"></span>')
      .join('');
  }

  // ------------------------------------------------------------------
  _advance() {
    this._page++;
    if (this._page >= STORY_PAGES.length) {
      this._overlay.style.display = 'none';
      document.removeEventListener('keydown', this._keyHandler);
      this._onComplete();
    } else {
      this._show(this._page);
    }
  }
}

// ==================================================================
// Post-quest reflection — called from main.js
// ==================================================================
export function showReflection(crystalCount) {
  const overlay  = document.getElementById('reflection-overlay');
  const intro    = document.getElementById('reflection-intro');
  const choices  = document.getElementById('reflection-choices');
  const chosen   = document.getElementById('reflection-chosen');
  const stmt     = document.getElementById('reflection-statement');
  const closeBtn = document.getElementById('reflection-close');

  intro.textContent =
    'You collected ' + crystalCount + ' Calm Crystal' + (crystalCount !== 1 ? 's' : '') +
    ' and restored peace to all three islands! 🌟';

  choices.innerHTML = '';
  chosen.style.display = 'none';

  TRUTH_STATEMENTS.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'ref-choice-btn';
    btn.textContent = s;
    btn.addEventListener('click', () => {
      stmt.textContent = s;
      chosen.style.display = 'flex';
      choices.style.display = 'none';
    });
    choices.appendChild(btn);
  });

  closeBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    _showEndScreen();
  }, { once: true });

  overlay.style.display = 'flex';
}

// ==================================================================
function _showEndScreen() {
  // Simple thank-you overlay using the social story overlay
  const overlay = document.getElementById('social-story-overlay');
  const icon    = document.getElementById('story-icon');
  const text    = document.getElementById('story-text');
  const dots    = document.getElementById('story-dots');
  const btn     = document.getElementById('story-next-btn');

  icon.innerHTML = '🌟';
  text.innerHTML =
    '<strong>Quest Complete, Guardian!</strong><br><br>' +
    'You showed the world that <em>feelings can be understood</em>,' +
    ' that brave words have power, and that one deep breath can change everything.<br><br>' +
    '<span style="color:#FFD700;font-size:0.88rem">Made with ❤️ for Valerie\'s students</span>';
  dots.innerHTML = '';
  btn.textContent = '🔄 Play Again';
  btn.onclick = () => location.reload();
  overlay.style.display = 'flex';
}
