/**
 * ASSIST LAYER
 * ------------
 * The people who need this most are not the people who read a dashboard.
 *
 * Research on low-literacy users in India is blunt about it: in mobile banking
 * tasks, graphical interfaces reached 100% task completion where text-only
 * interfaces reached 0%. Voice annotation plus local language plus simple
 * navigation is not a nice-to-have for this audience, it is the difference
 * between using the thing and not.
 *
 * So the same engine gets two front doors:
 *   simple   - one question per screen, large type, spoken aloud, Hindi first
 *   detailed - the full workspace, for HR staff, agents and confident users
 *
 * Speech uses the browser's own SpeechSynthesis rather than a server round trip.
 * On a slow connection a spoken prompt that takes 3 seconds to arrive is worse
 * than useless, and this works offline.
 */

export type Lang = 'en' | 'hi';
export type Mode = 'simple' | 'detailed';
export type TextScale = 'normal' | 'large' | 'largest';
/**
 * A genuine high-contrast mode, not a dark theme.
 * Pure black on pure white is 21:1, the maximum the sRGB gamut allows and well
 * beyond the 7:1 that WCAG AAA asks for. It exists for low vision and for the
 * daylight-on-a-cheap-phone-screen case, which is most of this audience.
 */
export type Contrast = 'normal' | 'high';

export interface AssistPrefs {
  lang: Lang;
  mode: Mode;
  scale: TextScale;
  contrast: Contrast;
  speak: boolean;
  /** someone is filling this in on behalf of the member */
  assisted: boolean;
}

export const DEFAULT_PREFS: AssistPrefs = {
  lang: 'en',
  mode: 'simple',
  scale: 'normal',
  contrast: 'normal',
  speak: false,
  assisted: false,
};

const KEY = 'pf-assist-prefs';

export function loadPrefs(): AssistPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: AssistPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode, prefs just do not persist */
  }
}

export const SCALE_FACTOR: Record<TextScale, number> = {
  normal: 1,
  large: 1.18,
  largest: 1.38,
};

/* ------------------------------------------------------------------ */
/* Speech                                                              */
/* ------------------------------------------------------------------ */

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Pick the best available voice for the language, preferring an Indian one. */
function pickVoice(lang: Lang): SpeechSynthesisVoice | null {
  if (!canSpeak()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const want = lang === 'hi' ? 'hi' : 'en';
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith(want === 'hi' ? 'hi-in' : 'en-in')) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(want)) ??
    null
  );
}

export function speak(text: string, lang: Lang) {
  if (!canSpeak() || !text.trim()) return;
  stopSpeaking();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(lang);
  if (v) u.voice = v;
  u.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
  // Slower than default. This audience is not skimming.
  u.rate = lang === 'hi' ? 0.88 : 0.92;
  u.pitch = 1;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  return canSpeak() && window.speechSynthesis.speaking;
}

/* ------------------------------------------------------------------ */
/* Copy                                                                */
/* ------------------------------------------------------------------ */

type Dict = Record<string, { en: string; hi: string }>;

/**
 * Hindi here is deliberately plain spoken Hindi, not the Sanskritised register
 * government forms use. "अपना पैसा" not "स्व-निधि". If a member cannot read the
 * official form, a translation in the same register does not help them.
 */
export const T: Dict = {
  appName: { en: 'PF Precheck', hi: 'पीएफ प्रीचेक' },
  tagline: {
    en: 'It is your money. This gives you something to hold them to.',
    hi: 'पैसा आपका है। यह आपको उन्हें पकड़ने का आधार देता है।',
  },
  taglineSub: {
    en: 'Before you apply, while you wait, after a rejection',
    hi: 'आवेदन से पहले, इंतज़ार के दौरान, और रिजेक्शन के बाद',
  },
  contrastOn: { en: 'High contrast', hi: 'गहरा कंट्रास्ट' },
  contrastOff: { en: 'Normal contrast', hi: 'सामान्य कंट्रास्ट' },

  specLink: {
    en: 'What EPFO should return instead',
    hi: 'ईपीएफओ को इसके बदले क्या देना चाहिए',
  },

  q_what: { en: 'What do you want to do?', hi: 'आप क्या करना चाहते हैं?' },
  opt_before: {
    en: 'I want to take money out',
    hi: 'मुझे पैसा निकालना है',
  },
  opt_before_sub: {
    en: 'Check if it will be approved, before you apply',
    hi: 'आवेदन से पहले जांचिए कि मंज़ूर होगा या नहीं',
  },
  opt_waiting: {
    en: 'I applied, money has not come',
    hi: 'मैंने आवेदन किया, पैसा नहीं आया',
  },
  opt_waiting_sub: {
    en: "See if it is past EPFO's own 20 day limit",
    hi: 'देखिए कि ईपीएफओ की 20 दिन की सीमा पार हुई या नहीं',
  },
  opt_rejected: {
    en: 'My claim was rejected',
    hi: 'मेरा क्लेम रिजेक्ट हो गया',
  },
  opt_rejected_sub: {
    en: 'Get the exact number the rule wanted, in plain words',
    hi: 'नियम को कितना चाहिए था, वह सटीक संख्या आसान भाषा में',
  },

  q_amount: { en: 'How much do you need?', hi: 'आपको कितना पैसा चाहिए?' },
  q_filed_when: { en: 'When did you apply?', hi: 'आपने कब आवेदन किया था?' },
  q_status_now: {
    en: 'What does the status say right now?',
    hi: 'अभी स्टेटस में क्या लिखा है?',
  },

  back: { en: 'Back', hi: 'पीछे' },
  next: { en: 'Next', hi: 'आगे' },
  listen: { en: 'Listen', hi: 'सुनिए' },
  stop: { en: 'Stop', hi: 'रोकिए' },
  bigText: { en: 'Bigger text', hi: 'बड़े अक्षर' },
  helping: { en: 'I am helping someone else', hi: 'मैं किसी और की मदद कर रहा हूँ' },

  days_late: { en: 'days late', hi: 'दिन की देरी' },
  limit_is: { en: "EPFO's own limit is 20 days", hi: 'ईपीएफओ की अपनी सीमा 20 दिन है' },

  detailed: { en: 'Detailed view', hi: 'विस्तृत जानकारी' },
  simple: { en: 'Simple view', hi: 'आसान जानकारी' },

  synthetic: {
    en: 'Practice data only. Never type your real UAN or bank number.',
    hi: 'यह सिर्फ अभ्यास है। अपना असली यूएएन या बैंक नंबर कभी न लिखें।',
  },
};

export function t(key: string, lang: Lang): string {
  return T[key]?.[lang] ?? T[key]?.en ?? key;
}

/** Number spoken the way an Indian speaker says it, for the voice layer. */
export function spokenAmount(n: number, lang: Lang): string {
  if (n >= 10000000) {
    const cr = n / 10000000;
    return lang === 'hi' ? `${cr} करोड़ रुपये` : `${cr} crore rupees`;
  }
  if (n >= 100000) {
    const l = +(n / 100000).toFixed(1);
    return lang === 'hi' ? `${l} लाख रुपये` : `${l} lakh rupees`;
  }
  if (n >= 1000) {
    const k = Math.round(n / 1000);
    return lang === 'hi' ? `${k} हज़ार रुपये` : `${k} thousand rupees`;
  }
  return lang === 'hi' ? `${n} रुपये` : `${n} rupees`;
}
