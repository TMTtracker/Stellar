import { useEffect, useState } from 'react'
import { Check, LockKeyhole, Mail, UserRound, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useWallet } from '@/hooks/useWallet'
import { useInventory } from '@/hooks/useInventory'
import { getMyRecentRewards } from '@/services/wallet'

function Profile({ modal = false, onClose }) {
    const { user, updateProfile } = useAuth()
    const { xp, coins, level, pct, loading: walletLoading } = useWallet()
    const { inventory, total: materialTotal, loading: invLoading } = useInventory()
    const [rewards, setRewards] = useState([])
    const [displayName, setDisplayName] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [status, setStatus] = useState({ type: '', message: '' })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        setDisplayName(user?.user_metadata?.full_name || '')
    }, [user])

    async function handleSubmit(event) {
        event.preventDefault()
        setStatus({ type: '', message: '' })

        if (!displayName.trim()) {
            setStatus({ type: 'error', message: 'Display name cannot be empty.' })
            return
        }
        if (password && password.length < 6) {
            setStatus({ type: 'error', message: 'Password must be at least 6 characters.' })
            return
        }
        if (password !== confirmPassword) {
            setStatus({ type: 'error', message: 'Passwords do not match.' })
            return
        }

        setSaving(true)
        try {
            await updateProfile({ displayName, password })
            setPassword('')
            setConfirmPassword('')
            setStatus({ type: 'success', message: 'Profile updated successfully.' })
        } catch (error) {
            setStatus({ type: 'error', message: error.message || 'Could not update your profile.' })
        } finally {
            setSaving(false)
        }
    }

    useEffect(() => {
        if (!user) return
        let cancelled = false
        getMyRecentRewards(10).then(rows => {
            if (!cancelled) setRewards(rows ?? [])
        }).catch(() => {})
        return () => { cancelled = true }
    }, [user])

    return (
        <div id='profile' className={`${modal ? 'p-5 sm:p-6' : 'min-h-screen scroll-mt-27.5 p-6'} max-w-3xl mx-auto`}>
            <div className='flex items-start justify-between'>
                <div>
                    <p className='text-[11px] font-bold tracking-wider text-[#A9D8AE]'>PROFILE</p>
                    <h1 className='text-3xl font-extrabold tracking-tight mt-1'>
                        {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Stellar Cadet'}
                    </h1>
                    <p className='text-sm text-[#6A6F73] mt-1'>{user?.email}</p>
                </div>
                {modal && (
                    <button onClick={onClose} aria-label='Close profile' className='text-[#6A6F73] hover:text-[#1F2225]'>
                        <X size={18} />
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className='mt-6 rounded-2xl border border-[#C9DDC4] bg-white p-6'>
                <h2 className='mb-5 text-lg font-bold'>Profile settings</h2>
                <div className='space-y-5'>
                    <label className='block'>
                        <span className='mb-2 flex items-center gap-2 text-sm font-bold'><UserRound size={16} /> Display name</span>
                        <input value={displayName} onChange={event => setDisplayName(event.target.value)} maxLength={60} className='w-full rounded-xl border border-[#C9DDC4] px-4 py-3 outline-none focus:border-[#72A96D] focus:ring-2 focus:ring-[#DCEFD6]' />
                    </label>
                    <label className='block'>
                        <span className='mb-2 flex items-center gap-2 text-sm font-bold'><Mail size={16} /> Email address</span>
                        <input value={user?.email || ''} disabled className='w-full cursor-not-allowed rounded-xl border border-[#E3E8E1] bg-[#F3F5F2] px-4 py-3 text-[#8B928C]' />
                        <span className='mt-2 block text-xs text-[#8B928C]'>Your email address cannot be changed here.</span>
                    </label>
                    <div className='border-t border-[#E8EEE5] pt-5'>
                        <p className='mb-3 flex items-center gap-2 text-sm font-bold'><LockKeyhole size={16} /> Change password</p>
                        <div className='grid gap-3 sm:grid-cols-2'>
                            <input type='password' value={password} onChange={event => setPassword(event.target.value)} placeholder='New password' autoComplete='new-password' className='rounded-xl border border-[#C9DDC4] px-4 py-3 outline-none focus:border-[#72A96D] focus:ring-2 focus:ring-[#DCEFD6]' />
                            <input type='password' value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder='Confirm new password' autoComplete='new-password' className='rounded-xl border border-[#C9DDC4] px-4 py-3 outline-none focus:border-[#72A96D] focus:ring-2 focus:ring-[#DCEFD6]' />
                        </div>
                        <p className='mt-2 text-xs text-[#8B928C]'>Leave both fields blank to keep your current password.</p>
                    </div>
                </div>
                {status.message && <p className={`mt-5 rounded-xl px-4 py-3 text-sm font-semibold ${status.type === 'success' ? 'bg-[#E7F5E4] text-[#3E7E45]' : 'bg-[#FDEAE8] text-[#B44540]'}`}>{status.message}</p>}
                <div className='mt-5 flex justify-end'>
                    <button type='submit' disabled={saving} className='flex items-center gap-2 rounded-xl bg-[#72A96D] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60'>
                        <Check size={16} /> {saving ? 'Saving...' : 'Save changes'}
                    </button>
                </div>
            </form>

            <div className='grid grid-cols-3 gap-4 mt-6'>
                <div className='bg-white border border-[#C9DDC4] rounded-2xl p-4'>
                    <p className='text-xs text-[#6A6F73]'>Level</p>
                    <p className='text-2xl font-bold'>{walletLoading ? '…' : level}</p>
                    <p className='text-xs text-[#6A6F73] mt-1'>{walletLoading ? '' : `${pct}% to next`}</p>
                </div>
                <div className='bg-white border border-[#C9DDC4] rounded-2xl p-4'>
                    <p className='text-xs text-[#6A6F73]'>XP</p>
                    <p className='text-2xl font-bold'>{walletLoading ? '…' : xp.toLocaleString()}</p>
                </div>
                <div className='bg-white border border-[#C9DDC4] rounded-2xl p-4'>
                    <p className='text-xs text-[#6A6F73]'>Coins</p>
                    <p className='text-2xl font-bold'>{walletLoading ? '…' : coins.toLocaleString()}</p>
                </div>
            </div>

            <h2 className='font-bold mt-8 mb-3'>Materials ({invLoading ? '…' : materialTotal})</h2>
            <div className='grid grid-cols-4 gap-2'>
                {Object.entries(inventory).map(([name, qty]) => (
                    <div key={name} className='bg-[#EEF6ED] rounded-xl py-2.5 text-center'>
                        <p className='font-bold text-sm'>{qty}</p>
                        <p className='text-[11px] text-[#6A6F73]'>{name.replace('_', ' ')}</p>
                    </div>
                ))}
            </div>

            <h2 className='font-bold mt-8 mb-3'>Recent rewards</h2>
            {rewards.length === 0 ? (
                <p className='text-sm text-[#6A6F73]'>No rewards yet — complete a lesson or quiz.</p>
            ) : (
                <ul className='space-y-2'>
                    {rewards.map(r => (
                        <li key={r.id} className='bg-white border border-[#C9DDC4] rounded-xl px-4 py-2.5 text-sm flex justify-between'>
                            <span className='font-medium'>{r.kind.replace('_', ' ')}</span>
                            <span className='text-[#6A6F73]'>+{r.xp} XP · +{r.coins} coins</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default Profile
