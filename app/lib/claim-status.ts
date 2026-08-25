/**
 * THE ACCOUNTABILITY CLOCK
 * ------------------------
 * Pre-check answers "will this be rejected". This answers the question the
 * community is actually drowning in right now: "I filed weeks ago, it still says
 * Submitted at Portal, is it stuck, and what actually moves it?"
 *
 * The lever almost no member knows about: EPFO's own Citizens' Charter sets a
 * 20 day outer limit, and a delay beyond that without justification attracts
 * 12% penal interest which is recoverable from the responsible official. A
 * grievance that cites the day count and that consequence is a different
 * document from one that asks politely.
 *
 * Every figure here is sourced in SOURCES below and shown in the UI.
 */

export type StatusStage =
  | 'submitted'
  | 'under-process'
  | 'approved'
  | 'settled'
  | 'rejected';

export type ClaimRoute = 'auto' | 'manual';

export interface StatusInput {
  /** ISO date the claim was filed */
  filedOn: string;
  /** output language. Switching to Hindi must translate the ADVICE, not just labels. */
  lang?: 'en' | 'hi';
  claimType: '31' | '19' | '10C';
  amount: number;
  stage: StatusStage;
  office: string;
  /** did the member already raise an EPFiGMS grievance */
  grievanceRaised: boolean;
}

export interface EscalationStep {
  id: string;
  title: string;
  detail: string;
  cost: string;
  typicalEffect: string;
  unlockedAtDay: number;
  /** stops being advice once the clock passes this day */
  expiresAtDay?: number;
  owner: string;
}

export interface StatusVerdict {
  daysElapsed: number;
  workingDaysElapsed: number;
  route: ClaimRoute;
  expectedDays: number;
  charterLimit: number;
  overdueBy: number;
  severity: 'on-track' | 'watch' | 'breached' | 'severe';
  headline: string;
  summary: string;
  /** penal interest the member can point at, if past the charter limit */
  penalInterest: { applies: boolean; ratePercent: number; note: string };
  owner: { role: string; name: string; whatTheyDo: string };
  unlocked: EscalationStep[];
  locked: EscalationStep[];
  migrationNote: string | null;
}

export const SOURCES = {
  charter20: {
    claim: 'A complete claim must be settled within 20 days.',
    where: "EPFO Citizens' / Clients' Charter",
  },
  penal12: {
    claim:
      'Delay beyond 20 days without justification attracts 12% penal interest, recoverable from the responsible official.',
    where: 'EPFO claim settlement norms, reported publicly',
  },
  auto72: {
    claim:
      'Auto settlement processes a fully compliant claim within 72 hours. The auto settlement ceiling was raised from Rs 1 lakh to Rs 5 lakh.',
    where: 'Ministry of Labour and Employment announcements',
  },
  grievance7: {
    claim: 'Grievance redressal is 7 working days under the Citizens\' Charter.',
    where: "EPFO Citizens' / Clients' Charter",
  },
  migration: {
    claim:
      'Member services were suspended from 26 June to 3 July 2026 for the EPFO 3.0 migration, and EPFO advised that claims may take up to two weeks longer than usual afterwards.',
    where: 'EPFO service notices, reported publicly',
  },
} as const;

/** The EPFO 3.0 / CITES migration window. Claims filed near it ran late. */
const MIGRATION_START = new Date('2026-06-26T00:00:00Z').getTime();
const MIGRATION_END = new Date('2026-07-03T23:59:59Z').getTime();

const CHARTER_LIMIT = 20;
const AUTO_DAYS = 3;
const MANUAL_DAYS = 10;
/** Auto settlement ceiling after the 2026 revision. */
const AUTO_CEILING = 500000;

export function workingDaysBetween(from: Date, to: Date): number {
  let n = 0;
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (d < end) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) n += 1;
  }
  return n;
}

/**
 * Who is actually sitting on the file at each stage. Members chase "EPFO",
 * which is not a person. These are the roles that exist.
 */
type Bi = { en: string; hi: string };
const pick = (b: Bi, lang: 'en' | 'hi') => b[lang];

const OWNERS: Record<StatusStage, { role: Bi; name: Bi; whatTheyDo: Bi }> = {
  submitted: {
    role: { en: 'Dealing Assistant', hi: 'डीलिंग असिस्टेंट' },
    name: { en: 'Field office, claims section', hi: 'क्षेत्रीय कार्यालय, क्लेम अनुभाग' },
    whatTheyDo: {
      en: 'Opens the claim, checks KYC, service history and the Annexure K trail. Nothing has been decided yet at this stage.',
      hi: 'यह अधिकारी आपका क्लेम खोलकर केवाईसी, नौकरी का रिकॉर्ड और ट्रांसफर की जानकारी जांचता है। इस चरण पर अभी कोई फैसला नहीं हुआ है।',
    },
  },
  'under-process': {
    role: { en: 'Section Supervisor', hi: 'सेक्शन सुपरवाइज़र' },
    name: { en: 'Field office, claims section', hi: 'क्षेत्रीय कार्यालय, क्लेम अनुभाग' },
    whatTheyDo: {
      en: "Verifies the assistant's work and either approves or raises an objection. Most delays past 20 days sit here.",
      hi: 'यह अधिकारी नीचे के काम की जांच करके या तो मंज़ूरी देता है या आपत्ति लगाता है। 20 दिन से ज़्यादा की ज़्यादातर देरी यहीं अटकती है।',
    },
  },
  approved: {
    role: { en: 'Accounts Officer', hi: 'लेखा अधिकारी' },
    name: { en: 'Field office, accounts', hi: 'क्षेत्रीय कार्यालय, लेखा विभाग' },
    whatTheyDo: {
      en: 'Releases the payment instruction to your bank. Credit usually follows within 2 to 3 working days.',
      hi: 'यह अधिकारी आपके बैंक को भुगतान का आदेश भेजता है। पैसा आमतौर पर 2 से 3 कार्य दिवस में आ जाता है।',
    },
  },
  settled: {
    role: { en: 'Your bank', hi: 'आपका बैंक' },
    name: { en: 'Beneficiary bank', hi: 'लाभार्थी बैंक' },
    whatTheyDo: {
      en: 'The money has left EPFO. If it has not landed, the delay is on the bank side.',
      hi: 'पैसा ईपीएफओ से निकल चुका है। अगर अब भी नहीं आया, तो देरी बैंक की तरफ से है।',
    },
  },
  rejected: {
    role: { en: 'You', hi: 'आप' },
    name: { en: 'Member', hi: 'सदस्य' },
    whatTheyDo: {
      en: 'A rejection is not the end. Decode the reason, fix the specific field, and refile or file a grievance.',
      hi: 'रिजेक्ट होना अंत नहीं है। कारण समझिए, उसी एक चीज़ को ठीक कीजिए, और दोबारा आवेदन कीजिए या शिकायत दर्ज कीजिए।',
    },
  },
};

interface RawStep {
  id: string;
  title: Bi;
  detail: Bi;
  cost: Bi;
  typicalEffect: Bi;
  unlockedAtDay: number;
  expiresAtDay?: number;
  owner: Bi;
}

const LADDER: RawStep[] = [
  {
    id: 'wait',
    title: {
      en: 'Wait, this is still inside the normal window',
      hi: 'अभी इंतज़ार कीजिए, यह सामान्य समय के अंदर है',
    },
    detail: {
      en: 'Nothing you do right now speeds this up, and refiling resets your place in the queue. Check again after the charter limit.',
      hi: 'अभी कुछ भी करने से यह जल्दी नहीं होगा, और दोबारा आवेदन करने से आपका नंबर फिर से पीछे चला जाएगा। 20 दिन के बाद दोबारा देखिए।',
    },
    cost: { en: 'Free', hi: 'मुफ़्त' },
    typicalEffect: {
      en: 'Most compliant claims settle without any intervention.',
      hi: 'ज़्यादातर सही क्लेम बिना कुछ किए ही निपट जाते हैं।',
    },
    unlockedAtDay: 0,
    expiresAtDay: CHARTER_LIMIT,
    owner: { en: 'Nobody yet', hi: 'अभी कोई नहीं' },
  },
  {
    id: 'epfigms',
    title: { en: 'Raise an EPFiGMS grievance', hi: 'ईपीएफआईजीएमएस पर शिकायत दर्ज कीजिए' },
    detail: {
      en: 'This is the official channel and it creates a tracked ticket against your specific claim. Quote your claim reference and the day count, not a general complaint.',
      hi: 'यह सरकारी रास्ता है और इससे आपके क्लेम पर एक ट्रैक होने वाला टिकट बनता है। सामान्य शिकायत मत लिखिए, अपना क्लेम नंबर और कितने दिन हुए, यह लिखिए।',
    },
    cost: { en: 'Free', hi: 'मुफ़्त' },
    typicalEffect: {
      en: 'Charter says grievances are answered in 7 working days.',
      hi: 'नियम कहता है कि शिकायत का जवाब 7 कार्य दिवस में मिलना चाहिए।',
    },
    unlockedAtDay: 21,
    owner: { en: 'Regional Office grievance cell', hi: 'क्षेत्रीय कार्यालय शिकायत प्रकोष्ठ' },
  },
  {
    id: 'rti',
    title: { en: 'File an RTI on your own claim file', hi: 'अपनी ही फाइल पर आरटीआई लगाइए' },
    detail: {
      en: 'Ask for the current status, the officer holding it, the date of each internal movement, and the reason for delay beyond the charter limit. This is the step members report as the one that works.',
      hi: 'पूछिए कि अभी स्थिति क्या है, फाइल किस अधिकारी के पास है, कब-कब आगे बढ़ी, और 20 दिन से ज़्यादा देरी का कारण क्या है। लोग बताते हैं कि यही कदम सबसे ज़्यादा काम करता है।',
    },
    cost: { en: 'Rs 10', hi: '10 रुपये' },
    typicalEffect: {
      en: 'Members repeatedly report claims settling within days of an RTI being filed, because the file now has to be described in writing.',
      hi: 'कई लोगों का कहना है कि आरटीआई लगाने के कुछ ही दिनों में उनका पैसा आ गया, क्योंकि अब फाइल का हिसाब लिखकर देना पड़ता है।',
    },
    unlockedAtDay: 25,
    owner: {
      en: 'Central Public Information Officer, your Regional Office',
      hi: 'केंद्रीय लोक सूचना अधिकारी, आपका क्षेत्रीय कार्यालय',
    },
  },
  {
    id: 'penal',
    title: { en: 'Claim penal interest in writing', hi: 'लिखकर दंडात्मक ब्याज की मांग कीजिए' },
    detail: {
      en: 'Past the charter limit, an unjustified delay attracts 12% penal interest which is recoverable from the responsible official. Naming that consequence changes the tone of the file.',
      hi: '20 दिन के बाद बिना कारण देरी पर 12% दंडात्मक ब्याज लगता है, जो ज़िम्मेदार अधिकारी से वसूला जा सकता है। यह बात लिखने भर से फाइल का रुख बदल जाता है।',
    },
    cost: { en: 'Free', hi: 'मुफ़्त' },
    typicalEffect: {
      en: 'Rarely paid out, but it is the strongest lever in a written representation.',
      hi: 'यह ब्याज कम ही मिलता है, पर लिखित शिकायत में यह सबसे मज़बूत बात है।',
    },
    unlockedAtDay: 30,
    owner: { en: 'Regional Provident Fund Commissioner', hi: 'क्षेत्रीय भविष्य निधि आयुक्त' },
  },
  {
    id: 'cpgrams',
    title: { en: 'Escalate to CPGRAMS', hi: 'सीपीग्राम्स पर आगे बढ़ाइए' },
    detail: {
      en: 'The central government grievance portal sits above EPFiGMS. Attach your EPFiGMS ticket number and its outcome, otherwise it gets pushed straight back down.',
      hi: 'यह केंद्र सरकार का शिकायत पोर्टल है जो ईपीएफओ से ऊपर है। अपना पिछला टिकट नंबर और उसका जवाब ज़रूर लगाइए, वरना शिकायत वापस नीचे भेज दी जाएगी।',
    },
    cost: { en: 'Free', hi: 'मुफ़्त' },
    typicalEffect: {
      en: 'Moves the file to a desk that is measured on disposal.',
      hi: 'फाइल ऐसे अधिकारी के पास जाती है जिसका काम निपटान पर आंका जाता है।',
    },
    unlockedAtDay: 45,
    owner: { en: 'Ministry of Labour and Employment', hi: 'श्रम एवं रोजगार मंत्रालय' },
  },
];

export function assessStatus(input: StatusInput): StatusVerdict {
  const lang = input.lang ?? 'en';
  const filed = new Date(input.filedOn);
  const now = new Date();
  const msPerDay = 86400000;
  const daysElapsed = Math.max(0, Math.floor((now.getTime() - filed.getTime()) / msPerDay));
  const workingDaysElapsed = workingDaysBetween(filed, now);

  // Auto settlement only applies to advances within the ceiling.
  const route: ClaimRoute =
    input.claimType === '31' && input.amount <= AUTO_CEILING ? 'auto' : 'manual';
  const expectedDays = route === 'auto' ? AUTO_DAYS : MANUAL_DAYS;

  const filedNearMigration =
    filed.getTime() >= MIGRATION_START - 7 * msPerDay && filed.getTime() <= MIGRATION_END + 21 * msPerDay;

  const overdueBy = Math.max(0, daysElapsed - CHARTER_LIMIT);

  let severity: StatusVerdict['severity'];
  if (input.stage === 'settled') severity = 'on-track';
  else if (daysElapsed <= expectedDays) severity = 'on-track';
  else if (daysElapsed <= CHARTER_LIMIT) severity = 'watch';
  else if (daysElapsed <= 45) severity = 'breached';
  else severity = 'severe';

  const headline =
    input.stage === 'settled'
      ? lang === 'hi' ? 'यह क्लेम निपट चुका है' : 'This claim is settled'
      : severity === 'on-track'
        ? lang === 'hi' ? 'अभी सामान्य समय के अंदर है' : 'Still inside the normal window'
        : severity === 'watch'
          ? lang === 'hi' ? 'देर हो रही है, पर अभी सीमा पार नहीं हुई' : 'Running late, but not yet past the limit'
          : severity === 'breached'
            ? lang === 'hi'
              ? `ईपीएफओ की अपनी 20 दिन की सीमा से ${overdueBy} दिन ऊपर`
              : `Past EPFO's own 20 day limit by ${overdueBy} days`
            : lang === 'hi'
              ? `बहुत ज़्यादा देरी, सीमा से ${overdueBy} दिन ऊपर`
              : `Severely overdue, ${overdueBy} days past the limit`;

  const summary =
    severity === 'on-track'
      ? lang === 'hi'
        ? `${route === 'auto' ? 'ऑटो सेटलमेंट वाले क्लेम' : 'सामान्य रूप से जांचे जाने वाले क्लेम'} में करीब ${expectedDays} दिन लगते हैं। आपके ${daysElapsed} दिन हुए हैं। अभी पीछे पड़ने से फ़ायदा नहीं होगा।`
        : `A ${route === 'auto' ? 'fully compliant auto settlement claim' : 'manually processed claim'} is expected to take about ${expectedDays} days. You are at ${daysElapsed}. Chasing it now will not help.`
      : severity === 'watch'
        ? lang === 'hi'
          ? `सामान्य ${expectedDays} दिन निकल चुके हैं, पर 20 दिन की सीमा अभी बाकी है। अपने कागज़ अभी तैयार रखिए ताकि सीमा पार होते ही कार्रवाई कर सकें।`
          : `You are past the usual ${expectedDays} days but inside the 20 day charter limit. Get your evidence ready now so you can act the moment it crosses.`
        : lang === 'hi'
          ? `ईपीएफओ के अपने नागरिक चार्टर के अनुसार पूरा क्लेम 20 दिन में निपटना चाहिए। आपके ${daysElapsed} दिन हो चुके हैं। अब देरी का कारण उन्हें बताना है, आपको सहना नहीं है।`
          : `EPFO's Citizens' Charter sets 20 days as the outer limit for a complete claim. You are at ${daysElapsed} days. From here the delay is theirs to justify, not yours to absorb.`;

  const localise = (r: RawStep): EscalationStep => ({
    id: r.id,
    title: pick(r.title, lang),
    detail: pick(r.detail, lang),
    cost: pick(r.cost, lang),
    typicalEffect: pick(r.typicalEffect, lang),
    unlockedAtDay: r.unlockedAtDay,
    expiresAtDay: r.expiresAtDay,
    owner: pick(r.owner, lang),
  });

  const unlocked = LADDER.filter(
    (s) => daysElapsed >= s.unlockedAtDay && (s.expiresAtDay === undefined || daysElapsed <= s.expiresAtDay)
  );
  const locked = LADDER.filter((s) => daysElapsed < s.unlockedAtDay);

  return {
    daysElapsed,
    workingDaysElapsed,
    route,
    expectedDays,
    charterLimit: CHARTER_LIMIT,
    overdueBy,
    severity,
    headline,
    summary,
    penalInterest: {
      applies: overdueBy > 0 && input.stage !== 'settled',
      ratePercent: 12,
      note:
        overdueBy > 0
          ? lang === 'hi'
            ? '20 दिन की सीमा के बाद बिना कारण देरी पर 12% दंडात्मक ब्याज लगता है, जो ज़िम्मेदार अधिकारी से वसूला जा सकता है। इसे अपनी शिकायत में लिखिए।'
            : 'A delay beyond the charter limit without justification attracts 12% penal interest, recoverable from the responsible official. Cite this in writing.'
          : lang === 'hi'
            ? '20 दिन की सीमा पार करने के बाद ही दंडात्मक ब्याज की बात कही जा सकती है।'
            : 'Penal interest becomes citable only once you cross the 20 day charter limit.',
    },
    owner: {
      role: pick(OWNERS[input.stage].role, lang),
      name: pick(OWNERS[input.stage].name, lang),
      whatTheyDo: pick(OWNERS[input.stage].whatTheyDo, lang),
    },
    unlocked: (unlocked.length ? unlocked : [LADDER[1]]).map(localise),
    locked: locked.map(localise),
    migrationNote: filedNearMigration
      ? lang === 'hi'
        ? 'आपका क्लेम ईपीएफओ 3.0 माइग्रेशन के आसपास दाखिल हुआ था, जब 26 जून से 3 जुलाई 2026 तक सेवाएं बंद थीं। ईपीएफओ ने कहा था कि इसके बाद क्लेम में दो हफ़्ते तक ज़्यादा लग सकते हैं। इससे देरी समझ आती है, पर हमेशा के लिए माफ़ नहीं होती।'
        : 'Your claim was filed around the EPFO 3.0 migration window, when member services were suspended from 26 June to 3 July 2026. EPFO advised that claims could take up to two weeks longer than usual afterwards. That explains delay, it does not excuse it indefinitely.'
      : null,
  };
}

/** A grievance that cites the clock, not one that asks politely. */
export function delayGrievance(input: StatusInput, v: StatusVerdict, reference: string): string {
  const filed = new Date(input.filedOn).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const penalPara = v.penalInterest.applies
    ? `\n4. I note that a delay beyond the period specified in the Citizens' Charter, without recorded justification, attracts penal interest at 12% which is recoverable from the official responsible. I request that this be examined in my case and the outcome be communicated to me in writing.\n`
    : '';

  return `To
The Regional Provident Fund Commissioner
${input.office}

Subject: Delay in settlement of claim ${reference} beyond the Citizens' Charter period

Sir or Madam,

I filed the above claim on ${filed}. As of today it has been ${v.daysElapsed} days, and the claim status still reads "${input.stage.replace('-', ' ')}".

The Citizens' Charter of the Employees' Provident Fund Organisation provides that a complete claim shall be settled within 20 days. My claim is now ${v.overdueBy} days beyond that period.

I request the following in writing.

1. The present status of the claim and the designation of the officer currently holding the file.
2. The date of each internal movement of this claim since submission, and the reason recorded for the delay beyond the Charter period.
3. If any deficiency exists in my claim, the exact field, the rule relied upon, and what I must do to correct it.${penalPara}
I request that the claim be settled without further delay. If I do not receive a substantive response within 7 working days, being the Charter period for grievance redressal, I will pursue this through the Right to Information Act and through CPGRAMS.

Yours faithfully,
[Your name]
UAN: [your UAN]
Claim reference: ${reference}
Mobile: [your number]
Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}

---
Prepared with PF Precheck, an independent prototype. This is a template. Check
your claim reference and office before sending.`;
}

/** The RTI. Ten rupees, and the step members report actually works. */
export function delayRti(input: StatusInput, reference: string): string {
  return `To
The Central Public Information Officer
Employees' Provident Fund Organisation
${input.office}

Subject: Application under the Right to Information Act, 2005

Sir or Madam,

In respect of claim reference ${reference} filed by me on ${new Date(input.filedOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} under UAN [your UAN], I request the following information.

1. The current status of the said claim as recorded in the system, with the date on which that status was set.

2. The name and designation of the official presently holding the file, and of every official who has held it since submission.

3. The date of each internal movement or action on this claim from the date of submission to the date of this application.

4. The reason recorded, if any, for the claim not being settled within the period specified in the Citizens' Charter of the EPFO.

5. Copies of any internal note, objection or query raised on this claim.

6. The number of claims pending beyond the Charter period at this office as on the date of this application.

I enclose the prescribed fee of Rs 10.

Yours faithfully,
[Your name]
[Full postal address]
[Mobile number]
Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}

---
Prepared with PF Precheck, an independent prototype. Verify the CPIO address for
your Regional Office before filing.`;
}
