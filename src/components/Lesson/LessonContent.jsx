import ReactMarkdown from 'react-markdown'
import { sanitizeLessonHtml } from '@/lib/lessonContent'
import '@/styles/lesson-prose.css'

// Markdown → styled elements matching the app's look
const mdComponents = {
    h1: ({ children }) => <h1 className='text-2xl font-extrabold tracking-tight mt-2 mb-3 text-[#1F2225] dark:text-[#F2F5F0]'>{children}</h1>,
    h2: ({ children }) => <h2 className='text-xl font-extrabold tracking-tight mt-7 mb-3 text-[#1F2225] dark:text-[#F2F5F0]'>{children}</h2>,
    h3: ({ children }) => <h3 className='text-base font-bold mt-6 mb-2 text-[#1F2225] dark:text-[#F2F5F0]'>{children}</h3>,
    p: ({ children }) => <p className='text-[15px] leading-relaxed text-[#2A2E2B] dark:text-[#D4DDD2] my-3'>{children}</p>,
    ul: ({ children }) => <ul className='my-3 ml-1 flex flex-col gap-1.5'>{children}</ul>,
    ol: ({ children }) => <ol className='my-3 ml-5 list-decimal flex flex-col gap-1.5 text-[15px] text-[#2A2E2B] dark:text-[#D4DDD2]'>{children}</ol>,
    li: ({ children }) => (
        <li className='text-[15px] leading-relaxed text-[#2A2E2B] dark:text-[#D4DDD2] flex gap-2'>
            <span className='text-[#A9D8AE] font-bold shrink-0'>•</span>
            <span>{children}</span>
        </li>
    ),
    blockquote: ({ children }) => (
        <blockquote className='my-4 border-l-4 border-[#A9D8AE] bg-[#EFF7EE] dark:bg-[#16241A] rounded-r-xl px-4 py-3 text-[15px] leading-relaxed text-[#1F2225] dark:text-[#F2F5F0]'>{children}</blockquote>
    ),
    code: ({ children }) => <code className='bg-[#EFF3EE] dark:bg-[#1B211C] text-[#1F2225] dark:text-[#F2F5F0] px-1.5 py-0.5 rounded-md text-[13px] font-mono'>{children}</code>,
    pre: ({ children }) => <pre className='bg-[#1F2225] text-[#E8F0E6] rounded-xl p-4 my-4 overflow-x-auto text-[13px] leading-relaxed'>{children}</pre>,
    table: ({ children }) => (
        <div className='my-4 overflow-x-auto rounded-xl border border-[#C9DDC4] dark:border-[#262E28]'>
            <table className='w-full text-sm text-[#1F2225] dark:text-[#F2F5F0]'>{children}</table>
        </div>
    ),
    thead: ({ children }) => <thead className='bg-[#EFF7EE] dark:bg-[#1B211C]'>{children}</thead>,
    th: ({ children }) => <th className='text-left font-bold px-4 py-2.5 text-[13px]'>{children}</th>,
    td: ({ children }) => <td className='px-4 py-2.5 text-[14px] border-t border-[#E4ECE2] dark:border-[#262E28]'>{children}</td>,
    a: ({ href, children }) => (
        <a href={href} target='_blank' rel='noreferrer' className='text-[#3E7A42] dark:text-[#8FE0A0] font-medium underline underline-offset-2'>{children}</a>
    ),
    strong: ({ children }) => <strong className='font-bold text-[#1F2225] dark:text-[#F2F5F0]'>{children}</strong>,
    hr: () => <hr className='my-6 border-[#C9DDC4] dark:border-[#262E28]' />
}

/**
 * A lesson body exactly as students see it: seeded markdown lessons via
 * ReactMarkdown, instructor-written lessons as sanitized rich text.
 * Shared by the student lesson page and the instructor preview.
 */
export default function LessonContent({ lesson }) {
    if (!lesson?.content) {
        return <p className='text-sm text-[#6A6F73] dark:text-[#8FA893]'>Content for this lesson is coming soon.</p>
    }
    if (lesson.content_format === 'html') {
        return <div className='lesson-prose' dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(lesson.content) }} />
    }
    return <ReactMarkdown components={mdComponents}>{lesson.content}</ReactMarkdown>
}
