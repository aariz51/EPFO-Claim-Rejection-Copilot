'use client';

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  GitCompareArrows,
  HelpCircle,
  IndianRupee,
  Languages,
  ListChecks,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserRoundCheck,
  XCircle,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import {
  buildGrievance,
  decodeRejection,
  evaluateClaim,
  formatCurrency,
  formatMonths,
  sampleRecord,
  sampleRejections,
  type ClaimReport,
  type ClaimType,
  type DecodedRejection,
  type Form31Purpose,
} from '../lib/claim-engine';

type View = 'precheck' | 'records' | 'decoder' | 'grievance' | 'system';

const claimTypes: Array<{ id: ClaimType; title: string; form: string; detail: string }> = [
  { id: '31', title: 'PF advance', form: 'Form 31', detail: 'Medical, housing, marriage or education' },
  { id: '19', title: 'Final PF settlement', form: 'Form 19', detail: 'After leaving EPF-covered employment' },
  { id: '10C', title: 'Pension withdrawal', form: 'Form 10C', detail: 'EPS withdrawal benefit or scheme certificate' },
];

const purposes: Array<{ id: Form31Purpose; label: string }> = [
  { id: 'housing', label: 'House construction' },
  { id: 'illness', label: 'Medical treatment' },
  { id: 'marriage', label: 'Marriage' },
  { id: 'education', label: 'Education' },
];

const navItems: Array<{ id: View; label: string; icon: typeof FileCheck2 }> = [
  { id: 'precheck', label: 'Pre-check', icon: FileCheck2 },
  { id: 'records', label: 'Compare records', icon: GitCompareArrows },
  { id: 'decoder', label: 'Decode rejection', icon: Languages },
  { id: 'grievance', label: 'Grievance pack', icon: Clipboard },
  { id: 'system', label: 'System proposal', icon: Code2 },
];

const proposedPayload = {
  claim_id: 'CLM-DEMO-2408',
  status: 'rejected',
  rule_id: 'EPF-2026-68B-HOUSE',
  required_value: { months_of_service: 60 },
  actual_value: { synced_months_of_service: 56 },
  remedy_code: 'SYNC_EPS_SERVICE',
  responsible_owner: 'TRANSFEROR_FIELD_OFFICE',
  evidence_needed: ['annexure_k', 'service_history', 'passbook'],
};

function StatusIcon({ status }: { status: 'pass' | 'warning' | 'blocker' }) {
  if (status === 'pass') return <CheckCircle2 size={20} />;
  if (status === 'warning') return <AlertTriangle size={20} />;
  return <XCircle size={20} />;
}

function PageIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="view-intro">
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{copy}</p>
    </div>
  );
}

export function ClaimCopilot() {
  const [view, setView] = useState<View>('precheck');
  const [claimType, setClaimType] = useState<ClaimType>('31');
  const [purpose, setPurpose] = useState<Form31Purpose>('housing');
  const [amount, setAmount] = useState('300000');
  const [report, setReport] = useState<ClaimReport | null>(null);
  const [running, setRunning] = useState(false);
  const [expandedCheck, setExpandedCheck] = useState<string | null>('service');
  const [profileOpen, setProfileOpen] = useState(false);
  const [rejectionText, setRejectionText] = useState(sampleRejections[1]);
  const [decoded, setDecoded] = useState<DecodedRejection>(() => decodeRejection(sampleRejections[1]));
  const [language, setLanguage] = useState<'english' | 'hindi'>('english');
  const [toast, setToast] = useState('');
  const [claimReference, setClaimReference] = useState('CLM-DEMO-2408');
  const [evidence, setEvidence] = useState<string[]>(['Annexure K', 'Current passbook']);
  const resultsRef = useRef<HTMLElement | null>(null);

  const grievanceText = useMemo(
    () => buildGrievance(sampleRecord, decoded, claimReference),
    [claimReference, decoded],
  );
  const [editedDraft, setEditedDraft] = useState('');
  const visibleDraft = editedDraft || grievanceText;

  const announce = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };

  const changeView = (nextView: View) => {
    setView(nextView);
    setProfileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetDemo = () => {
    setClaimType('31');
    setPurpose('housing');
    setAmount('300000');
    setReport(null);
    setRejectionText(sampleRejections[1]);
    setDecoded(decodeRejection(sampleRejections[1]));
    setEvidence(['Annexure K', 'Current passbook']);
    setEditedDraft('');
    setProfileOpen(false);
    setView('precheck');
    announce('Demo reset');
  };

  const runPrecheck = () => {
    setRunning(true);
    setReport(null);
    window.setTimeout(() => {
      const nextReport = evaluateClaim(sampleRecord, claimType, purpose, Number(amount) || 0);
      setReport(nextReport);
      setRunning(false);
      window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }, 620);
  };

  const runDecoder = () => {
    const nextDecoded = decodeRejection(rejectionText);
    setDecoded(nextDecoded);
    setEditedDraft('');
    announce('Rejection decoded');
  };

  const copyText = async (text: string, message: string) => {
    await navigator.clipboard.writeText(text);
    announce(message);
  };

  const downloadDraft = () => {
    const blob = new Blob([visibleDraft], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'PF-Precheck-grievance-demo.txt';
    anchor.click();
    URL.revokeObjectURL(url);
    announce('Draft downloaded');
  };

  const toggleEvidence = (item: string) => {
    setEvidence((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
  };

  return (
    <main className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="topbar">
        <button className="brand" type="button" onClick={() => changeView('precheck')} aria-label="PF Precheck home">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span>PF Precheck</span>
        </button>
        <div className="prototype-note"><ShieldCheck size={16} /> Independent prototype <span>·</span> Synthetic records only</div>
        <div className="profile-wrap">
          <button className="profile-button" type="button" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen} aria-controls="profile-menu">
            <span className="avatar">AS</span>
            <span className="profile-copy"><strong>Asha Sharma</strong><small>Sample member</small></span>
            <ChevronDown size={16} />
          </button>
          {profileOpen && (
            <div className="profile-menu" id="profile-menu">
              <span className="menu-kicker">Demo profile</span>
              <strong>Asha Sharma</strong>
              <small>Service-sync mismatch scenario</small>
              <button type="button" onClick={resetDemo}><RefreshCw size={15} /> Reset demo</button>
            </div>
          )}
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar" aria-label="Application navigation">
          <p className="nav-label">Claim workspace</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={'nav-item ' + (view === item.id ? 'active' : '')} type="button" onClick={() => changeView(item.id)}>
                <Icon size={18} /><span>{item.label}</span>
              </button>
            );
          })}
          <button className="sidebar-foot" type="button" onClick={() => changeView('system')}><HelpCircle size={18} /><span>How this prototype works</span></button>
        </aside>

        <section className="main-panel" id="main-content">
          <nav className="mobile-nav" aria-label="Mobile application navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return <button key={item.id} type="button" className={view === item.id ? 'active' : ''} onClick={() => changeView(item.id)} aria-label={item.label}><Icon size={19} /><span>{item.label}</span></button>;
            })}
          </nav>

          {view === 'precheck' && (
            <>
              <div className="precheck-heading">
                <PageIntro eyebrow="Claim readiness" title="Know before you claim." copy="We compare eligibility, service history and transfer records before you submit." />
                <div className="rules-chip"><span /> Rules checked: 25 Aug 2026</div>
              </div>

              <div className="step-row" aria-label={report ? 'Progress: step 3 of 3' : 'Progress: step 1 of 3'}>
                <div className="step active"><span>{report ? <Check size={14} /> : '1'}</span><strong>Choose claim</strong></div>
                <div className={'step-line ' + (report ? 'filled' : '')} />
                <div className={'step ' + (report ? 'active' : '')}><span>{report ? <Check size={14} /> : '2'}</span><strong>Check records</strong></div>
                <div className={'step-line ' + (report ? 'filled' : '')} />
                <div className={'step ' + (report ? 'active' : '')}><span>3</span><strong>Fix blockers</strong></div>
              </div>

              <div className="content-grid">
                <section className="claim-form" aria-labelledby="claim-title">
                  <div className="section-index">01</div>
                  <h2 id="claim-title">Which claim are you planning?</h2>
                  <p className="section-help">Select a form and we will apply its versioned eligibility rules.</p>
                  <div className="claim-options">
                    {claimTypes.map((claim) => (
                      <button key={claim.id} type="button" className={'claim-option ' + (claimType === claim.id ? 'selected' : '')} onClick={() => { setClaimType(claim.id); setReport(null); }} aria-pressed={claimType === claim.id}>
                        <span className="radio"><span /></span>
                        <span className="option-copy"><strong>{claim.title}</strong><small>{claim.detail}</small></span>
                        <span className="form-code">{claim.form}</span>
                      </button>
                    ))}
                  </div>

                  {claimType === '31' && (
                    <>
                      <label className="field-label" htmlFor="purpose">Purpose of advance</label>
                      <div className="purpose-grid" id="purpose">
                        {purposes.map((item) => <button type="button" key={item.id} className={purpose === item.id ? 'selected' : ''} onClick={() => { setPurpose(item.id); setReport(null); }} aria-pressed={purpose === item.id}>{item.label}</button>)}
                      </div>
                    </>
                  )}

                  {claimType !== '10C' && (
                    <>
                      <label className="field-label" htmlFor="amount">Amount you want to claim</label>
                      <div className="amount-field"><IndianRupee size={17} /><input id="amount" inputMode="numeric" value={amount} onChange={(event) => { setAmount(event.target.value.replace(/\D/g, '')); setReport(null); }} aria-describedby="amount-help" suppressHydrationWarning /><span className="amount-suffix">INR</span></div>
                      <p id="amount-help" className="field-help">We calculate the maximum eligible amount, not just validate your entry.</p>
                    </>
                  )}

                  <button className="primary-action" type="button" onClick={runPrecheck} disabled={running || (!amount && claimType !== '10C')}>
                    {running ? <><RefreshCw className="spin" size={18} /> Checking 5 rules...</> : <><ShieldCheck size={19} /> Run my pre-check</>}
                  </button>
                  <p className="privacy-line"><ShieldCheck size={15} /> Runs in your browser. Never enter a real UAN, Aadhaar or bank number.</p>
                </section>

                <aside className="record-preview" aria-label="Sample record being checked">
                  <div className="record-top"><span>Sample record</span><span className="record-status"><Check size={13} /> Loaded</span></div>
                  <div className="member-row"><span className="large-avatar">AS</span><div><strong>{sampleRecord.name}</strong><small>UAN {sampleRecord.maskedUan}</small></div></div>
                  <dl className="record-stats">
                    <div><dt>Passbook balance</dt><dd>{formatCurrency(sampleRecord.passbookBalance)}</dd></div>
                    <div><dt>Declared service</dt><dd>{formatMonths(sampleRecord.declaredServiceMonths)}</dd></div>
                    <div><dt>Synced service</dt><dd className="warning-text">{formatMonths(sampleRecord.syncedServiceMonths)}</dd></div>
                    <div><dt>KYC & bank</dt><dd className="success-text">Verified</dd></div>
                  </dl>
                  <div className={'preview-callout ' + (report ? 'revealed' : '')} role="status" aria-live="polite">
                    {report ? (
                      <><span className="callout-icon">!</span><div><strong>{report.checks.filter((item) => item.status === 'blocker').length > 0 ? report.checks.filter((item) => item.status === 'blocker').length + ' blockers found' : '0 blockers · 1 record warning'}</strong><p>EPFO sees 56 service months; your broader record shows 94.</p></div></>
                    ) : (
                      <><span className="scan-line" /><p>{running ? 'Comparing rules and records...' : 'Your record check will appear here.'}</p></>
                    )}
                  </div>
                  <button className="text-action" type="button" onClick={() => changeView('records')}>Inspect both records <ArrowRight size={15} /></button>
                </aside>
              </div>

              {report && (
                <section className="report-section" ref={resultsRef} id="precheck-results" aria-labelledby="report-title">
                  <div className={'report-hero ' + report.status}>
                    <div className="score-ring" style={{ background: 'conic-gradient(#075d8f ' + report.readiness + '%, #dce3eb 0)' }}>
                      <div><strong>{report.readiness}</strong><span>ready</span></div>
                    </div>
                    <div className="report-copy">
                      <span className="report-kicker">{report.formLabel} · {report.purposeLabel}</span>
                      <h2 id="report-title">{report.headline}</h2>
                      <p>{report.summary}</p>
                    </div>
                    {report.claimType !== '10C' && <div className="max-amount"><span>Calculated ceiling</span><strong>{formatCurrency(report.maximumEligibleAmount)}</strong><small>for the selected purpose</small></div>}
                  </div>

                  <div className="report-layout">
                    <div className="check-list">
                      <div className="list-heading"><div><span className="section-index">02</span><h3>Exact rule check</h3></div><span>{report.checks.length} checks</span></div>
                      {report.checks.map((check) => (
                        <div className={'check-row ' + check.status} key={check.id}>
                          <button type="button" onClick={() => setExpandedCheck(expandedCheck === check.id ? null : check.id)} aria-expanded={expandedCheck === check.id}>
                            <span className="status-icon"><StatusIcon status={check.status} /></span>
                            <span className="check-name"><strong>{check.label}</strong><small>Required: {check.required} · Yours: {check.actual}</small></span>
                            {check.gap && <span className="gap-label">{check.gap}</span>}
                            <ChevronDown className={expandedCheck === check.id ? 'rotated' : ''} size={18} />
                          </button>
                          {expandedCheck === check.id && (
                            <div className="check-detail">
                              <p>{check.explanation}</p>
                              {check.remedy && <div className="remedy-line"><Route size={17} /><span><strong>Fix:</strong> {check.remedy}</span></div>}
                              <div className="rule-meta"><span>Rule ID: {check.ruleId}</span>{check.owner && <span>Owner: {check.owner}</span>}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <aside className="next-actions">
                      <span className="section-index">03</span>
                      <h3>Best next move</h3>
                      {report.alternatives.map((alternative, index) => (
                        <div className="alternative" key={alternative.title}>
                          <span>{index + 1}</span>
                          <div><strong>{alternative.title}</strong><p>{alternative.detail}</p><small>{alternative.action}</small></div>
                        </div>
                      ))}
                      <button className="secondary-action" type="button" onClick={() => changeView('records')}><GitCompareArrows size={17} /> See the service-sync gap</button>
                      <button className="primary-action compact" type="button" onClick={() => changeView('grievance')}><FileText size={17} /> Build correction request</button>
                    </aside>
                  </div>
                </section>
              )}
            </>
          )}

          {view === 'records' && (
            <>
              <PageIntro eyebrow="Record reconciliation" title="Your money moved. Your service did not." copy="The same transfer appears differently in the passbook and pension-service history. That invisible split is the likely rejection trigger." />
              <div className="record-alert"><TriangleAlert size={21} /><div><strong>38 months of pensionable service are missing</strong><p>₹4,20,000 transferred in September 2021, but the linked EPS service never appeared against the current member ID.</p></div><span>High impact</span></div>
              <div className="records-compare" id="records">
                <section>
                  <div className="compare-heading"><IndianRupee size={20} /><div><span>Passbook money trail</span><strong>Balance and transfers</strong></div></div>
                  <div className="timeline">
                    <div className="timeline-item complete"><span /><div><small>Jun 2018 - Aug 2021</small><strong>Meridian Digital Trust</strong><p>Employee + employer contributions</p></div><b>₹4,20,000</b></div>
                    <div className="timeline-item complete"><span /><div><small>09 Sep 2021</small><strong>Transfer credit received</strong><p>Reference TRF-ANXK-8831</p></div><CheckCircle2 size={19} /></div>
                    <div className="timeline-item current"><span /><div><small>Sep 2021 - present</small><strong>Suryodaya Textiles</strong><p>Current member ID · balance updated</p></div><b>₹1,92,430</b></div>
                  </div>
                </section>
                <section>
                  <div className="compare-heading"><ListChecks size={20} /><div><span>EPS service trail</span><strong>Pensionable months</strong></div></div>
                  <div className="timeline">
                    <div className="timeline-item missing"><span /><div><small>Jun 2018 - Aug 2021</small><strong>Previous service missing</strong><p>38 months absent after transfer</p></div><XCircle size={20} /></div>
                    <div className="timeline-item missing"><span /><div><small>09 Sep 2021</small><strong>Annexure K not mapped</strong><p>Money certificate received; service field blank</p></div><AlertTriangle size={20} /></div>
                    <div className="timeline-item current"><span /><div><small>Sep 2021 - present</small><strong>Current service visible</strong><p>56 months synced</p></div><b>56m</b></div>
                  </div>
                </section>
              </div>
              <div className="reconciliation-summary">
                <div><span>Expected service</span><strong>94 months</strong></div>
                <div><span>EPFO-synced service</span><strong className="warning-text">56 months</strong></div>
                <div><span>Unreconciled gap</span><strong className="danger-text">38 months</strong></div>
                <button className="primary-action" type="button" onClick={() => changeView('grievance')}><FileText size={18} /> Use gap in grievance</button>
              </div>
              <section className="evidence-band">
                <div><BookOpenCheck size={22} /><span><strong>Annexure K is the bridge record</strong><small>It carries both PF balance and pension-service history between offices.</small></span></div>
                <a href="https://www.epfindia.gov.in/site_docs/PDFs/Circulars/Y2025-2026/EPFOCircular_18092025_AnnexureK.pdf" target="_blank" rel="noreferrer">Read official circular <ExternalLink size={15} /></a>
              </section>
              <button className="back-action" type="button" onClick={() => changeView('precheck')}><ArrowLeft size={16} /> Back to pre-check</button>
            </>
          )}

          {view === 'decoder' && (
            <>
              <PageIntro eyebrow="Rejection decoder" title="Turn the remark into a remedy." copy="Paste the exact rejection SMS or portal remark. The prototype maps it to a likely owner, evidence pack and next action." />
              <div className="decoder-layout" id="decoder">
                <section className="decoder-input">
                  <label htmlFor="rejection">Rejection message</label>
                  <textarea id="rejection" value={rejectionText} onChange={(event) => setRejectionText(event.target.value)} rows={6} />
                  <div className="sample-row"><span>Try a sample:</span>{sampleRejections.map((sample, index) => <button type="button" key={sample} onClick={() => setRejectionText(sample)}>#{index + 1}</button>)}</div>
                  <div className="decoder-controls">
                    <div className="language-control" aria-label="Explanation language"><button type="button" className={language === 'english' ? 'active' : ''} onClick={() => setLanguage('english')}>English</button><button type="button" className={language === 'hindi' ? 'active' : ''} onClick={() => setLanguage('hindi')}>हिंदी</button></div>
                    <button className="primary-action compact" type="button" onClick={runDecoder}><Sparkles size={17} /> Decode message</button>
                  </div>
                  <p className="privacy-line"><ShieldCheck size={15} /> Paste only the rejection words. Remove UAN, claim ID and phone number.</p>
                </section>
                <section className="decoded-result" aria-live="polite">
                  <div className="decoded-top"><span className={'severity ' + decoded.urgency}>{decoded.urgency} priority</span><code>{decoded.code}</code></div>
                  <h2>{decoded.title}</h2>
                  <p className="meaning">{language === 'hindi' ? decoded.hindiMeaning : decoded.meaning}</p>
                  <div className="owner-line"><UserRoundCheck size={18} /><span><small>Who must fix it</small><strong>{decoded.owner}</strong></span></div>
                  <h3>Do this next</h3>
                  <ol>{decoded.steps.map((step) => <li key={step}>{step}</li>)}</ol>
                  <div className="annexures"><strong>Attach</strong>{decoded.annexures.map((item) => <span key={item}><Check size={13} /> {item}</span>)}</div>
                  <button className="secondary-action" type="button" onClick={() => { setEditedDraft(''); changeView('grievance'); }}><FileText size={17} /> Draft this grievance</button>
                </section>
              </div>
            </>
          )}

          {view === 'grievance' && (
            <>
              <PageIntro eyebrow="Grievance pack" title="Ask for a correction, not a status update." copy="A specific, evidence-backed request is easier to route and harder to close with a generic reply." />
              <div className="grievance-layout" id="grievance">
                <section className="grievance-form">
                  <div className="grievance-meta">
                    <label htmlFor="claim-reference">Synthetic claim reference<input id="claim-reference" value={claimReference} onChange={(event) => { setClaimReference(event.target.value); setEditedDraft(''); }} /></label>
                    <label htmlFor="field-office">Field office<select id="field-office" defaultValue="bengaluru"><option value="bengaluru">Bengaluru South</option><option value="pune">Pune Cantonment</option><option value="delhi">Delhi Central</option></select></label>
                  </div>
                  <label className="draft-label" htmlFor="draft">Editable grievance draft</label>
                  <textarea id="draft" className="draft-text" value={visibleDraft} onChange={(event) => setEditedDraft(event.target.value)} rows={22} />
                  <div className="draft-actions">
                    <button className="primary-action compact" type="button" onClick={() => copyText(visibleDraft, 'Draft copied')}><Copy size={17} /> Copy draft</button>
                    <button className="secondary-action" type="button" onClick={downloadDraft}><Download size={17} /> Download .txt</button>
                    <button className="icon-action" type="button" onClick={() => { setEditedDraft(''); announce('Draft restored'); }} title="Restore generated draft" aria-label="Restore generated draft"><RefreshCw size={17} /></button>
                  </div>
                </section>
                <aside className="evidence-checklist">
                  <span className="section-index">Evidence pack</span>
                  <h2>{evidence.length} of 5 ready</h2>
                  <p>For the demo, these are synthetic document states. No files leave your device.</p>
                  {['Annexure K', 'Current passbook', 'Previous passbook', 'Service-history screenshot', 'Rejected claim screenshot'].map((item) => (
                    <label key={item} className={evidence.includes(item) ? 'checked' : ''}><input type="checkbox" checked={evidence.includes(item)} onChange={() => toggleEvidence(item)} /><span><Check size={14} /></span>{item}</label>
                  ))}
                  <div className="submission-note"><ShieldCheck size={18} /><span><strong>Not submitted automatically</strong><small>Production would open EPFiGMS with consent. This prototype only prepares the pack.</small></span></div>
                  <a className="external-action" href="https://epfigms.gov.in/" target="_blank" rel="noreferrer">Open official EPFiGMS <ExternalLink size={15} /></a>
                </aside>
              </div>
            </>
          )}

          {view === 'system' && (
            <>
              <PageIntro eyebrow="End-to-end system proposal" title="The interface is only half the fix." copy="A useful rejection must leave the backend with a machine-readable reason, the number that failed, and a route to repair it." />
              <div className="system-flow">
                {[
                  ['1', 'Versioned rule engine', 'Every check points to an effective rule ID and source.'],
                  ['2', 'Record reconciliation', 'Money, service and KYC are compared before filing.'],
                  ['3', 'Structured rejection', 'Required value, actual value and remedy code replace free text.'],
                  ['4', 'Closed-loop repair', 'The responsible office confirms correction before reapplication.'],
                ].map((item) => <div key={item[0]}><span>{item[0]}</span><strong>{item[1]}</strong><p>{item[2]}</p></div>)}
              </div>
              <div className="system-grid">
                <section className="contract-panel">
                  <div className="panel-heading"><span><Code2 size={18} /> Proposed rejection payload</span><button type="button" onClick={() => copyText(JSON.stringify(proposedPayload, null, 2), 'API contract copied')}><Copy size={15} /> Copy</button></div>
                  <pre><code>{JSON.stringify(proposedPayload, null, 2)}</code></pre>
                </section>
                <section className="honesty-panel">
                  <span className="section-index">Honesty boundary</span>
                  <h2>What works today</h2>
                  <ul><li>Deterministic pre-check across Forms 19, 31 and 10C</li><li>Exact-number eligibility and amount calculations</li><li>Record-gap detection and rejection decoding</li><li>Editable grievance and evidence checklist</li></ul>
                  <h2>What is mocked</h2>
                  <ul><li>Member profile, UAN, passbook and field-office response</li><li>Government API access and grievance submission</li><li>Rule ingestion and legal sign-off workflow</li></ul>
                </section>
              </div>
              <section className="rule-sources">
                <div><span className="section-index">Rule provenance</span><h2>Reviewable, versioned sources</h2><p>Production must retain the exact circular or Gazette paragraph behind every rule and require human legal review before activation.</p></div>
                <div className="source-links">
                  <a href="https://www.epfindia.gov.in/site_docs/PDFs/Downloads_PDFs/TypesOfAdvances_Form31.pdf" target="_blank" rel="noreferrer"><FileCheck2 size={18} /><span><strong>Form 31 advance guidance</strong><small>EPFO · purpose, service and amount rules</small></span><ExternalLink size={15} /></a>
                  <a href="https://www.epfindia.gov.in/site_docs/PDFs/Circulars/Y2025-2026/EPFOCircular_18092025_AnnexureK.pdf" target="_blank" rel="noreferrer"><FileCheck2 size={18} /><span><strong>Annexure K circular</strong><small>EPFO · balance and EPS service transfer</small></span><ExternalLink size={15} /></a>
                  <a href="https://www.epfindia.gov.in/site_en/FAQ.php" target="_blank" rel="noreferrer"><FileCheck2 size={18} /><span><strong>Claims and grievance FAQ</strong><small>EPFO · correction and escalation guidance</small></span><ExternalLink size={15} /></a>
                </div>
              </section>
            </>
          )}
        </section>
      </div>

      {toast && <div className="toast" role="status"><CheckCircle2 size={17} /> {toast}</div>}
    </main>
  );
}
