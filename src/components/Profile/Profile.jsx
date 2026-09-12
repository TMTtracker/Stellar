import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useWallet } from '@/hooks/useWallet'
import { useInventory } from '@/hooks/useInventory'
import { getMyRecentRewards } from '@/services/wallet'

function Profile() {
    const { user } = useAuth()
    const { xp, coins, level, pct, loading: walletLoading } = useWallet()
    const { inventory, total: materialTotal, loading: invLoading } = useInventory()
    const [rewards, setRewards] = useState([])

    useEffect(() => {
        if (!user) return
        let cancelled = false
        getMyRecentRewards(10).then(rows => {
            if (!cancelled) setRewards(rows ?? [])
        }).catch(() => {})
        return () => { cancelled = true }
    }, [user])

    return (
        <div id='profile' className='min-h-screen scroll-mt-27.5 p-6 max-w-3xl mx-auto'>
            <p className='text-[11px] font-bold tracking-wider text-[#A9D8AE]'>PROFILE</p>
            <h1 className='text-3xl font-extrabold tracking-tight mt-1'>
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Stellar Cadet'}
            </h1>
            <p className='text-sm text-[#6A6F73] mt-1'>{user?.email}</p>

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
