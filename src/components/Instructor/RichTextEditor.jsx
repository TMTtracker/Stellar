import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { Color, FontSize, TextStyle } from '@tiptap/extension-text-style'
import { Placeholder } from '@tiptap/extensions'
import {
    AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Code2, Highlighter, Italic,
    Link as LinkIcon, List, ListOrdered, Minus, Quote, Redo2, RemoveFormatting, Strikethrough,
    Underline as UnderlineIcon, Undo2, Unlink
} from 'lucide-react'
import '@/styles/lesson-prose.css'

const FONT_SIZES = ['12px', '14px', '15px', '16px', '18px', '20px', '24px', '28px', '32px']
const TEXT_COLORS = [
    { label: 'Default', value: '' },
    { label: 'Green', value: '#3E7A42' },
    { label: 'Blue', value: '#2F6FA8' },
    { label: 'Orange', value: '#C4722E' },
    { label: 'Red', value: '#C4453A' },
    { label: 'Purple', value: '#7A4FA8' },
    { label: 'Grey', value: '#6A6F73' }
]

const extensions = [
    StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' }
    }),
    TextStyle,
    FontSize,
    Color,
    Highlight,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Placeholder.configure({ placeholder: 'Write your lecture here. Use headings, lists and bold text to structure it for students…' })
]

function ToolButton({ onClick, active, disabled, label, children }) {
    return (
        <button
            type='button'
            onMouseDown={e => e.preventDefault()} // keep the editor selection
            onClick={onClick}
            disabled={disabled}
            title={label}
            aria-label={label}
            aria-pressed={active}
            className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center transition-colors disabled:opacity-35 ${
                active
                    ? 'bg-[#141814] text-white dark:bg-[#A9D8AE] dark:text-[#0B0D0C]'
                    : 'text-[#4A4F52] dark:text-[#B5C4B8] hover:bg-[#E4F0E1] dark:hover:bg-[#1E2B20]'
            }`}
        >
            {children}
        </button>
    )
}

function Divider() {
    return <span className='w-px h-5 bg-[#D5E3D1] dark:bg-[#262E28] mx-1 shrink-0' />
}

const selectClass =
    'h-8 rounded-lg border border-[#D5E3D1] dark:border-[#262E28] bg-white dark:bg-[#14171A] px-2 text-[13px] text-[#1F2225] dark:text-[#F2F5F0] outline-none focus:border-[#A9D8AE]'

/**
 * Word-processor style lecture editor. Emits sanitized-on-render HTML via
 * onChange. Remount (change `key`) to load a different document.
 */
export default function RichTextEditor({ value, onChange }) {
    const onChangeRef = useRef(onChange)
    useEffect(() => {
        onChangeRef.current = onChange
    }, [onChange])

    const editor = useEditor({
        extensions,
        content: value || '',
        editorProps: {
            attributes: { class: 'lesson-prose px-8 py-7' }
        },
        onUpdate: ({ editor: e }) => onChangeRef.current?.(e.isEmpty ? '' : e.getHTML())
    })

    const state = useEditorState({
        editor,
        selector: ({ editor: e }) => {
            if (!e) return null
            const block = e.isActive('heading', { level: 1 }) ? 'h1'
                : e.isActive('heading', { level: 2 }) ? 'h2'
                : e.isActive('heading', { level: 3 }) ? 'h3'
                : 'p'
            const align = ['center', 'right', 'justify'].find(a => e.isActive({ textAlign: a })) ?? 'left'
            return {
                block,
                align,
                fontSize: e.getAttributes('textStyle').fontSize ?? '',
                color: e.getAttributes('textStyle').color ?? '',
                bold: e.isActive('bold'),
                italic: e.isActive('italic'),
                underline: e.isActive('underline'),
                strike: e.isActive('strike'),
                highlight: e.isActive('highlight'),
                bulletList: e.isActive('bulletList'),
                orderedList: e.isActive('orderedList'),
                blockquote: e.isActive('blockquote'),
                codeBlock: e.isActive('codeBlock'),
                link: e.isActive('link'),
                canUndo: e.can().undo(),
                canRedo: e.can().redo(),
                words: e.getText().trim().split(/\s+/).filter(Boolean).length
            }
        }
    })

    const [linkOpen, setLinkOpen] = useState(false)
    const [linkUrl, setLinkUrl] = useState('')

    if (!editor || !state) return null

    const chain = () => editor.chain().focus()

    function setBlock(block) {
        if (block === 'p') chain().setParagraph().run()
        else chain().setHeading({ level: Number(block[1]) }).run()
    }

    function openLink() {
        setLinkUrl(editor.getAttributes('link').href ?? '')
        setLinkOpen(true)
    }

    function applyLink(e) {
        e.preventDefault()
        const url = linkUrl.trim()
        if (!url) chain().extendMarkRange('link').unsetLink().run()
        else chain().extendMarkRange('link').setLink({ href: /^[a-z]+:/i.test(url) ? url : `https://${url}` }).run()
        setLinkOpen(false)
    }

    return (
        <div className='rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] bg-white dark:bg-[#14171A]'>
            {/* Toolbar (no overflow-hidden on the card, or sticky + the link popover break) */}
            <div className='sticky top-0 z-10 rounded-t-2xl flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-[#E4ECE2] dark:border-[#262E28] bg-[#FAFCF9] dark:bg-[#111412]'>
                <ToolButton label='Undo (Ctrl+Z)' onClick={() => chain().undo().run()} disabled={!state.canUndo}><Undo2 size={16} /></ToolButton>
                <ToolButton label='Redo (Ctrl+Shift+Z)' onClick={() => chain().redo().run()} disabled={!state.canRedo}><Redo2 size={16} /></ToolButton>
                <Divider />

                <select aria-label='Text style' value={state.block} onChange={e => setBlock(e.target.value)} className={`${selectClass} w-[118px]`}>
                    <option value='p'>Paragraph</option>
                    <option value='h1'>Heading 1</option>
                    <option value='h2'>Heading 2</option>
                    <option value='h3'>Heading 3</option>
                </select>
                <select
                    aria-label='Font size'
                    value={state.fontSize}
                    onChange={e => (e.target.value ? chain().setFontSize(e.target.value).run() : chain().unsetFontSize().run())}
                    className={`${selectClass} w-[84px] ml-1`}
                >
                    <option value=''>Size</option>
                    {FONT_SIZES.map(s => <option key={s} value={s}>{parseInt(s, 10)}</option>)}
                </select>
                <Divider />

                <ToolButton label='Bold (Ctrl+B)' active={state.bold} onClick={() => chain().toggleBold().run()}><Bold size={16} /></ToolButton>
                <ToolButton label='Italic (Ctrl+I)' active={state.italic} onClick={() => chain().toggleItalic().run()}><Italic size={16} /></ToolButton>
                <ToolButton label='Underline (Ctrl+U)' active={state.underline} onClick={() => chain().toggleUnderline().run()}><UnderlineIcon size={16} /></ToolButton>
                <ToolButton label='Strikethrough' active={state.strike} onClick={() => chain().toggleStrike().run()}><Strikethrough size={16} /></ToolButton>
                <ToolButton label='Highlight' active={state.highlight} onClick={() => chain().toggleHighlight().run()}><Highlighter size={16} /></ToolButton>
                <label className='relative w-8 h-8 shrink-0 rounded-lg flex items-center justify-center hover:bg-[#E4F0E1] dark:hover:bg-[#1E2B20] cursor-pointer' title='Text colour'>
                    <span className='text-[15px] font-bold leading-none text-[#4A4F52] dark:text-[#B5C4B8]' style={{ borderBottom: `3px solid ${state.color || '#1F2225'}` }}>A</span>
                    <select
                        aria-label='Text colour'
                        value={state.color}
                        onChange={e => (e.target.value ? chain().setColor(e.target.value).run() : chain().unsetColor().run())}
                        className='absolute inset-0 opacity-0 cursor-pointer'
                    >
                        {TEXT_COLORS.map(c => <option key={c.label} value={c.value}>{c.label}</option>)}
                    </select>
                </label>
                <Divider />

                <ToolButton label='Align left' active={state.align === 'left'} onClick={() => chain().setTextAlign('left').run()}><AlignLeft size={16} /></ToolButton>
                <ToolButton label='Align centre' active={state.align === 'center'} onClick={() => chain().setTextAlign('center').run()}><AlignCenter size={16} /></ToolButton>
                <ToolButton label='Align right' active={state.align === 'right'} onClick={() => chain().setTextAlign('right').run()}><AlignRight size={16} /></ToolButton>
                <ToolButton label='Justify' active={state.align === 'justify'} onClick={() => chain().setTextAlign('justify').run()}><AlignJustify size={16} /></ToolButton>
                <Divider />

                <ToolButton label='Bulleted list' active={state.bulletList} onClick={() => chain().toggleBulletList().run()}><List size={16} /></ToolButton>
                <ToolButton label='Numbered list' active={state.orderedList} onClick={() => chain().toggleOrderedList().run()}><ListOrdered size={16} /></ToolButton>
                <ToolButton label='Quote / key takeaway' active={state.blockquote} onClick={() => chain().toggleBlockquote().run()}><Quote size={16} /></ToolButton>
                <ToolButton label='Code block' active={state.codeBlock} onClick={() => chain().toggleCodeBlock().run()}><Code2 size={16} /></ToolButton>
                <ToolButton label='Divider line' onClick={() => chain().setHorizontalRule().run()}><Minus size={16} /></ToolButton>
                <Divider />

                <div className='relative'>
                    <ToolButton label='Link' active={state.link || linkOpen} onClick={() => (linkOpen ? setLinkOpen(false) : openLink())}><LinkIcon size={16} /></ToolButton>
                    {linkOpen && (
                        <form onSubmit={applyLink} className='absolute left-0 top-10 z-20 flex items-center gap-1.5 p-2 rounded-xl border border-[#C9DDC4] dark:border-[#262E28] bg-white dark:bg-[#14171A] shadow-lg'>
                            <input
                                autoFocus
                                value={linkUrl}
                                onChange={e => setLinkUrl(e.target.value)}
                                onKeyDown={e => e.key === 'Escape' && setLinkOpen(false)}
                                placeholder='https://…'
                                className='w-56 h-8 px-2.5 rounded-lg border border-[#D5E3D1] dark:border-[#262E28] bg-transparent text-[13px] outline-none focus:border-[#A9D8AE] dark:text-[#F2F5F0]'
                            />
                            <button type='submit' className='h-8 px-3 rounded-lg bg-[#141814] text-white text-xs font-medium'>Apply</button>
                        </form>
                    )}
                </div>
                {state.link && (
                    <ToolButton label='Remove link' onClick={() => chain().extendMarkRange('link').unsetLink().run()}><Unlink size={16} /></ToolButton>
                )}
                <ToolButton label='Clear formatting' onClick={() => chain().unsetAllMarks().clearNodes().run()}><RemoveFormatting size={16} /></ToolButton>
            </div>

            <EditorContent editor={editor} className='text-[#1F2225] dark:text-[#F2F5F0]' />

            <div className='flex justify-end px-4 py-2 border-t border-[#E4ECE2] dark:border-[#262E28] text-[11px] text-[#6A6F73] dark:text-[#8FA893]'>
                {state.words.toLocaleString()} word{state.words === 1 ? '' : 's'} · ~{Math.max(1, Math.round(state.words / 200))} min read
            </div>
        </div>
    )
}
