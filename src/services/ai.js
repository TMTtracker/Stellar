/**
 * Ollama Cloud chat service.
 *
 * Key lives in `.env` (never committed — see `.env.example`):
 *   VITE_OLLAMA_API_KEY=...      required, from https://ollama.com/settings/keys
 *   VITE_OLLAMA_MODEL=gemma4:31b-cloud (optional override)
 *   VITE_OLLAMA_BASE_URL=/api/ollama (optional override; dev proxy -> https://ollama.com/api)
 *
 * Uses the native Ollama `/api/chat` endpoint (non-streaming) with a
 * `Bearer` key, per https://docs.ollama.com/api/authentication.
 *
 * NOTE: browsers block direct calls to https://ollama.com (CORS), so the
 * default base is same-origin `/api/ollama`, forwarded by the Vite dev
 * proxy (see vite.config.js). Restart `npm run dev` after editing it.
 */

const BASE_URL = (import.meta.env.VITE_OLLAMA_BASE_URL ?? '/api/ollama').replace(/\/$/, '')
const MODEL = import.meta.env.VITE_OLLAMA_MODEL ?? 'gemma4:31b-cloud'

const SYSTEM_PROMPT =
    'You are Stellar Tutor, a friendly study companion inside the Stellar learning app. Explain clearly and concisely, and prefer small examples and practice questions.'

export function getAiModel() {
    return MODEL
}

/** True when a key is present in `.env` — otherwise the UI shows a setup hint. */
export function isAiConfigured() {
    return !!(import.meta.env.VITE_OLLAMA_API_KEY ?? '').trim()
}

/**
 * Send chat history to Ollama Cloud and resolve with the assistant reply text.
 * `messages` are `{ role: 'user'|'assistant', text: string }` UI messages.
 * `context` is optional extra background (e.g. a lesson's content) sent as
 * a system message — never shown as a chat bubble.
 */
export async function sendChatMessage(messages, { signal, context } = {}) {
    const apiKey = (import.meta.env.VITE_OLLAMA_API_KEY ?? '').trim()
    if (!apiKey) {
        throw new Error(
            'Missing VITE_OLLAMA_API_KEY — add your Ollama Cloud key to .env (see .env.example).'
        )
    }

    let res
    try {
        res = await fetch(`${BASE_URL}/chat`, {
            method: 'POST',
            signal,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: MODEL,
                stream: false,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...(context?.trim() ? [{ role: 'system', content: context.trim() }] : []),
                    ...messages
                        .filter((m) => m.role === 'user' || m.role === 'assistant')
                        .map((m) => ({ role: m.role, content: m.text })),
                ],
            }),
        })
    } catch (err) {
        if (err?.name === 'AbortError') throw err
        throw new Error(
            'Network request failed — the dev-server proxy (/api/ollama) may not be running. Restart `npm run dev` and try again.',
            { cause: err }
        )
    }

    if (res.status === 401 || res.status === 403) {
        throw new Error('Ollama Cloud rejected the API key (401/403) — check VITE_OLLAMA_API_KEY in .env.')
    }
    if (!res.ok) {
        const detail = (await res.text()).slice(0, 200)
        throw new Error(`Ollama Cloud request failed (${res.status})${detail ? ` — ${detail}` : ''}`)
    }

    const data = await res.json()
    const content = data?.message?.content?.trim()
    if (!content) throw new Error('Ollama Cloud returned an empty reply — try again.')
    return content
}
