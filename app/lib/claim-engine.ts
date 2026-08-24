export type ClaimType = '31' | '19' | '10C';
export type Form31Purpose = 'housing' | 'illness' | 'marriage' | 'education';
export type CheckStatus = 'pass' | 'warning' | 'blocker';

export interface MemberRecord {
  name: string;
  maskedUan: string;
  passbookBalance: number;
  employeeShare: number;
  basicAndDa: number;
  declaredServiceMonths: number;
  syncedServiceMonths: number;
  missingServiceMonths: number;
  epsServiceMonths: number;
  monthsSinceExit: number;
  currentlyEmployed: boolean;
  kycVerified: boolean;
  bankVerified: boolean;
}

export interface ClaimCheck {
  id: string;
  label: string;
  status: CheckStatus;
  required: string;
  actual: string;
  gap?: string;
  explanation: string;
  remedy?: string;
  owner?: string;
  ruleId: string;
}

export interface ClaimReport {
  claimType: ClaimType;
  formLabel: string;
  purposeLabel: string;
  readiness: number;
  status: 'ready' | 'needs-fix';
  headline: string;
  summary: string;
  maximumEligibleAmount: number;
  checks: ClaimCheck[];
  alternatives: Array<{ title: string; detail: string; action: string }>;
}

export interface DecodedRejection {
  code: string;
  title: string;
  meaning: string;
  hindiMeaning: string;
  owner: string;
  urgency: 'high' | 'medium';
  steps: string[];
  annexures: string[];
  remedyCode: string;
}

export const sampleRecord: MemberRecord = {
  name: 'Asha Sharma',
  maskedUan: '•••• 4821',
  passbookBalance: 612430,
  employeeShare: 186400,
  basicAndDa: 28000,
  declaredServiceMonths: 94,
  syncedServiceMonths: 56,
  missingServiceMonths: 38,
  epsServiceMonths: 94,
  monthsSinceExit: 0,
  currentlyEmployed: true,
  kycVerified: true,
  bankVerified: true,
};

const purposeRules: Record<Form31Purpose, { label: string; months: number; multiplier?: number; employeeShareRatio?: number; ruleId: string }> = {
  housing: { label: 'House construction', months: 60, multiplier: 36, ruleId: 'EPF-2026-68B-HOUSE' },
  illness: { label: 'Medical treatment', months: 0, multiplier: 6, ruleId: 'EPF-2026-68J-ILLNESS' },
  marriage: { label: 'Marriage', months: 84, employeeShareRatio: 0.5, ruleId: 'EPF-2026-68K-MARRIAGE' },
  education: { label: 'Post-matric education', months: 84, employeeShareRatio: 0.5, ruleId: 'EPF-2026-68K-EDUCATION' },
};

export const formatMonths = (months: number) => {
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  return [(years ? years + 'y' : ''), (remainder ? remainder + 'm' : '')].filter(Boolean).join(' ') || '0m';
};

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

function amountCheck(requestedAmount: number, maximum: number, ruleId: string): ClaimCheck {
  const difference = requestedAmount - maximum;
  return {
    id: 'amount',
    label: 'Eligible claim amount',
    status: difference > 0 ? 'blocker' : 'pass',
    required: 'At most ' + formatCurrency(maximum),
    actual: formatCurrency(requestedAmount),
    gap: difference > 0 ? formatCurrency(difference) + ' over the limit' : undefined,
    explanation: difference > 0
      ? 'The requested amount is higher than the maximum calculated from wages, employee share and available balance.'
      : 'Your requested amount is within the calculated ceiling for this purpose.',
    remedy: difference > 0 ? 'Reduce the claim to ' + formatCurrency(maximum) + ' or less.' : undefined,
    owner: difference > 0 ? 'Member' : undefined,
    ruleId,
  };
}

function commonChecks(record: MemberRecord): ClaimCheck[] {
  return [
    {
      id: 'kyc',
      label: 'Identity and KYC match',
      status: record.kycVerified ? 'pass' : 'blocker',
      required: 'Aadhaar, name and date of birth aligned',
      actual: record.kycVerified ? 'Verified and aligned' : 'Mismatch detected',
      explanation: record.kycVerified ? 'The synthetic Aadhaar and UAN identity fields match.' : 'A mismatch can prevent online claim validation.',
      remedy: record.kycVerified ? undefined : 'Submit a Joint Declaration correction before filing.',
      owner: record.kycVerified ? undefined : 'Member + employer',
      ruleId: 'UAN-KYC-IDENTITY',
    },
    {
      id: 'bank',
      label: 'Bank account readiness',
      status: record.bankVerified ? 'pass' : 'blocker',
      required: 'Active verified account in member name',
      actual: record.bankVerified ? 'Verified · ending 3902' : 'Not verified',
      explanation: record.bankVerified ? 'The sample bank account is approved and available for electronic settlement.' : 'The claim cannot be credited until the bank account is verified.',
      remedy: record.bankVerified ? undefined : 'Seed and verify an active bank account before filing.',
      owner: record.bankVerified ? undefined : 'Member + bank/employer',
      ruleId: 'UAN-BANK-VALIDATION',
    },
  ];
}

export function evaluateClaim(record: MemberRecord, claimType: ClaimType, purpose: Form31Purpose, requestedAmount: number): ClaimReport {
  const checks = commonChecks(record);
  let maximumEligibleAmount = record.passbookBalance;
  let purposeLabel = '';
  let formLabel = '';
  const alternatives: ClaimReport['alternatives'] = [];

  if (claimType === '31') {
    const rule = purposeRules[purpose];
    formLabel = 'Form 31';
    purposeLabel = rule.label;
    maximumEligibleAmount = Math.min(
      record.passbookBalance,
      rule.multiplier ? record.basicAndDa * rule.multiplier : Number.POSITIVE_INFINITY,
      rule.employeeShareRatio ? record.employeeShare * rule.employeeShareRatio : Number.POSITIVE_INFINITY,
    );
    const serviceGap = Math.max(0, rule.months - record.syncedServiceMonths);
    checks.unshift({
      id: 'service',
      label: 'Membership period',
      status: serviceGap > 0 ? 'blocker' : 'pass',
      required: rule.months + ' months',
      actual: record.syncedServiceMonths + ' months',
      gap: serviceGap > 0 ? serviceGap + ' months short' : undefined,
      explanation: serviceGap > 0
        ? 'Your overall employment record shows ' + record.declaredServiceMonths + ' months, but the synced EPS service used for this check shows only ' + record.syncedServiceMonths + '.'
        : rule.months === 0
          ? 'This purpose has no minimum membership period in the published Form 31 guidance.'
          : 'The service period visible to the claim check meets the minimum.',
      remedy: serviceGap > 0 ? 'Correct the missing pensionable service before submitting this purpose.' : undefined,
      owner: serviceGap > 0 ? 'EPFO field office' : undefined,
      ruleId: rule.ruleId,
    });

    if (record.missingServiceMonths > 0) {
      checks.splice(1, 0, {
        id: 'sync',
        label: 'Passbook and service-history sync',
        status: serviceGap > 0 ? 'blocker' : 'warning',
        required: record.declaredServiceMonths + ' months traceable in both records',
        actual: record.syncedServiceMonths + ' months synced',
        gap: record.missingServiceMonths + ' months missing',
        explanation: 'A ₹4.20 lakh transfer is present in the money trail, but its pensionable service is absent from the service trail.',
        remedy: 'Attach Annexure K, both passbooks and the service-history screenshot to an EPFiGMS grievance.',
        owner: 'Transferor EPFO field office',
        ruleId: 'RECORD-SYNC-ANNEXURE-K',
      });
    }

    checks.push(amountCheck(requestedAmount, maximumEligibleAmount, rule.ruleId));
    if (purpose !== 'illness') {
      const illnessMaximum = Math.min(record.basicAndDa * 6, record.employeeShare);
      alternatives.push({
        title: 'Medical advance may be ready now',
        detail: 'No minimum service period. Estimated ceiling: ' + formatCurrency(illnessMaximum) + '.',
        action: 'Use only when medical treatment is the true purpose.',
      });
    }
    alternatives.push({
      title: 'Repair the service record first',
      detail: 'Recovering the missing ' + record.missingServiceMonths + ' months would make the synced record ' + formatMonths(record.declaredServiceMonths) + '.',
      action: 'Generate the Annexure K grievance pack.',
    });
  }

  if (claimType === '19') {
    formLabel = 'Form 19';
    purposeLabel = 'Final PF settlement';
    maximumEligibleAmount = record.passbookBalance;
    checks.unshift({
      id: 'exit',
      label: 'Prolonged exit from covered employment',
      status: !record.currentlyEmployed && record.monthsSinceExit >= 12 ? 'pass' : 'blocker',
      required: '12 months after exit under the 2026 scheme',
      actual: record.currentlyEmployed ? 'Currently employed' : record.monthsSinceExit + ' months since exit',
      gap: record.currentlyEmployed ? 'Exit not recorded' : Math.max(0, 12 - record.monthsSinceExit) + ' months short',
      explanation: 'The current synthetic record still has an active EPF-covered employment, so final settlement is not ready.',
      remedy: 'Use an eligible advance purpose while employed, or wait until the final-settlement condition is met.',
      owner: 'Member / employer',
      ruleId: 'EPF-2026-PROLONGED-EXIT',
    });
    checks.push(amountCheck(requestedAmount, maximumEligibleAmount, 'EPF-2026-FINAL-SETTLEMENT'));
    alternatives.push({ title: 'Use Form 31 for a genuine immediate need', detail: 'Advances remain purpose-specific while employment is active.', action: 'Compare eligible advance purposes.' });
  }

  if (claimType === '10C') {
    formLabel = 'Form 10C';
    purposeLabel = 'EPS withdrawal benefit';
    maximumEligibleAmount = 0;
    const serviceEligible = record.epsServiceMonths < 120;
    checks.unshift(
      {
        id: 'eps-service',
        label: 'EPS service band',
        status: serviceEligible ? 'pass' : 'blocker',
        required: 'Less than 10 years for withdrawal benefit',
        actual: formatMonths(record.epsServiceMonths),
        explanation: serviceEligible ? 'The sample EPS service is below the pension threshold.' : 'At 10 years or more, the member normally moves toward a scheme certificate or pension path.',
        remedy: serviceEligible ? undefined : 'Choose a scheme certificate instead of withdrawal benefit.',
        owner: serviceEligible ? undefined : 'Member',
        ruleId: 'EPS-2026-SERVICE-BAND',
      },
      {
        id: 'eps-exit',
        label: 'EPS withdrawal waiting period',
        status: !record.currentlyEmployed && record.monthsSinceExit >= 36 ? 'pass' : 'blocker',
        required: '36 months after exit under the 2026 scheme',
        actual: record.currentlyEmployed ? 'Currently employed' : record.monthsSinceExit + ' months since exit',
        gap: record.currentlyEmployed ? 'Exit not recorded' : Math.max(0, 36 - record.monthsSinceExit) + ' months short',
        explanation: 'The synthetic profile is still employed, so a withdrawal-benefit claim is not ready.',
        remedy: 'Preserve the EPS service and revisit the withdrawal or scheme-certificate route after exit.',
        owner: 'Member / employer',
        ruleId: 'EPS-2026-PROLONGED-EXIT',
      },
    );
    alternatives.push({ title: 'Preserve service with a scheme certificate', detail: 'This keeps pensionable service available for future employment or pension eligibility.', action: 'Review the scheme-certificate path.' });
  }

  const blockers = checks.filter((check) => check.status === 'blocker').length;
  const warnings = checks.filter((check) => check.status === 'warning').length;
  const readiness = Math.max(18, 100 - blockers * 28 - warnings * 10);
  const status = blockers ? 'needs-fix' : 'ready';
  return {
    claimType,
    formLabel,
    purposeLabel,
    readiness,
    status,
    headline: blockers ? 'Fix ' + blockers + ' ' + (blockers === 1 ? 'blocker' : 'blockers') + ' before you apply' : 'Your sample claim is ready to file',
    summary: blockers ? 'Submitting now is likely to create another rejection loop. The exact gaps and responsible owner are listed below.' : 'Every rule checked by this prototype passes for the selected form and amount.',
    maximumEligibleAmount,
    checks,
    alternatives,
  };
}

const decoderRules: Array<{ matches: RegExp; result: DecodedRejection }> = [
  {
    matches: /summary.*detail|ledger|warning-?520462/i,
    result: {
      code: 'WARNING-520462',
      title: 'Ledger summary and transactions do not match',
      meaning: 'The field-office ledger total disagrees with its underlying contribution rows. Reapplying with the same data will not repair it.',
      hindiMeaning: 'फील्ड ऑफिस के लेजर का कुल योग और योगदान की पंक्तियां मेल नहीं खा रही हैं। वही दावा दोबारा लगाने से रिकॉर्ड ठीक नहीं होगा।',
      owner: 'EPFO field office',
      urgency: 'high',
      steps: ['Do not submit a duplicate claim.', 'Download both passbooks and Annexure K.', 'Ask the field office to reconcile summary and detail transactions, then confirm in writing.'],
      annexures: ['Rejected claim screenshot', 'Current and previous passbooks', 'Annexure K', 'Service-history screenshot'],
      remedyCode: 'LEDGER_RECONCILIATION',
    },
  },
  {
    matches: /not all service|annexure k|eps details.*not received/i,
    result: {
      code: 'EPS-SERVICE-MISSING',
      title: 'Previous pensionable service is not available',
      meaning: 'PF money may have transferred, but the pension-service certificate is missing or not mapped to the latest member ID.',
      hindiMeaning: 'पीएफ की राशि ट्रांसफर हो सकती है, लेकिन पिछली पेंशन सेवा नए सदस्य आईडी से नहीं जुड़ी है।',
      owner: 'Transferor EPFO field office',
      urgency: 'high',
      steps: ['Download Annexure K from the member portal.', 'Compare EPS service in Annexure K with UAN Service History.', 'Request the transferor office to transmit or remap the missing service.'],
      annexures: ['Annexure K', 'Form 13 transfer status', 'Both member-ID passbooks', 'UAN Service History'],
      remedyCode: 'SYNC_EPS_SERVICE',
    },
  },
  {
    matches: /date of exit.*12|less than 12 months|prolonged exit/i,
    result: {
      code: 'EXIT_WAITING_PERIOD',
      title: 'Final-settlement waiting condition not met',
      meaning: 'The claim processor is applying the 2026 prolonged-exit condition to Form 19. The exit date or effective rule version needs to be checked.',
      hindiMeaning: 'फॉर्म 19 पर 2026 की नौकरी छोड़ने के बाद की प्रतीक्षा अवधि लागू की जा रही है। निकास तिथि और लागू नियम संस्करण जांचें।',
      owner: 'Member, then EPFO field office if the rule version is wrong',
      urgency: 'medium',
      steps: ['Verify the EPF Date of Exit and exit reason.', 'Check whether the claim predates the new scheme effective date.', 'If the wrong rule version was applied, raise a grievance quoting claim date and exit date.'],
      annexures: ['Claim submission receipt', 'Date-of-exit screenshot', 'Relieving letter', 'Rejection message'],
      remedyCode: 'VERIFY_EXIT_RULE_VERSION',
    },
  },
  {
    matches: /higher wages.*pension|eps.*non.?eps|pension given/i,
    result: {
      code: 'EPS-ELIGIBILITY-MAP',
      title: 'EPS membership mapping is inconsistent',
      meaning: 'One employment treated the member as EPS-eligible while another treated the same UAN as non-EPS. The historical mapping must be corrected.',
      hindiMeaning: 'एक नौकरी में ईपीएस सदस्यता जुड़ी है और दूसरी में नहीं। पुराने ईपीएस रिकॉर्ड का सुधार जरूरी है।',
      owner: 'Employer where the incorrect EPS entry began',
      urgency: 'high',
      steps: ['Identify the first month where EPS treatment changes.', 'Ask that employer to file the correction or Joint Declaration.', 'Reapply only after Service History reflects the correction.'],
      annexures: ['Wage slips around the mismatch', 'Passbook contribution rows', 'Form 11', 'Service-history screenshot'],
      remedyCode: 'CORRECT_EPS_MAPPING',
    },
  },
  {
    matches: /cites|migration|technical issue/i,
    result: {
      code: 'MIGRATION-REVIEW',
      title: 'Post-migration record needs field-office review',
      meaning: 'The rejection points to a processing migration, not a citizen eligibility failure. A duplicate claim may repeat the same backend error.',
      hindiMeaning: 'यह अस्वीकृति पात्रता की कमी नहीं, बल्कि सिस्टम माइग्रेशन से जुड़ी प्रक्रिया समस्या दिखाती है।',
      owner: 'EPFO field office / claims system team',
      urgency: 'high',
      steps: ['Do not expose your UAN publicly on social media.', 'Capture the rejection and claim timeline.', 'Request manual review with the exact migration remark quoted.'],
      annexures: ['Rejection screenshot', 'Claim timeline', 'Masked UAN service history', 'Passbook summary'],
      remedyCode: 'MANUAL_MIGRATION_REVIEW',
    },
  },
];

export const sampleRejections = [
  'WARNING-520462: There is mismatch between summary and detail transactions in member ledger.',
  'Take necessary action as not all service is available. Previous EPS details not received.',
  'Member Date of Exit EPF is less than 12 months.',
  'Claim rejected related to migration to CITES.',
];

export function decodeRejection(text: string): DecodedRejection {
  const match = decoderRules.find((rule) => rule.matches.test(text));
  return match?.result ?? {
    code: 'NEEDS-MANUAL-REVIEW',
    title: 'The message is too vague to map safely',
    meaning: 'This prototype could not connect the wording to a verified remedy pattern. Preserve the exact text and request the rule ID and actual value used.',
    hindiMeaning: 'यह संदेश सुरक्षित रूप से किसी सत्यापित समाधान से नहीं जुड़ पाया। सटीक नियम आईडी और उपयोग किए गए मान की मांग करें।',
    owner: 'EPFO field office',
    urgency: 'medium',
    steps: ['Keep the exact rejection text and claim ID.', 'Ask for the rule applied, required value, actual value and remedy code.', 'Attach the claim receipt and masked record screenshots.'],
    annexures: ['Claim receipt', 'Exact rejection text', 'Masked service history'],
    remedyCode: 'REQUEST_STRUCTURED_REASON',
  };
}

export function buildGrievance(record: MemberRecord, decoded: DecodedRejection, claimReference: string) {
  return [
    'Subject: Request to correct ' + decoded.title.toLowerCase() + ' and review rejected claim',
    '',
    'To',
    'The Regional Provident Fund Commissioner',
    'EPFO Regional Office, Bengaluru South',
    '',
    'Respected Sir/Madam,',
    '',
    'I request a record correction and review of my rejected claim ' + claimReference + '. The rejection remark was mapped to ' + decoded.code + ': ' + decoded.title + '.',
    '',
    'My synthetic demonstration record shows ' + record.declaredServiceMonths + ' months of declared service, while only ' + record.syncedServiceMonths + ' months are visible in the service history. A transfer of ₹4,20,000 is visible in the passbook, but ' + record.missingServiceMonths + ' months of corresponding pensionable service are not synced.',
    '',
    'Requested action:',
    '1. ' + decoded.steps[0],
    '2. ' + decoded.steps[1],
    '3. ' + decoded.steps[2],
    '4. Confirm the corrected service period and the rule applied before asking me to re-submit.',
    '',
    'Documents enclosed:',
    decoded.annexures.map((item, index) => String(index + 1) + '. ' + item).join('\n'),
    '',
    'Please provide a speaking response containing the rule applied, required value, actual value and remedy code. Kindly do not close this grievance with a generic status update.',
    '',
    'Member: ' + record.name,
    'UAN: ' + record.maskedUan + ' (masked synthetic record)',
    '',
    'This letter was generated by an independent prototype using synthetic data and must be reviewed before real-world use.',
  ].join('\n');
}
