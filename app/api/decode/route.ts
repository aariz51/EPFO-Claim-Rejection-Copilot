import { decodeRejection } from '../../lib/claim-engine';

/**
 * REJECTION DECODER
 * -----------------
 * The proposal in this project is that EPFO should stop returning free text and
 * start returning a structured payload: rule_id, required_value, actual_value,
 * remedy_code, responsible_owner, appeal_by.
 *
 * Until it does, something has to turn the free text into that shape. That is a
 * genuinely hard mapping problem, because the remarks arrive in an unbounded
 * number of phrasings across offices, and it is the one place in this product
 * where a model earns its keep rather than decorating the page.
 *
 * Known patterns are matched deterministically first. A member deciding what to
 * do deserves the same answer every time they ask. The model is only asked
 * about text the rule table does not recognise, and its output is validated
 * into the same contract before it is shown.
 *
 * Without a key the route returns the deterministic result and says so. It
 * never presents a template as model output.
 */

interface Body {
  text?: string;
  lang?: 'en' | 'hi';
}

export interface DecodePayload {
  rule_id: string;
  title: string;
  plain_en: string;
  plain_hi: string;
  required_value: string | null;
  actual_value: string | null;
  remedy_code: string;
  remedy_en: string;
  responsible_owner: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'rules' | 'openai' | 'rules-fallback';
  note?: string;
}

const SYSTEM = `You map Indian EPFO claim rejection remarks onto a structured contract.

You will be given the raw remark text a member received. Return ONLY JSON matching:
{
  "rule_id": string,            // a stable upper-snake identifier you infer, e.g. EPS_SERVICE_MISSING
  "title": string,              // under 60 chars, what actually went wrong
  "plain_en": string,           // 2 sentences max, plain English, no jargon, addressed to the member
  "plain_hi": string,           // the same in plain spoken Hindi, NOT Sanskritised officialese
  "required_value": string|null,// what the rule demanded, if the text states or implies it
  "actual_value": string|null,  // what the member's record had, if stated or implied
  "remedy_code": string,        // upper-snake, e.g. RAISE_JOINT_DECLARATION
  "remedy_en": string,          // one concrete next action the member can take
  "responsible_owner": string,  // who must act: "Member", "Employer", "EPFO field office", or a combination
  "confidence": "high"|"medium"|"low"
}

Rules:
- Never invent a number. If the remark does not state a required or actual value, use null.
- If the remark is too vague to map safely, set confidence "low" and say so in plain_en.
- Never tell the member their claim is approved or that money is coming.
- Never use an em dash.`;

function toPayload(text: string, source: DecodePayload['source'], note?: string): DecodePayload {
  const d = decodeRejection(text);
  return {
    rule_id: d.code,
    title: d.title,
    plain_en: d.meaning,
    plain_hi: d.hindiMeaning,
    required_value: null,
    actual_value: null,
    remedy_code: d.remedyCode,
    remedy_en: d.steps[0] ?? 'Request the rule ID and the actual value used in the decision.',
    responsible_owner: d.owner,
    confidence: d.code === 'NEEDS-MANUAL-REVIEW' ? 'low' : 'high',
    source,
    note,
  };
}

/** Does the deterministic table actually recognise this, or did it fall through? */
function ruleTableMatched(text: string): boolean {
  return decodeRejection(text).code !== 'NEEDS-MANUAL-REVIEW';
}

export async function POST(request: Request): Promise<Response> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const text = (body.text ?? '').trim();
  if (!text) return Response.json({ error: 'No rejection text supplied' }, { status: 400 });
  if (text.length > 2000) return Response.json({ error: 'Text too long' }, { status: 400 });

  // Known pattern. Deterministic wins, no model call, no cost, no variance.
  if (ruleTableMatched(text)) {
    return Response.json(toPayload(text, 'rules'));
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return Response.json(
      toPayload(text, 'rules-fallback', 'No model key is configured, so this is the built-in fallback rather than a decoded result.')
    );
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        max_tokens: 600,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Rejection remark received by the member:\n\n${text}` },
        ],
      }),
    });

    if (!res.ok) throw new Error(`OpenAI returned ${res.status}`);
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error('Empty completion');

    const parsed = JSON.parse(raw) as Partial<DecodePayload>;

    // Validate into the contract. A malformed model reply must not reach a member.
    if (!parsed.rule_id || !parsed.title || !parsed.plain_en || !parsed.remedy_code) {
      throw new Error('Model reply did not match the contract');
    }

    const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/[—–]/g, '-') : null);

    return Response.json({
      rule_id: String(parsed.rule_id),
      title: clean(parsed.title),
      plain_en: clean(parsed.plain_en),
      plain_hi: clean(parsed.plain_hi) ?? '',
      required_value: clean(parsed.required_value),
      actual_value: clean(parsed.actual_value),
      remedy_code: String(parsed.remedy_code),
      remedy_en: clean(parsed.remedy_en) ?? '',
      responsible_owner: clean(parsed.responsible_owner) ?? 'Member',
      confidence: (['high', 'medium', 'low'] as const).includes(parsed.confidence as 'high')
        ? parsed.confidence
        : 'low',
      source: 'openai',
    } satisfies DecodePayload);
  } catch (err) {
    return Response.json(
      toPayload(
        text,
        'rules-fallback',
        err instanceof Error && err.message.includes('401')
          ? 'The configured model key was rejected, so this is the built-in fallback.'
          : 'The model call did not complete, so this is the built-in fallback.'
      )
    );
  }
}
