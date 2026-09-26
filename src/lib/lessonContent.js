import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import DOMPurify from 'dompurify'

/** Markdown -> plain HTML (used to open seeded markdown lessons in the rich editor). */
export function markdownToHtml(markdown) {
    if (!markdown?.trim()) return ''
    return renderToStaticMarkup(createElement(ReactMarkdown, null, markdown))
}

/**
 * Instructor-authored HTML is rendered to every student, so strip anything
 * beyond formatting (scripts, event handlers, iframes, ...). Inline style
 * is kept for font size / colour / alignment from the editor.
 */
export function sanitizeLessonHtml(html) {
    return DOMPurify.sanitize(html ?? '', {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select'],
        ADD_ATTR: ['target']
    })
}

/** Any lesson row -> sanitized HTML, whatever its content_format. */
export function lessonContentToHtml(lesson) {
    const html = lesson?.content_format === 'html' ? lesson.content : markdownToHtml(lesson?.content ?? '')
    return sanitizeLessonHtml(html)
}

/** Plain text of an HTML lesson (for AI context / previews). */
export function htmlToText(html) {
    const doc = new DOMParser().parseFromString(sanitizeLessonHtml(html), 'text/html')
    return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim()
}
