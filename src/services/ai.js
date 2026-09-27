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
    return ollamaChat(
        [
            { role: 'system', content: SYSTEM_PROMPT },
            ...(context?.trim() ? [{ role: 'system', content: context.trim() }] : []),
            ...messages
                .filter((m) => m.role === 'user' || m.role === 'assistant')
                .map((m) => ({ role: m.role, content: m.text })),
        ],
        { signal }
    )
}

/** Raw Ollama `/api/chat` call. `format: 'json'` forces a JSON reply. */
async function ollamaChat(chatMessages, { signal, format } = {}) {
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
                ...(format ? { format } : {}),
                messages: chatMessages,
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

// ---------- Instructor: PDF -> draft course ----------

// Keep the prompt well inside the model's context window.
const MAX_SOURCE_CHARS = 60000

const LECTURE_PROMPT = `You are an expert instructional designer for Stellar, an online learning app.
Turn the instructor's source material into a course made of clear, well-structured lectures for students.

Reply with ONLY a JSON object of this exact shape:
{
  "title": "course title",
  "subject": "one or two word subject, e.g. Mathematics",
  "description": "2-3 sentence course description",
  "lessons": [
    {
      "title": "lesson title",
      "summary": "one sentence summary",
      "difficulty": "Easy" | "Medium" | "Hard",
      "duration_min": 10-30,
      "content": "the full lecture in Markdown"
    }
  ]
}

Rules:
- Create between 3 and 8 lessons that follow the order of the source material, easiest first.
- Each "content" is a complete lecture (roughly 300-700 words) in Markdown: use ## and ### headings, short paragraphs, **bold** key terms, bullet or numbered lists, and > blockquotes for key takeaways or worked examples.
- Explain concepts in your own words for a student; do not copy long passages verbatim.
- Stay faithful to the source. Do not invent facts that are not supported by it.
- Do not repeat the lesson title as a heading at the start of "content".`

/**
 * Ask the model to draft a course (title, description, lessons with
 * markdown lectures) from extracted document text. Returns the parsed
 * object; lesson content is still markdown.
 */
export async function generateCourseFromText(sourceText, { signal, fileName, guidance } = {}) {
    const text = (sourceText ?? '').trim()
    if (!text) throw new Error('The PDF has no readable text (it may be a scanned image).')

    const truncated = text.length > MAX_SOURCE_CHARS
    const source = truncated ? text.slice(0, MAX_SOURCE_CHARS) : text

    const reply = await ollamaChat(
        [
            { role: 'system', content: LECTURE_PROMPT },
            {
                role: 'user',
                content: [
                    fileName ? `Source file: ${fileName}` : '',
                    guidance?.trim() ? `Instructor notes: ${guidance.trim()}` : '',
                    truncated ? '(Source truncated to fit; cover what is provided.)' : '',
                    '--- SOURCE MATERIAL ---',
                    source,
                ].filter(Boolean).join('\n\n'),
            },
        ],
        { signal, format: 'json' }
    )

    let parsed
    try {
        // Tolerate a stray ```json fence around the object.
        parsed = JSON.parse(reply.replace(/^```(?:json)?\s*|\s*```$/g, ''))
    } catch {
        throw new Error('The AI reply was not valid JSON — try generating again.')
    }

    const lessons = Array.isArray(parsed?.lessons) ? parsed.lessons : []
    if (lessons.length === 0) throw new Error('The AI did not produce any lessons — try again or add notes.')

    const difficulties = ['Easy', 'Medium', 'Hard']
    return {
        title: String(parsed.title ?? '').trim(),
        subject: String(parsed.subject ?? '').trim(),
        description: String(parsed.description ?? '').trim(),
        truncated,
        lessons: lessons.map((l, i) => ({
            title: String(l?.title ?? `Lesson ${i + 1}`).trim(),
            summary: String(l?.summary ?? '').trim(),
            difficulty: difficulties.includes(l?.difficulty) ? l.difficulty : 'Easy',
            duration_min: Math.min(Math.max(parseInt(l?.duration_min, 10) || 15, 5), 90),
            content: String(l?.content ?? ''),
        })),
    }
}

// ---------- Instructor: lecture -> draft quiz ----------

const MAX_QUIZ_SOURCE_CHARS = 15000

const QUIZ_PROMPT = `You write multiple-choice quizzes for Stellar, an online learning app.
Given one lecture, write questions that check a student understood THAT lecture.

Reply with ONLY a JSON object of this exact shape:
{
  "questions": [
    {
      "question": "question text",
      "options": [
        { "text": "answer", "is_correct": true },
        { "text": "answer", "is_correct": false }
      ],
      "explanation": "one sentence explaining why the correct answer is right"
    }
  ]
}

Rules:
- Every question must be answerable from the lecture text alone. Do not use outside facts.
- Exactly 4 options per question and exactly ONE with "is_correct": true.
- Wrong options must be plausible, not silly. Never use "All of the above" or "None of the above".
- Mix recall and understanding questions; keep each question short and unambiguous.`

function shuffle(list) {
    const copy = [...list]
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
}

/**
 * Draft a quiz for one lecture. `text` is the lecture as plain text.
 * Returns { questions: [{ question, explanation, options: [{ text, is_correct }] }] }
 * with malformed questions dropped and answer order shuffled.
 */
export async function generateQuizForLesson({ title, text }, { signal, count = 4 } = {}) {
    const body = (text ?? '').trim()
    if (!body) throw new Error('Write the lecture first — the quiz is generated from its text.')

    const reply = await ollamaChat(
        [
            { role: 'system', content: QUIZ_PROMPT },
            {
                role: 'user',
                content: [
                    `Write ${count} questions.`,
                    title ? `Lecture title: ${title}` : '',
                    '--- LECTURE ---',
                    body.slice(0, MAX_QUIZ_SOURCE_CHARS),
                ].filter(Boolean).join('\n\n'),
            },
        ],
        { signal, format: 'json' }
    )

    let parsed
    try {
        parsed = JSON.parse(reply.replace(/^```(?:json)?\s*|\s*```$/g, ''))
    } catch {
        throw new Error('The AI reply was not valid JSON — try generating again.')
    }

    const questions = (Array.isArray(parsed?.questions) ? parsed.questions : [])
        .map((q) => {
            const options = (Array.isArray(q?.options) ? q.options : [])
                .map((o) => ({ text: String(o?.text ?? '').trim(), is_correct: o?.is_correct === true }))
                .filter((o) => o.text)
                .slice(0, 6)
            return {
                question: String(q?.question ?? '').trim(),
                explanation: String(q?.explanation ?? '').trim(),
                options: shuffle(options),
            }
        })
        .filter((q) => q.question && q.options.length >= 2 && q.options.filter((o) => o.is_correct).length === 1)
        .slice(0, 15)

    if (questions.length === 0) throw new Error('The AI did not produce usable questions — try again.')
    return { questions }
}
