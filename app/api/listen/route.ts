/**
 * VOICE INTAKE
 * ------------
 * The median EPF member is not the person who enjoys a form. Research on
 * low-literacy users in India is blunt: text-only interfaces reach near-zero
 * task completion where graphical ones reach full completion. Speech is the
 * shortest path for that person, and the language they will speak is whichever
 * one they actually think in.
 *
 * Two calls, one job each:
 *   gpt-4o-transcribe  hears any Indian language and returns the words.
 *   gpt-4.1-mini       maps those words onto the three journeys and the few
 *                      facts the engine needs, or null when it did not hear one.
 *
 * The model never decides the verdict. It decides which question was asked. The
 * charter clock, the penal interest and the rule table stay deterministic.
 *
 * We do not claim the advice comes back in Kannada. Understanding a language and
 * being safe to give money advice in it are different bars. Input takes every
 * language; output stays English and Hindi, which are the checked ones.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

const EXTRACT = `You route an EPF member's spoken problem into one of three journeys.

Return ONLY JSON with these keys:
  journey     "before"   they want to withdraw and have not applied yet
              "waiting"  they applied and the money has not arrived
              "rejected" their claim was refused
              null       genuinely unclear
  daysWaiting number of days since they applied, or null
  amount      rupees they asked for or expect, or null
  rejectionText  if they are quoting what the rejection said, the quoted reason,
                 else null

Rules:
- Never invent a number. Not stated means null.
- "Do mahine" is 60 days. "Teen hafte" is 21 days. "Ek saal" is 365.
- "Paisa nahi aaya" with no rejection mentioned is "waiting", not "rejected".
- Return the JSON and nothing else.`;

export async function POST(request: Request) {
  // Aariz's local shell exposes OPENAI_KEY; hosts conventionally use
  // OPENAI_API_KEY. Accept either, and never send either to the browser.
  const key = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  if (!key) {
    return Response.json(
      { error: 'Voice needs an OpenAI key on the server. Use the buttons instead.' },
      { status: 503 },
    );
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get('audio');
    if (f instanceof File) file = f;
  } catch {
    return Response.json({ error: 'Could not read the recording.' }, { status: 400 });
  }
  if (!file || file.size === 0) {
    return Response.json({ error: 'No audio was received.' }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return Response.json({ error: 'That recording is too long.' }, { status: 413 });
  }

  // Plain fetch, matching the decode route. No SDK dependency for two calls.
  let transcript = '';
  try {
    const up = new FormData();
    up.append('file', file, file.name || 'speech.webm');
    up.append('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-transcribe');
    // No language hint on purpose: forcing one is how Kannada becomes bad Hindi.
    up.append('response_format', 'json');
    const tr = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key },
      body: up,
    });
    if (!tr.ok) throw new Error('transcribe ' + tr.status);
    const tj = (await tr.json()) as { text?: string };
    transcript = tj.text?.trim() ?? '';
  } catch (error) {
    console.error('[listen] transcription failed', error);
    return Response.json(
      { error: 'Could not hear that clearly. Try again, or use the buttons.' },
      { status: 502 },
    );
  }

  if (!transcript) {
    return Response.json({ error: 'Nothing was said in that recording.' }, { status: 422 });
  }

  const heard = {
    transcript,
    journey: null as 'before' | 'waiting' | 'rejected' | null,
    daysWaiting: null as number | null,
    amount: null as number | null,
    rejectionText: null as string | null,
  };

  try {
    const cr = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        temperature: 0,
        max_tokens: 250,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: EXTRACT },
          { role: 'user', content: transcript },
        ],
      }),
    });
    const cj = (await cr.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = cj.choices?.[0]?.message?.content;
    if (raw) {
      const p = JSON.parse(raw) as Record<string, unknown>;
      if (p.journey === 'before' || p.journey === 'waiting' || p.journey === 'rejected') {
        heard.journey = p.journey;
      }
      if (typeof p.daysWaiting === 'number' && p.daysWaiting >= 0) heard.daysWaiting = Math.round(p.daysWaiting);
      if (typeof p.amount === 'number' && p.amount > 0) heard.amount = Math.round(p.amount);
      if (typeof p.rejectionText === 'string' && p.rejectionText.trim()) heard.rejectionText = p.rejectionText.trim();
    }
  } catch (error) {
    console.error('[listen] extraction failed, transcript only', error);
  }

  return Response.json(heard);
}
