import { useState } from 'react'
import { BrickWall, Coins, TreeDeciduous, Zap } from 'lucide-react'
import ProtectedLayout from '@/components/ProtectedLayout/ProtectedLayout'
import { useWallet } from '@/hooks/useWallet'
import { useInventory } from '@/hooks/useInventory'
import { spendCoins } from '@/services/wallet'
import { addMaterials } from '@/services/inventory'

const items = [
    {
        id: 'bricks-5',
        name: 'Bundle of Bricks ×5',
        desc: 'Basic building material for your world.',
        price: 50,
        icon: BrickWall,
        material: 'Bricks',
        qty: 5
    },
    {
        id: 'timber-5',
        name: 'Bundle of Timber ×5',
        desc: 'Sturdy wood for halls and towers.',
        price: 90,
        icon: TreeDeciduous,
        material: 'Timber',
        qty: 5
    },
    {
        id: 'xp-boost',
        name: 'XP Boost (2x, 1 hour)',
        desc: 'Double XP on everything you complete.',
        price: 120,
        icon: Zap
    }
]

function Shop() {
    const { coins, xp, loading, refresh } = useWallet()
    const { refresh: refreshInventory } = useInventory()
    const [buying, setBuying] = useState('')
    const [message, setMessage] = useState('')

    async function handleBuy(item) {
        setBuying(item.id)
        setMessage('')
        try {
            const res = await spendCoins(item.price, `shop:${item.id}`)
            if (!res?.ok) {
                setMessage(`Not enough coins — you have ${(res?.coins ?? coins).toLocaleString()}. Complete lessons to earn more.`)
                return
            }
            if (item.material) {
                await addMaterials(item.material, item.qty)
                refreshInventory()
                setMessage(`Bought ${item.name} for ${item.price} coins. Materials added to inventory.`)
            } else {
                setMessage(`Bought ${item.name} for ${item.price} coins.`)
            }
            refresh()
        } catch (e) {
            setMessage(e.message ?? 'Purchase failed.')
        } finally {
            setBuying('')
        }
    }

    return (
        <ProtectedLayout>
            <div className='mb-6'>
                <p className='text-[11px] font-bold tracking-wider text-[#A9D8AE]'>SHOP</p>
                <h1 className='text-3xl font-extrabold tracking-tight'>Spend your coins</h1>
                <p className='text-sm text-[#6A6F73] mt-2 max-w-xl'>
                    Earn coins by completing lessons and passing quizzes, then trade them for materials and boosts.
                </p>
            </div>

            <div className='flex flex-wrap items-center gap-3 mb-6'>
                <div className='flex items-center gap-2 bg-white border border-[#C9DDC4] px-4 py-2 rounded-full'>
                    <Coins size={16} className='text-[#E8933E]' />
                    <span className='text-sm font-bold'>{loading ? '…' : coins.toLocaleString()} coins</span>
                </div>
                <div className='flex items-center gap-2 bg-white border border-[#C9DDC4] px-4 py-2 rounded-full'>
                    <Zap size={16} className='text-[#A9D8AE]' />
                    <span className='text-sm font-bold'>{loading ? '…' : xp.toLocaleString()} XP</span>
                </div>
            </div>

            {message && (
                <p className='text-sm bg-white border border-[#C9DDC4] rounded-xl px-4 py-3 mb-6'>{message}</p>
            )}

            <div className='grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5'>
                {items.map(item => {
                    const Icon = item.icon
                    const afford = coins >= item.price
                    return (
                        <div key={item.id} className='bg-white rounded-2xl border border-[#C9DDC4] p-5 flex flex-col'>
                            <div className='w-11 h-11 rounded-xl bg-[#EFF3EE] flex items-center justify-center mb-3'>
                                <Icon size={20} className='text-[#6A6F73]' />
                            </div>
                            <h3 className='font-bold leading-snug'>{item.name}</h3>
                            <p className='text-xs text-[#6A6F73] mt-1 mb-4'>{item.desc}</p>
                            <button
                                onClick={() => handleBuy(item)}
                                disabled={!afford || buying === item.id || loading}
                                className='mt-auto flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm bg-[#A9D8AE] text-white hover:bg-[#96CC9C] disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                <Coins size={15} />
                                {buying === item.id ? 'Buying…' : afford ? `Buy — ${item.price} coins` : `Need ${item.price} coins`}
                            </button>
                        </div>
                    )
                })}
            </div>
        </ProtectedLayout>
    )
}

export default Shop
