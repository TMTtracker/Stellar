import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import {
    Bot,
    BookOpen,
    Check,
    ChevronDown,
    Code2,
    Link2,
    ListChecks,
    Paperclip,
    Target,
    Send,
    Plus,
    Sparkles,
    MessageSquare,
    X,
    Zap,
} from 'lucide-react'
import ProtectedLayout from '@/components/ProtectedLayout/ProtectedLayout'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { cn, formatRelativeTime } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { sendChatMessage, isAiConfigured, getAiModel } from '@/services/ai'
import { getCourseProgress, getMyEnrollments, listLessons } from '@/services/courses'
import { getLessonDetail } from '@/services/lessons'

const suggestions = [
    'Explain recursion simply',
    'Quiz me on arrays',
    'Debug my for-loop',
    'Make a 7-day study plan',
]

const capabilities = [
    { icon: BookOpen, title: 'Explain lessons', desc: 'Plain-language breakdowns of any topic.' },
    { icon: Code2, title: 'Debug code', desc: 'Paste an error, get a fix + why.' },
    { icon: ListChecks, title: 'Generate quizzes', desc: 'Practice questions at your level.' },
    { icon: Target, title: 'Study plans', desc: 'Daily goals tied to your courses.' },
]

// Recent chats live in localStorage (per user, per browser) — no backend,
// so chat text never leaves the device. Only the lesson ref is stored
// alongside messages; full lesson content is re-attached on demand.
const MAX_STORED_CHATS = 20
const MAX_STORED_MESSAGES = 100
const TITLE_LENGTH = 42

function storageKey(uid) {
    return `stellar:chats:${uid}`
}

function readConversations(uid) {
    if (!uid || typeof window === 'undefined') return []
    try {
        const raw = window.localStorage.getItem(storageKey(uid))
        const list = raw ? JSON.parse(raw) : []
        return Array.isArray(list) ? list : []
    } catch {
        return []
    }
}

function writeConversations(uid, list) {
    if (!uid || typeof window === 'undefined') return
    try {
        window.localStorage.setItem(storageKey(uid), JSON.stringify(list.slice(0, MAX_STORED_CHATS)))
    } catch {
        // quota or privacy mode — chats simply don't persist
    }
}

function conversationTitle(messages) {
    const first = messages.find((m) => m.role === 'user')
    const text = (first?.text ?? 'New chat').trim().replace(/\s+/g, ' ')
    return text.length > TITLE_LENGTH ? `${text.slice(0, TITLE_LENGTH)}…` : text
}function now() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Compact markdown styling for assistant replies (inherits bubble colors).
const chatMd = {
    p: ({ children }) => <p className="my-2 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
    h1: ({ children }) => <p className="mt-3 mb-1 text-base font-extrabold first:mt-0">{children}</p>,
    h2: ({ children }) => <p className="mt-3 mb-1 text-[15px] font-extrabold first:mt-0">{children}</p>,
    h3: ({ children }) => <p className="mt-3 mb-1 text-sm font-bold first:mt-0">{children}</p>,
    h4: ({ children }) => <p className="mt-2 mb-1 text-sm font-bold first:mt-0">{children}</p>,
    ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
    code: ({ children }) => <code className="rounded-md bg-black/10 px-1.5 py-0.5 font-mono text-[12px]">{children}</code>,
    pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-xl bg-[#1F2225] p-3 text-[12px] leading-relaxed text-[#E8F0E6]">{children}</pre>,
    blockquote: ({ children }) => <blockquote className="my-2 rounded-r-lg border-l-4 border-[#A9D8AE] bg-black/5 px-3 py-2">{children}</blockquote>,
    a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-2">{children}</a>,
    hr: () => <hr className="my-3 opacity-20" />,
    table: ({ children }) => <div className="my-2 overflow-x-auto"><table className="w-full text-[13px]">{children}</table></div>,
    th: ({ children }) => <th className="px-2 py-1 text-left font-bold">{children}</th>,
    td: ({ children }) => <td className="px-2 py-1 align-top">{children}</td>
}

// Lesson content attached via route state (Summarize with AI button).
// Capped so giant lessons don't blow up the model's context window.
const MAX_CONTEXT_CHARS = 8000

function lessonContextText(lesson) {
    if (!lesson) return ''
    const body = (lesson.content ?? '').trim() || '(no written content — summarize from the title and summary instead)'
    const trimmed = body.length > MAX_CONTEXT_CHARS
        ? `${body.slice(0, MAX_CONTEXT_CHARS)}\n…(lesson truncated for length)`
        : body
    return [
        `The user is asking about the lesson "${lesson.title}"${lesson.courseTitle ? ` from the course "${lesson.courseTitle}"` : ''}.`,
        lesson.summary ? `Lesson summary: ${lesson.summary}` : '',
        `Lesson content:\n${trimmed}`,
    ].filter(Boolean).join('\n')
}

function ChatBubble({ message }) {
    const isUser = message.role === 'user'
    return (
        <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
            <Avatar className={cn(isUser ? 'bg-[#141814] text-white' : 'bg-primary text-primary-foreground')}>
                <AvatarFallback className={cn(isUser ? 'bg-[#141814] text-white' : 'bg-primary text-primary-foreground')}>
                    {isUser ? 'Y' : <Bot size={16} />}
                </AvatarFallback>
            </Avatar>
            <div className={cn('max-w-[75%] space-y-1', isUser && 'text-right')}>
                {isUser && message.lessonRef?.title && (
                    message.lessonRef.id && message.lessonRef.courseId ? (
                        <Link
                            to={`/courses/${message.lessonRef.courseId}/lessons/${message.lessonRef.id}`}
                            className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground hover:underline"
                        >
                            <Link2 size={12} className="shrink-0" />
                            <span className="truncate font-medium">{message.lessonRef.title}</span>
                        </Link>
                    ) : (
                        <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                            <Link2 size={12} className="shrink-0" />
                            <span className="truncate font-medium">{message.lessonRef.title}</span>
                        </span>
                    )
                )}
                <div
                    className={cn(
                        'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                        isUser
                            ? 'inline-block rounded-tr-md bg-primary text-primary-foreground whitespace-pre-wrap'
                            : message.error
                                ? 'rounded-tl-md border border-destructive/40 bg-destructive/10 text-foreground whitespace-pre-wrap'
                                : 'rounded-tl-md bg-muted text-foreground'
                    )}
                >
                    {isUser || message.error
                        ? message.text
                        : <ReactMarkdown components={chatMd}>{message.text}</ReactMarkdown>}
                </div>
                <p className="text-[11px] text-muted-foreground">{message.time}</p>
            </div>
        </div>
    )
}

export default function AI() {
    const location = useLocation()
    const { user } = useAuth()
    const uid = user?.id ?? null
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const [lessonContext, setLessonContext] = useState(() => location.state?.lesson ?? null)
    const [conversations, setConversations] = useState(() => readConversations(user?.id))
    const [activeId, setActiveId] = useState(null)
    const [ownerUid, setOwnerUid] = useState(uid)
    const consumedKeys = useRef(new Set())
    const hasChat = messages.length > 0

    // Adjust for account switch during render (endorsed derived-state
    // pattern — keeps each user's chats isolated without an effect).
    if (ownerUid !== uid) {
        setOwnerUid(uid)
        setConversations(readConversations(uid))
        setActiveId(null)
        setMessages([])
    }

    async     function openConversation(id) {
        const convo = conversations.find((c) => c.id === id)
        if (!convo) return
        setActiveId(id)
        setMessages(convo.messages ?? [])
        const ref = [...(convo.messages ?? [])].reverse().find((m) => m.lessonRef?.title)?.lessonRef ?? null
        if (!ref?.id) {
            setLessonContext(null)
            return
        }
        // Re-fetch full content (only the ref is stored) so follow-ups
        // keep real context; fall back to title-only on failure.
        try {
            const detail = await getLessonDetail(ref.id)
            setLessonContext({
                id: ref.id,
                courseId: detail.lesson?.course_id ?? ref.courseId ?? null,
                courseTitle: detail.course?.title ?? '',
                title: detail.lesson?.title ?? ref.title,
                summary: detail.lesson?.summary ?? '',
                content: detail.lesson?.content ?? ''
            })
        } catch {
            setLessonContext({ id: ref.id, courseId: ref.courseId ?? null, courseTitle: '', title: ref.title, summary: '', content: '' })
        }
    }

    function startNewChat() {
        setMessages([])
        setLessonContext(null)
        setActiveId(null)
    }

    function deleteConversation(id, e) {
        e.stopPropagation()
        const next = conversations.filter((c) => c.id !== id)
        writeConversations(uid, next)
        setConversations(next)
        if (activeId === id) startNewChat()
    }

    // Lesson picker modal state
    const [pickerOpen, setPickerOpen] = useState(false)
    const [enrolled, setEnrolled] = useState([])
    const [pickerLoading, setPickerLoading] = useState(false)
    const [pickerError, setPickerError] = useState('')
    const [expanded, setExpanded] = useState(null)
    const [lessonsByCourse, setLessonsByCourse] = useState({})
    const [completedByCourse, setCompletedByCourse] = useState({})
    const [lessonsLoading, setLessonsLoading] = useState(false)
    const [search, setSearch] = useState('')

    async function runSend(text, history, context) {
        const sent = [...history, {
            id: `u-${Date.now()}`,
            role: 'user',
            text,
            time: now(),
            lessonRef: context ? { id: context.id ?? null, courseId: context.courseId ?? null, title: context.title ?? '' } : null
        }]
        setMessages(sent)
        setSending(true)
        let final
        try {
            const reply = await sendChatMessage(sent, { context: context ? lessonContextText(context) : '' })
            final = [...sent, { id: `a-${Date.now()}`, role: 'assistant', text: reply, time: now() }]
        } catch (err) {
            final = [...sent, { id: `e-${Date.now()}`, role: 'assistant', text: err.message, time: now(), error: true }]
        }
        setMessages(final)
        setSending(false)
        if (uid && final.length > 0) {
            const nowIso = new Date().toISOString()
            const trimmedMessages = final.slice(-MAX_STORED_MESSAGES)
            let next
            if (activeId && conversations.some((c) => c.id === activeId)) {
                next = conversations.map((c) =>
                    c.id === activeId
                        ? { ...c, messages: trimmedMessages, title: conversationTitle(final), updatedAt: nowIso }
                        : c
                )
            } else {
                const fresh = {
                    id: `c-${Date.now()}`,
                    title: conversationTitle(final),
                    createdAt: nowIso,
                    updatedAt: nowIso,
                    messages: trimmedMessages
                }
                setActiveId(fresh.id)
                next = [fresh, ...conversations]
            }
            next = next.slice(0, MAX_STORED_CHATS)
            writeConversations(uid, next)
            setConversations(next)
        }
    }

    async function handleSend(e) {
        e?.preventDefault()
        const text = input.trim()
        if (!text || sending) return
        setInput('')
        await runSend(text, messages, lessonContext)
    }

    // Arriving from a lesson's "Summarize with AI" button: attach the
    // lesson and auto-request a summary once per navigation.
    useEffect(() => {
        const incoming = location.state?.lesson
        if (!incoming || consumedKeys.current.has(location.key)) return
        consumedKeys.current.add(location.key)
        setLessonContext(incoming)
        runSend('Summarize this lesson for me — key ideas, then one quick takeaway.', messages, incoming)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.key])

    // Escape closes the lesson picker
    useEffect(() => {
        if (!pickerOpen) return
        function onKey(e) {
            if (e.key === 'Escape') setPickerOpen(false)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [pickerOpen])

    async function openPicker() {
        setPickerOpen(true)
        setSearch('')
        if (enrolled.length > 0 || pickerLoading) return
        setPickerLoading(true)
        setPickerError('')
        try {
            setEnrolled(await getMyEnrollments())
        } catch (e) {
            setPickerError(e.message ?? 'Failed to load courses')
        } finally {
            setPickerLoading(false)
        }
    }

    async function toggleCourse(courseId) {
        if (expanded === courseId) {
            setExpanded(null)
            return
        }
        setExpanded(courseId)
        if (lessonsByCourse[courseId]) return
        setLessonsLoading(true)
        try {
            const [rows, progress] = await Promise.all([
                listLessons(courseId),
                getCourseProgress(courseId).catch(() => [])
            ])
            setLessonsByCourse((prev) => ({ ...prev, [courseId]: rows ?? [] }))
            setCompletedByCourse((prev) => ({
                ...prev,
                [courseId]: new Set((progress ?? []).map((p) => p.lesson_id))
            }))
        } catch (e) {
            setPickerError(e.message ?? 'Failed to load lessons')
        } finally {
            setLessonsLoading(false)
        }
    }

    function attachLesson(lesson, courseTitle, courseId) {
        setLessonContext({
            id: lesson.id,
            courseId,
            courseTitle,
            title: lesson.title,
            summary: lesson.summary ?? '',
            content: lesson.content ?? ''
        })
        setPickerOpen(false)
    }

    const query = search.trim().toLowerCase()
    const visibleCourses = enrolled.filter((e) => {
        const title = e.courses?.title ?? ''
        if (!query) return true
        if (title.toLowerCase().includes(query)) return true
        const lessons = lessonsByCourse[e.courses?.id ?? e.course_id] ?? []
        return lessons.some((l) => (l.title ?? '').toLowerCase().includes(query))
    })

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <ProtectedLayout>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-[11px] font-bold tracking-wider text-[#A9D8AE]">AI TUTOR</p>
                    <h1 className="text-3xl font-extrabold tracking-tight">Ask Stellar AI</h1>
                    <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                        Your study companion for explanations, debugging help, and quick practice quizzes.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                        <Sparkles /> Beta
                    </Badge>
                    <Button variant="outline" onClick={startNewChat}>
                        <Plus /> New chat
                    </Button>
                </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                {/* Chat panel — suggestions + textbox; messages appear after the first send */}
                <Card className="flex min-h-[560px] flex-col overflow-hidden">
                    <CardContent className="flex flex-1 flex-col justify-end gap-5 overflow-y-auto py-6">
                        {!hasChat ? (
                            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
                                <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                                    <Bot size={26} />
                                </span>
                                <div>
                                    <p className="text-lg font-bold">What do you want to learn?</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Pick a suggestion below or type your own question.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {messages.map((m) => (
                                    <ChatBubble key={m.id} message={m} />
                                ))}
                                {sending && (
                                    <div className="flex w-fit items-center gap-2 rounded-2xl rounded-tl-md bg-muted px-4 py-3 text-sm text-muted-foreground">
                                        <span className="flex gap-1" aria-hidden>
                                            <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
                                            <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
                                            <span className="size-1.5 animate-bounce rounded-full bg-current" />
                                        </span>
                                        Thinking…
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                    <Separator />
                    <CardFooter className="flex-col items-stretch gap-3 pt-5">
                        {lessonContext && (
                            <div className="flex items-center gap-2 rounded-xl border border-[#A9D8AE] bg-[#EFF7EE] px-3 py-2 text-sm">
                                <BookOpen size={15} className="shrink-0 text-[#3E7A42]" />
                                <span className="min-w-0 flex-1 truncate font-medium">
                                    Summarizing: {lessonContext.title}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label="Detach lesson"
                                    onClick={() => setLessonContext(null)}
                                >
                                    <X />
                                </Button>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map((s) => (
                                <Button key={s} variant="outline" size="sm" onClick={() => setInput(s)}>
                                    {s}
                                </Button>
                            ))}
                        </div>
                        <form onSubmit={handleSend} className="flex items-end gap-2">
                            <div className="flex flex-1 items-end gap-2 rounded-2xl border border-input bg-background p-2 pl-3 focus-within:border-ring">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Attach a lesson"
                                    title={lessonContext ? `Attached: ${lessonContext.title} (pick another)` : 'Attach a lesson'}
                                    onClick={openPicker}
                                >
                                    <Paperclip />
                                </Button>
                                <Textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask about any lesson, error message, or concept…"
                                    className="max-h-32 min-h-10 flex-1 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    aria-label="Send message"
                                    disabled={!input.trim() || sending}
                                >
                                    <Send />
                                </Button>
                            </div>
                        </form>
                        <p className="text-[11px] text-muted-foreground">
                            {isAiConfigured()
                                ? `Powered by Ollama Cloud · ${getAiModel()}${lessonContext ? ' · lesson attached' : ''}`
                                : 'Add VITE_OLLAMA_API_KEY to .env to enable replies (see .env.example).'}
                        </p>
                    </CardFooter>
                </Card>

                {/* Side column */}
                <div className="space-y-5">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">What I can do</CardTitle>
                            <CardDescription>Built for learning, not shortcuts</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {capabilities.map(({ icon: Icon, title, desc }) => (
                                <div key={title} className="flex gap-3">
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                                        <Icon size={16} />
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold">{title}</p>
                                        <p className="text-xs text-muted-foreground">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Session</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-muted-foreground">Course context</span>
                                <Badge variant="outline">All enrolled</Badge>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-muted-foreground">Model</span>
                                <Badge variant="secondary">{getAiModel()}</Badge>
                            </div>
                            <Separator />
                            <p className="flex items-start gap-2 text-xs text-muted-foreground">
                                <Zap size={14} className="mt-0.5 shrink-0 text-[#E8933E]" />
                                Chats don&apos;t earn XP — complete a lesson or quiz to level up.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-base">Recent chats</CardTitle>
                            <MessageSquare size={16} className="text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="space-y-1">
                            {conversations.length === 0 && (
                                <p className="px-3 py-2 text-xs text-muted-foreground">
                                    No chats yet — your conversations will appear here.
                                </p>
                            )}
                            {conversations.map((c) => (
                                <div
                                    key={c.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => openConversation(c.id)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') openConversation(c.id) }}
                                    className={cn(
                                        'group flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                                        c.id === activeId ? 'bg-muted font-semibold' : 'hover:bg-muted/60'
                                    )}
                                >
                                    <span className="min-w-0 flex-1 truncate">{c.title}</span>
                                    <span className="shrink-0 text-[11px] text-muted-foreground">
                                        {c.updatedAt ? formatRelativeTime(c.updatedAt) : ''}
                                    </span>
                                    <button
                                        type="button"
                                        aria-label={`Delete ${c.title}`}
                                        onClick={(e) => deleteConversation(c.id, e)}
                                        className="hidden shrink-0 rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground group-hover:block"
                                    >
                                        <X size={13} />
                                    </button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Lesson picker modal */}
            {pickerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setPickerOpen(false)} />
                    <Card className="relative flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden">
                        <CardHeader className="flex-row items-start justify-between space-y-0 pb-4">
                            <div>
                                <CardTitle className="text-base">Attach a lesson</CardTitle>
                                <CardDescription>Its content is sent with your next messages</CardDescription>
                            </div>
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Close" onClick={() => setPickerOpen(false)}>
                                <X />
                            </Button>
                        </CardHeader>
                        <div className="px-6 pb-3">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search courses or lessons…"
                            />
                        </div>
                        <CardContent className="flex-1 overflow-y-auto pt-1">
                            {pickerLoading && <p className="py-4 text-sm text-muted-foreground">Loading your courses…</p>}
                            {!pickerLoading && pickerError && <p className="py-4 text-sm text-destructive">{pickerError}</p>}
                            {!pickerLoading && !pickerError && enrolled.length === 0 && (
                                <div className="py-4 text-center">
                                    <p className="text-sm text-muted-foreground">You&apos;re not enrolled in any courses yet.</p>
                                    <Link to="/courses" className="mt-3 inline-block">
                                        <Button size="sm">Browse courses</Button>
                                    </Link>
                                </div>
                            )}
                            {!pickerLoading && !pickerError && visibleCourses.map((e) => {
                                const courseId = e.courses?.id ?? e.course_id
                                const title = e.courses?.title ?? 'Course'
                                const subject = e.courses?.subject ?? ''
                                const isOpen = expanded === courseId
                                const lessons = lessonsByCourse[courseId] ?? []
                                const shown = query
                                    ? lessons.filter((l) => (l.title ?? '').toLowerCase().includes(query))
                                    : lessons
                                return (
                                    <div key={courseId} className="mb-1 overflow-hidden rounded-xl border border-border">
                                        <button
                                            type="button"
                                            onClick={() => toggleCourse(courseId)}
                                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold hover:bg-muted/60"
                                        >
                                            <ChevronDown size={15} className={cn('shrink-0 text-muted-foreground transition-transform', !isOpen && '-rotate-90')} />
                                            <span className="min-w-0 flex-1 truncate">{title}</span>
                                            {subject && <Badge variant="outline">{subject}</Badge>}
                                        </button>
                                        {isOpen && (
                                            <div className="border-t border-border px-2 py-1">
                                                {lessonsLoading && lessons.length === 0 && (
                                                    <p className="px-2 py-2 text-xs text-muted-foreground">Loading lessons…</p>
                                                )}
                                                {!lessonsLoading && lessons.length === 0 && (
                                                    <p className="px-2 py-2 text-xs text-muted-foreground">No published lessons in this course.</p>
                                                )}
                                                {shown.map((l) => {
                                                    const done = completedByCourse[courseId]?.has(l.id)
                                                    return (
                                                        <button
                                                            key={l.id}
                                                            type="button"
                                                            onClick={() => attachLesson(l, title, courseId)}
                                                            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
                                                            title={done ? `${l.title} (completed)` : l.title}
                                                        >
                                                            {done ? (
                                                                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#A9D8AE] text-white">
                                                                    <Check size={12} strokeWidth={3} />
                                                                </span>
                                                            ) : (
                                                                <span className="size-5 shrink-0 rounded-full border border-border" />
                                                            )}
                                                            <span className={cn('min-w-0 flex-1 truncate', done && 'text-muted-foreground')}>
                                                                {l.title}
                                                            </span>
                                                            <span className="shrink-0 text-[11px] text-muted-foreground">
                                                                {done ? 'Done · ' : ''}{l.duration_min} min
                                                            </span>
                                                        </button>
                                                    )
                                                })}
                                                {lessons.length > 0 && shown.length === 0 && (
                                                    <p className="px-2 py-2 text-xs text-muted-foreground">No lessons match “{search.trim()}”.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                            {!pickerLoading && !pickerError && enrolled.length > 0 && visibleCourses.length === 0 && (
                                <p className="py-4 text-sm text-muted-foreground">
                                    No courses match “{search.trim()}”. Expand a course first to search its lessons.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </ProtectedLayout>
    )
}
