'use client';

import { Check, ChevronDown, CircleHelp, FileCheck2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

const claimTypes = [
  { id: '31', title: 'PF advance', form: 'Form 31', detail: 'Medical, housing, marriage or education' },
  { id: '19', title: 'Final PF settlement', form: 'Form 19', detail: 'After leaving EPF-covered employment' },
  { id: '10C', title: 'Pension withdrawal', form: 'Form 10C', detail: 'EPS withdrawal benefit or scheme certificate' },
];

export function ClaimCopilot() {
  const [claimType, setClaimType] = useState('31');
  const [checked, setChecked] = useState(false);

  return (
    <main className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="topbar">
        <a className="brand" href="#main-content" aria-label="PF Precheck home">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span>PF Precheck</span>
        </a>
        <div className="prototype-note"><ShieldCheck size={16} /> Independent prototype <span>·</span> Synthetic records</div>
        <button className="profile-button" type="button" aria-label="Open sample profile">
          <span className="avatar">AS</span><span className="profile-copy"><strong>Asha Sharma</strong><small>Sample member</small></span><ChevronDown size={16} />
        </button>
      </header>

      <div className="workspace">
        <aside className="sidebar" aria-label="Application navigation">
          <p className="nav-label">Claim workspace</p>
          <a className="nav-item active" href="#main-content"><FileCheck2 size={18} /> Pre-check</a>
          <a className="nav-item" href="#records"><span className="nav-dot" /> Records</a>
          <a className="nav-item" href="#decoder"><span className="nav-dot" /> Decode rejection</a>
          <a className="nav-item" href="#grievance"><span className="nav-dot" /> Grievance pack</a>
          <div className="sidebar-foot"><CircleHelp size={18} /><span>How this prototype works</span></div>
        </aside>

        <section className="main-panel" id="main-content">
          <div className="eyebrow">Claim readiness</div>
          <div className="page-heading">
            <div><h1>Know before you claim.</h1><p>We compare your eligibility, service history and transfer records before you submit.</p></div>
            <div className="rules-chip"><span /> Rules checked: 25 Aug 2026</div>
          </div>

          <div className="step-row" aria-label="Progress: step 1 of 3">
            <div className="step active"><span>1</span><strong>Choose claim</strong></div>
            <div className="step-line" />
            <div className="step"><span>2</span><strong>Check records</strong></div>
            <div className="step-line" />
            <div className="step"><span>3</span><strong>Fix blockers</strong></div>
          </div>

          <div className="content-grid">
            <section className="claim-form" aria-labelledby="claim-title">
              <div className="section-index">01</div>
              <h2 id="claim-title">What do you need your PF for?</h2>
              <p className="section-help">Pick the form you plan to submit. We will apply the relevant rule set.</p>
              <div className="claim-options">
                {claimTypes.map((claim) => (
                  <button key={claim.id} type="button" className={'claim-option ' + (claimType === claim.id ? 'selected' : '')} onClick={() => { setClaimType(claim.id); setChecked(false); }} aria-pressed={claimType === claim.id}>
                    <span className="radio"><span /></span>
                    <span className="option-copy"><strong>{claim.title}</strong><small>{claim.detail}</small></span>
                    <span className="form-code">{claim.form}</span>
                  </button>
                ))}
              </div>

              <label className="field-label" htmlFor="amount">Amount you want to claim</label>
              <div className="amount-field"><span>₹</span><input id="amount" inputMode="numeric" defaultValue="300000" aria-describedby="amount-help" /><span className="amount-suffix">INR</span></div>
              <p id="amount-help" className="field-help">We will calculate your maximum eligible amount, not just validate this number.</p>

              <button className="primary-action" type="button" onClick={() => setChecked(true)}><ShieldCheck size={19} /> Run my pre-check</button>
              <p className="privacy-line"><ShieldCheck size={15} /> Demo runs in your browser. No real UAN, Aadhaar or bank data.</p>
            </section>

            <aside className="record-preview" aria-label="Sample record being checked">
              <div className="record-top"><span>Sample record</span><span className="record-status"><Check size={13} /> Loaded</span></div>
              <div className="member-row"><span className="large-avatar">AS</span><div><strong>Asha Sharma</strong><small>UAN ···· 4821</small></div></div>
              <dl className="record-stats">
                <div><dt>Passbook balance</dt><dd>₹6,12,430</dd></div>
                <div><dt>Declared service</dt><dd>7y 10m</dd></div>
                <div><dt>Synced service</dt><dd className="warning-text">4y 8m</dd></div>
                <div><dt>KYC & bank</dt><dd className="success-text">Verified</dd></div>
              </dl>
              <div className={'preview-callout ' + (checked ? 'revealed' : '')} role="status" aria-live="polite">
                {checked ? <><span className="callout-icon">!</span><div><strong>1 blocker found</strong><p>EPFO sees 56 months of service. This claim needs 60 months.</p></div></> : <><span className="scan-line" /><p>Your record check will appear here.</p></>}
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
