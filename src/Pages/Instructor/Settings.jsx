import { useEffect, useState } from 'react'
import { Check, User as UserIcon, Lock, Moon, Sun, BookCheck, FileClock } from 'lucide-react'
import InstructorLayout from '@/components/Instructor/InstructorLayout'
import { useAuth } from '@/hooks/useAuth'
import { useDarkMode } from '@/hooks/useDarkMode'
import { listMyPublishLog } from '@/services/instructor'

const inputClass =
    'w-full rounded-xl border border-[#C9DDC4] dark:border-[#262E28] bg-white dark:bg-[#0E1210] px-4 py-2.5 text-sm text-[#1F2225] dark:text-[#F2F5F0] outline-none focus:border-[#A9D8AE] focus:ring-4 focus:ring-[#A9D8AE]/20 placeholder:text-[#9AA39C] dark:placeholder:text-[#5C6A5F]'
const labelClass = 'block text-[11px] font-bold tracking-wider text-[#6A6F73] dark:text-[#8FA893] mb-1.5'

function formatWhen(iso) {
    try {
        return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    } catch {
        return iso
    }
}

export default function InstructorSettings() {
    const { user, updateProfile } = useAuth()
    const { dark, toggle: toggleDarkMode } = useDarkMode()

    const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || '')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState(null)

    const [log, setLog] = useState([])
    const [logLoading, setLogLoading] = useState(true)
    const [logError, setLogError] = useState('')

    useEffect(() => {
        let cancelled = false
        listMyPublishLog()
            .then(rows => { if (!cancelled) setLog(rows) })
            .catch(e => { if (!cancelled) setLogError(e.message ?? 'Failed to load activity log') })
            .finally(() => { if (!cancelled) setLogLoading(false) })
        return () => { cancelled = true }
    }, [])

    async function handleSaveProfile(e) {
        e.preventDefault()
        setMessage(null)

        const trimmed = displayName.trim()
        if (!trimmed) {
            setMessage({ type: 'error', text: 'Display name cannot be empty.' })
            return
        }
        if (newPassword || confirmPassword) {
            if (newPassword.length < 6) {
                setMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
                return
            }
            if (newPassword !== confirmPassword) {
                setMessage({ type: 'error', text: 'Passwords do not match.' })
                return
            }
        }

        setSaving(true)
        try {
            await updateProfile({ displayName: trimmed, password: newPassword || undefined })
            setNewPassword('')
            setConfirmPassword('')
            setMessage({ type: 'success', text: 'Profile updated.' })
        } catch (err) {
            setMessage({ type: 'error', text: err.message ?? 'Update failed.' })
        } finally {
            setSaving(false)
        }
    }

    return (
        <InstructorLayout subtitle='Settings'>
            <div className='flex flex-col gap-5 max-w-[880px]'>
                <div>
                    <h1 className='text-2xl font-extrabold tracking-tight'>Settings</h1>
                    <p className='text-sm text-[#6A6F73] dark:text-[#8FA893] mt-1'>Manage your instructor account and see your publishing activity.</p>
                </div>

                {/* Appearance */}
                <section className='bg-white dark:bg-[#14171A] rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] p-6'>
                    <h2 className='text-lg font-bold mb-4'>Appearance</h2>
                    <button
                        onClick={toggleDarkMode}
                        aria-pressed={dark}
                        className='flex w-full max-w-xs items-center gap-3 rounded-xl border border-[#C9DDC4] dark:border-[#262E28] px-4 py-3 text-left text-sm font-semibold hover:border-[#A9D8AE]'
                    >
                        {dark ? <Moon size={16} /> : <Sun size={16} />}
                        Night mode
                        <span className={`ml-auto flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${dark ? 'bg-[#A9D8AE]' : 'bg-[#E4EBE2]'}`}>
                            <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${dark ? 'translate-x-4' : 'translate-x-0'}`} />
                        </span>
                    </button>
                </section>

                {/* Profile */}
                <section className='bg-white dark:bg-[#14171A] rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] p-6'>
                    <h2 className='text-lg font-bold mb-4'>Profile</h2>
                    <form onSubmit={handleSaveProfile} className='flex flex-col gap-4 max-w-sm'>
                        <div>
                            <label className={labelClass} htmlFor='ins-name'><UserIcon size={11} className='inline mb-0.5' /> Display name</label>
                            <input id='ins-name' className={inputClass} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder='Your name' />
                        </div>
                        <div>
                            <label className={labelClass}>Email</label>
                            <input className={inputClass} value={user?.email || ''} disabled />
                        </div>
                        <div>
                            <label className={labelClass} htmlFor='ins-pw'><Lock size={11} className='inline mb-0.5' /> New password</label>
                            <input id='ins-pw' type='password' className={inputClass} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder='Leave blank to keep current' />
                        </div>
                        <div>
                            <label className={labelClass} htmlFor='ins-pw2'>Confirm new password</label>
                            <input id='ins-pw2' type='password' className={inputClass} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder='Confirm new password' />
                        </div>

                        {message && (
                            <p className={`text-sm ${message.type === 'error' ? 'text-[#C4634F]' : 'text-[#3E7A42] dark:text-[#8FE0A0]'}`}>{message.text}</p>
                        )}

                        <button
                            type='submit'
                            disabled={saving}
                            className='self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#A9D8AE] text-white hover:bg-[#96CC9C] disabled:opacity-60'
                        >
                            <Check size={15} /> {saving ? 'Saving…' : 'Save changes'}
                        </button>
                    </form>
                </section>

                {/* Activity log */}
                <section className='bg-white dark:bg-[#14171A] rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] p-6'>
                    <h2 className='text-lg font-bold mb-4 flex items-center gap-2'><FileClock size={18} /> Publishing activity</h2>
                    {logLoading && <p className='text-sm text-[#6A6F73] dark:text-[#8FA893]'>Loading…</p>}
                    {!logLoading && logError && <p className='text-sm text-[#C4634F]'>{logError}</p>}
                    {!logLoading && !logError && log.length === 0 && (
                        <p className='text-sm text-[#6A6F73] dark:text-[#8FA893]'>No activity yet — publishing or drafting a course will show up here.</p>
                    )}
                    {!logLoading && !logError && log.length > 0 && (
                        <ul className='flex flex-col gap-2'>
                            {log.map(entry => (
                                <li key={entry.id} className='flex items-center justify-between gap-3 rounded-xl bg-[#EFF3EE] dark:bg-[#1B211C] px-4 py-3'>
                                    <div className='flex items-center gap-3 min-w-0'>
                                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${entry.action === 'published' ? 'bg-[#E1F0DF] text-[#3E7A42] dark:bg-[#1B2B1D] dark:text-[#8FE0A0]' : 'bg-[#F5E9D3] text-[#A07A2E] dark:bg-[#2A2417] dark:text-[#E3BE72]'}`}>
                                            <BookCheck size={15} />
                                        </span>
                                        <div className='min-w-0'>
                                            <p className='text-sm font-medium truncate'>{entry.course_title}</p>
                                            <p className='text-[11px] text-[#6A6F73] dark:text-[#8FA893]'>
                                                {entry.action === 'published' ? 'Published' : 'Set to draft'} · {formatWhen(entry.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </InstructorLayout>
    )
}
