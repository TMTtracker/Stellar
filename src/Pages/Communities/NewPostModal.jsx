import { useEffect, useRef, useState } from 'react'
import { X, ImagePlus, Trash2 } from 'lucide-react'

const TAG_OPTIONS = ['Study Help', 'Milestone', 'Event', 'Questions']

function useEscapeToClose(onClose) {
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])
}

export default function NewPostModal({ authorName, authorLevel, onClose, onSubmit, autoOpenImagePicker = false }) {
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [tag, setTag] = useState(TAG_OPTIONS[0])
    const [closing, setClosing] = useState(false)
    const [entered, setEntered] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState('')
    const fileInputRef = useRef(null)

    useEscapeToClose(requestClose)

    useEffect(() => {
        const raf = requestAnimationFrame(() => setEntered(true))
        return () => cancelAnimationFrame(raf)
    }, [])

    useEffect(() => {
        if (autoOpenImagePicker && fileInputRef.current) {
            const t = setTimeout(() => fileInputRef.current?.click(), 320)
            return () => clearTimeout(t)
        }
    }, [autoOpenImagePicker])

    function handleImageChange(e) {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file.')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be under 5MB.')
            return
        }
        setError('')
        setImageFile(file)
        const url = URL.createObjectURL(file)
        setImagePreview(url)
    }

    function removeImage() {
        if (imagePreview) URL.revokeObjectURL(imagePreview)
        setImageFile(null)
        setImagePreview('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    function requestClose() {
        setClosing(true)
        setTimeout(onClose, 180)
    }

    const visible = entered && !closing
    const canPost = title.trim().length > 0 && body.trim().length > 0
    const initials = authorName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

    async function handlePost() {
        if (!canPost || submitting) return
        setSubmitting(true)
        setError('')
        try {
            await onSubmit({ title: title.trim(), body: body.trim(), tag, imageFile })
        } catch (e) {
            setError(e.message || 'Something went wrong. Please try again.')
            setSubmitting(false)
        }
    }

    return (
        <div
            className='fixed inset-0 z-50 flex items-center justify-center p-4'
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) requestClose()
            }}
        >
            <div
                className={`absolute inset-0 bg-[#0E1410]/50 backdrop-blur-sm transition-opacity duration-200 ${
                    visible ? 'opacity-100' : 'opacity-0'
                }`}
            />

            <div
                className={`relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl transition-all duration-200 ${
                    visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
                }`}
            >
                <button
                    onClick={requestClose}
                    aria-label='Close'
                    className='absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-[#6A6F73] hover:bg-[#F3F7F1] hover:text-[#1F2225] transition-colors'
                >
                    <X size={18} />
                </button>

                {/* Author header */}
                <div className='flex items-center gap-3 mb-5'>
                    <div className='w-10 h-10 rounded-full bg-[#A9D8AE] text-white flex items-center justify-center font-bold text-sm'>
                        {initials}
                    </div>
                    <div>
                        <p className='text-sm font-bold'>{authorName}</p>
                        <p className='text-xs text-[#6A6F73]'>Level {authorLevel}</p>
                    </div>
                </div>

                {/* Title */}
                <input
                    type='text'
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder='Give your post a title...'
                    className='w-full text-lg font-bold text-[#1F2225] placeholder:font-bold placeholder:text-[#B4BEB6] border border-[#C9DDC4] rounded-xl px-4 py-3 mb-3 outline-none focus:border-[#A9D8AE] transition-colors'
                />

                {/* Body */}
                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder='Share more details...'
                    rows={6}
                    className='w-full text-sm text-[#1F2225] border border-[#C9DDC4] rounded-xl px-4 py-3 mb-4 outline-none resize-none focus:border-[#A9D8AE] transition-colors'
                />

                {/* Tags - single select */}
                <div className='flex flex-wrap gap-2 mb-4'>
                    {TAG_OPTIONS.map((option) => {
                        const isActive = tag === option
                        return (
                            <button
                                key={option}
                                type='button'
                                onClick={() => setTag(option)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                                    isActive
                                        ? 'bg-[#DDF0E1] border-[#A9D8AE] text-[#A9D8AE]'
                                        : 'bg-white border-[#C9DDC4] text-[#6A6F73] hover:border-[#B7CDB1]'
                                }`}
                            >
                                {option}
                            </button>
                        )
                    })}
                </div>

                {/* Pic add */}
                <div className='mb-4'>
                    <input
                        ref={fileInputRef}
                        type='file'
                        accept='image/*'
                        onChange={handleImageChange}
                        className='hidden'
                    />
                    {!imagePreview ? (
                        <button
                            type='button'
                            onClick={() => fileInputRef.current?.click()}
                            className='flex items-center gap-2 text-sm font-medium text-[#6A6F73] border border-[#C9DDC4] rounded-xl px-3 py-2 hover:border-[#A9D8AE] hover:text-[#1F2225] transition-colors'
                        >
                            <ImagePlus size={16} className='text-[#A9D8AE]' />
                            Add picture
                        </button>
                    ) : (
                        <div className='relative rounded-xl overflow-hidden border border-[#C9DDC4]'>
                            <img src={imagePreview} alt='Selected preview' className='w-full max-h-52 object-cover' />
                            <button
                                type='button'
                                onClick={removeImage}
                                className='absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors'
                                aria-label='Remove image'
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}
                    <p className='text-[11px] text-[#8BA089] mt-1.5'>PNG, JPG up to 5MB — optional</p>
                </div>

                {error && (
                    <p className='text-xs text-red-500 font-medium mb-3'>{error}</p>
                )}

                <button
                    onClick={handlePost}
                    disabled={!canPost || submitting}
                    className='w-full bg-[#A9D8AE] disabled:bg-[#CFE7D2] disabled:cursor-not-allowed text-white font-bold rounded-full py-3 hover:bg-[#98CD9E] transition-colors'
                >
                    {submitting ? 'Posting...' : 'Post'}
                </button>
            </div>
        </div>
    )
}
