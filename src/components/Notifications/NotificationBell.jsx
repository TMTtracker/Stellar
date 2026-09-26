import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, MessageCircle, Gift, Check } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { formatRelativeTime } from '@/lib/utils'

const KIND_ICON = {
    post_comment: MessageCircle,
    lesson_reward: Gift
}

/**
 * Shared notification bell + dropdown, used on both Dashboard and
 * ProtectedLayout so it's reachable from every page. Clicking a
 * notification marks it read and navigates to whatever it's about (the
 * post that got a new comment, or the lesson that paid out a reward).
 */
export default function NotificationBell({ buttonClassName }) {
    const navigate = useNavigate()
    const { items, unreadCount, markRead, markAllRead } = useNotifications()
    const [open, setOpen] = useState(false)

    function handleOpenNotification(n) {
        setOpen(false)
        if (!n.read) markRead(n.id)
        if (n.link) navigate(n.link)
    }

    return (
        <div className='relative'>
            <button
                aria-label='Notifications'
                aria-expanded={open}
                onClick={() => setOpen(o => !o)}
                className={buttonClassName ?? "relative w-9 h-9 bg-white/95 dark:bg-[#14171A]/95 border border-[#C9DDC4] dark:border-[#262E28] rounded-xl flex items-center justify-center text-[#6A6F73] dark:text-[#8FA893] hover:border-[#A9D8AE] hover:text-[#A9D8AE] transition-colors"}
            >
                <Bell size={16} />
                {unreadCount > 0 && (
                    <span className='absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-[#D9605B] text-white text-[10px] font-bold rounded-full flex items-center justify-center'>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <>
                    <div className='fixed inset-0 z-10' onClick={() => setOpen(false)} />
                    <div className='absolute right-0 top-11 z-20 w-80 max-h-[420px] flex flex-col rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] bg-white dark:bg-[#14171A] shadow-xl overflow-hidden'>
                        <div className='flex items-center justify-between px-4 py-3 border-b border-[#EEF6ED] dark:border-[#1B211C] shrink-0'>
                            <p className='text-sm font-bold text-[#1F2225] dark:text-[#F2F5F0]'>Notifications</p>
                            {unreadCount > 0 && (
                                <button onClick={markAllRead} className='flex items-center gap-1 text-[11px] font-semibold text-[#3E7A42] dark:text-[#8FE0A0] hover:underline'>
                                    <Check size={12} /> Mark all read
                                </button>
                            )}
                        </div>
                        <div className='flex-1 min-h-0 overflow-y-auto'>
                            {items.length === 0 && (
                                <p className='text-xs text-[#6A6F73] dark:text-[#8FA893] text-center py-8 px-4'>You're all caught up — nothing here yet.</p>
                            )}
                            {items.map(n => {
                                const Icon = KIND_ICON[n.kind] ?? Bell
                                return (
                                    <button
                                        key={n.id}
                                        onClick={() => handleOpenNotification(n)}
                                        className={`w-full flex items-start gap-3 text-left px-4 py-3 border-b border-[#EEF6ED] dark:border-[#1B211C] last:border-b-0 hover:bg-[#F5FAF3] dark:hover:bg-[#1A1F1B] transition-colors ${!n.read ? 'bg-[#EFF7EE] dark:bg-[#16241A]' : ''}`}
                                    >
                                        <span className='w-8 h-8 rounded-lg bg-[#EFF3EE] dark:bg-[#1B211C] text-[#3E7A42] dark:text-[#8FE0A0] flex items-center justify-center shrink-0'>
                                            <Icon size={15} />
                                        </span>
                                        <span className='flex-1 min-w-0'>
                                            <span className='flex items-center gap-1.5'>
                                                <span className={`text-[13px] leading-snug ${!n.read ? 'font-bold text-[#1F2225] dark:text-[#F2F5F0]' : 'font-medium text-[#1F2225] dark:text-[#F2F5F0]'}`}>{n.title}</span>
                                                {!n.read && <span className='w-1.5 h-1.5 rounded-full bg-[#D9605B] shrink-0' />}
                                            </span>
                                            <span className='block text-xs text-[#6A6F73] dark:text-[#8FA893] mt-0.5 line-clamp-2'>{n.body}</span>
                                            <span className='block text-[10px] text-[#8BA089] mt-1'>{formatRelativeTime(n.created_at)}</span>
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
