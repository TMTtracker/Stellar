import { useEffect, useState } from 'react'
import { Backpack, Trophy, Map, ShoppingBag, BookOpen, Bell, Settings, Flame, Zap, Banknote, Building2, Building, Warehouse, Lock, BrickWall, TreeDeciduous, Gem, Mountain, Pickaxe, Beaker, Lightbulb, Logs, Feather, Clock, X } from 'lucide-react'
import ProtectedLayout from '@/components/ProtectedLayout/ProtectedLayout'
import GameWorld from '@/components/GameWorld/GameWorld'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@/hooks/useWallet'
import { useInventory } from '@/hooks/useInventory'
import { listDailyLessons } from '@/services/lessons'
import { DollarSign } from 'lucide-react'

const streak = 9

const materialIconMap = {
    'bricks': BrickWall,
    'timber': TreeDeciduous,
    'rare gem': Gem,
    'rare gems': Gem,
    'stone': Mountain,
    'iron': Pickaxe,
    'glass': Beaker,
    'crystal shard': Lightbulb,
    'fabric': Feather
}

function materialIcon(name) {
    return materialIconMap[(name ?? '').toLowerCase()] ?? BrickWall
}

const friends = [
    { initials: 'TM', cls: 'bg-[#A9D8AE]' },
    { initials: 'FA', cls: 'bg-[#141814]' }
]

const nav = [
    { label: 'Courses', icon: BookOpen, to: '/courses' },
    { label: 'Leaderboard', icon: Trophy, to: '/leaderboard' },
    { label: 'Shop', icon: ShoppingBag, to: '/shop' },
    { label: 'Inventory', icon: Backpack, to: null },
    { label: 'World map', icon: Map, to: '/' }
]

const buildItems = [
    {
        icon: Building2,
        iconColor: 'text-[#A9D8AE]',
        name: 'Data structures hall',
        desc: 'Unlocks arrays through trees content.',
        materials: [
            { icon: BrickWall, name: 'Bricks', current: 8, total: 8, ok: true },
            { icon: TreeDeciduous, name: 'Timber', current: 2, total: 5, ok: false }
        ],
        action: 'Buy missing materials',
        cost: '90 coins',
        style: 'bg-[#A9D8AE] text-white hover:bg-[#98CD9E]'
    },
    {
        icon: Building,
        iconColor: 'text-[#141814]',
        name: 'Algorithms tower',
        desc: 'Unlocks sorting and graph content.',
        materials: [
            { icon: TreeDeciduous, name: 'Timber', current: 12, total: 12, ok: true },
            { icon: Gem, name: 'Rare gem', current: 1, total: 1, ok: true }
        ],
        action: 'Build now',
        style: 'border-2 border-[#A9D8AE] text-[#1F2225] hover:bg-[#DDF0E1]'
    },
    {
        icon: Warehouse,
        iconColor: 'text-[#6A6F73]',
        name: 'Interview prep dojo',
        desc: 'Unlocks mock interview mode.',
        materials: [
            { icon: BrickWall, name: 'Bricks', current: 3, total: 10, ok: false },
            { icon: Gem, name: 'Rare gem', current: 0, total: 2, ok: false }
        ],
        action: 'Locked — complete more lessons',
        disabled: true,
        style: 'bg-[#CFE7D2] text-[#8BA089]'
    },
    {
        icon: Lock,
        iconColor: 'text-[#6A6F73]',
        name: 'Coding coliseum',
        desc: 'Reach level 20 to unlock this building.',
        locked: true
    }
]

const buildMaterialDefs = [
    { icon: BrickWall, name: 'Bricks', key: 'bricks' },
    { icon: Logs, name: 'Timber', key: 'timber' },
    { icon: Gem, name: 'Rare gems', key: 'rare_gems', color: 'text-[#141814]' },
    { icon: Mountain, name: 'Stone', key: 'stone' },
    { icon: Pickaxe, name: 'Iron', key: 'iron' },
    { icon: Beaker, name: 'Glass', key: 'glass', color: 'text-[#A9D8AE]' },
    { icon: Lightbulb, name: 'Crystal shard', key: 'crystal_shard', color: 'text-[#E8933E]' },
    { icon: Feather, name: 'Fabric', key: 'fabric' }
]

const consumables = [
    {
        icon: Clock,
        iconColor: 'text-[#E8933E]',
        name: 'XP boost (2x, 1 hour)',
        count: 3
    }
]

export default function Dashboard() {
    const navigate = useNavigate()
    const [showInventory, setShowInventory] = useState(false)
    const { coins, level, pct } = useWallet()
    const { inventory, total: inventoryTotal } = useInventory()
    const [dailyLessons, setDailyLessons] = useState([])
    const [dailyLoading, setDailyLoading] = useState(true)
    const [dailyError, setDailyError] = useState('')

    useEffect(() => {
        let cancelled = false
        listDailyLessons({ limit: 3 })
            .then(rows => {
                if (!cancelled) setDailyLessons(rows ?? [])
            })
            .catch(e => {
                if (!cancelled) setDailyError(e.message ?? 'Failed to load daily lessons')
            })
            .finally(() => {
                if (!cancelled) setDailyLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [])

    const buildMaterials = buildMaterialDefs.map(def => ({
        ...def,
        count: inventory[def.key] ?? 0
    }))

    // success / danger token colors
    const statusColor = ok => (ok ? 'text-[#A9D8AE]' : 'text-[#D9605B]')

    return (
        <ProtectedLayout>
            <div className='relative w-full h-screen overflow-hidden'>
                {/* 3D world viewport */}
                <div className='absolute inset-0'>
                    <GameWorld />
                </div>

                {/* Top-left: profile chip + streak */}
                <div className='absolute top-4 left-4 flex items-center gap-2.5 bg-white/95 border border-[#C9DDC4] rounded-xl px-3 py-2 shadow-sm'>
                    <div className='w-9 h-9 rounded-full bg-[#141814] text-white flex items-center justify-center text-xs font-bold'>MA</div>
                    <div>
                        <div className='text-sm font-bold leading-none'>Sayok · Lv {level}</div>
                        <div className='w-28 h-1.5 rounded-full bg-[#EAF2E6] mt-2 overflow-hidden'>
                            <div className='h-full bg-[#A9D8AE] rounded-full' style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                    <div className='flex items-center gap-1.5 text-sm font-bold text-[#E8933E] border-l border-[#C9DDC4] pl-2.5 ml-0.5'>
                        <Flame size={15} fill='currentColor' />
                        {streak} Days Streak
                    </div>
                </div>

                {/* Top-left: Daily lessons panel */}
                <div className='absolute top-[84px] left-4 w-[280px] bg-white/95 border border-[#C9DDC4] rounded-xl px-4 py-4 shadow-sm'>
                    <p className='text-[11px] font-bold tracking-wider text-[#6A6F73] mb-3'>DAILY LESSONS</p>
                    {dailyLoading && <p className='text-[12px] text-[#6A6F73] py-3'>Loading lessons…</p>}
                    {!dailyLoading && dailyError && <p className='text-[12px] text-[#D9605B] py-3'>{dailyError}</p>}
                    {!dailyLoading && !dailyError && dailyLessons.length === 0 && (
                        <p className='text-[12px] text-[#6A6F73] py-3'>No lessons yet — check back soon.</p>
                    )}
                    {!dailyLoading && !dailyError && dailyLessons.length > 0 && (
                        <ul className='divide-y divide-[#C9DDC4]'>
                            {dailyLessons.map(lesson => {
                                const MaterialIcon = materialIcon(lesson.material_name)
                                return (
                                    <li key={lesson.id} className='py-3'>
                                        <button
                                            className='w-full text-left hover:opacity-80 transition-opacity'
                                            onClick={() => navigate(`/courses/${lesson.course_id}/lessons/${lesson.id}`)}
                                        >
                                            <div className='flex items-center justify-between mb-1'>
                                                <div className='min-w-0 pr-2'>
                                                    <p className='text-[13px] font-medium text-[#1F2225] leading-tight truncate'>{lesson.title}</p>
                                                    <p className='text-[12px] text-[#6A6F73] mt-1'>
                                                        {lesson.duration_min} min · {(lesson.difficulty ?? '').toLowerCase()}
                                                    </p>
                                                    {lesson.courses?.title && (
                                                        <p className='text-[11px] text-[#8BA089] mt-0.5 truncate'>{lesson.courses.title}</p>
                                                    )}
                                                </div>
                                                <div className='flex items-center gap-2.5 text-[12px] shrink-0'>
                                                    <span className='flex items-center gap-1'>
                                                        <Zap size={14} className='text-[#A9D8AE]' />
                                                        {lesson.xp_reward} XP
                                                    </span>
                                                    <span className='flex items-center gap-1'>
                                                        <Banknote size={14} className='text-[#E8933E]' />
                                                        {lesson.coins_reward}
                                                    </span>
                                                    <span className='flex items-center gap-1'>
                                                        <MaterialIcon size={14} className='text-[#6A6F73]' />
                                                        {lesson.material_qty}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}

                    <button className='w-full' onClick={() => navigate('/courses')}>
                        <p className='text-xs font-semibold tracking-wide text-center rounded-full text-white mt-3 p-3 border-t bg-[#8dc26d]'>View all lessons</p>
                    </button>
                    <p className='text-[11px] text-[#6A6F73] mt-3 pt-3 border-t border-[#C9DDC4]'>Harder lessons drop rarer build materials, not just more XP.</p>
                </div>

                {/* Top-right: friends + inventory + controls */}
                <div className='absolute top-4 right-4 flex items-center gap-2'>
                    {/* Friends stack */}
                    <div className='flex items-center mr-1'>
                        {friends.map(f => (
                            <div key={f.initials} className={`w-6.5 h-6.5 rounded-full ${f.cls} text-white flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm`}>
                                {f.initials}
                            </div>
                        ))}
                        <div className='w-6.5 h-6.5 rounded-full bg-white border-2 border-white text-[#6A6F73] flex items-center justify-center text-[10px] font-bold -ml-2 shadow-sm'>+3</div>
                    </div>

                    {/* Inventory — replaces the money indicator */}
                    <button aria-label='Inventory' onClick={() => navigate('/shop')} className='relative flex items-center gap-2 bg-white/95 border border-[#C9DDC4] rounded-xl px-3 py-1.5 hover:border-[#A9D8AE] transition-colors'>
                        <DollarSign size={16} className='text-[#A9D8AE]' />
                        <span className='text-sm font-bold'>{coins.toLocaleString()}</span>
                    </button>
                    <button aria-label='Inventory' onClick={() => setShowInventory(true)} className='relative flex items-center gap-2 bg-white/95 border border-[#C9DDC4] rounded-xl px-3 py-1.5 hover:border-[#A9D8AE] transition-colors'>
                        <Backpack size={16} className='text-[#A9D8AE]' />
                        <span className='text-sm font-bold'>{inventoryTotal}</span>
                        <span className='absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#A9D8AE] text-white text-[10px] font-bold rounded-full flex items-center justify-center'>3</span>
                    </button>
                    <button aria-label='Notifications' className='w-9 h-9 bg-white/95 border border-[#C9DDC4] rounded-xl flex items-center justify-center text-[#6A6F73] hover:border-[#A9D8AE] hover:text-[#A9D8AE] transition-colors'>
                        <Bell size={16} />
                    </button>
                    <button aria-label='Settings' className='w-9 h-9 bg-white/95 border border-[#C9DDC4] rounded-xl flex items-center justify-center text-[#6A6F73] hover:border-[#A9D8AE] hover:text-[#A9D8AE] transition-colors'>
                        <Settings size={16} />
                    </button>
                </div>

                {/* Top-center: active quest banner */}
                <div className='absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 border border-[#A9D8AE] rounded-xl px-3.5 py-2 shadow-sm'>
                    <span className='w-6 h-6 rounded-md bg-[#DDF0E1] text-[#A9D8AE] flex items-center justify-center'>
                        <Building2 size={14} />
                    </span>
                    <span className='text-sm font-bold flex items-center gap-2'>
                        Level 2 Base · 100% Ready
                        <button aria-label='Settings' className='p-2 bg-[#8dc26d] hover:bg-[#A9D8AE] transition-colors text-xs text-white font-semibold rounded-full'>
                            Upgrade
                        </button>
                    </span>
                </div>

                {/* Bottom-left: minimap */}
                <div className='absolute bottom-4 left-4  bg-white/95 border border-[#C9DDC4] rounded-xl flex flex-col items-center justify-center gap-1 shadow-sm hover:border-[#A9D8AE] transition-colors'>
                    <img src='public/assets/minimap.png' className='h-[25vh]' alt='' />
                </div>

                {/* Bottom nav bar */}
                <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/95 border border-[#C9DDC4] rounded-2xl px-2 py-1.5 shadow-sm'>
                    {nav.map(({ label, icon: Icon, to }) => (
                        <button
                            key={label}
                            onClick={() => {
                                if (to) navigate(to)
                                else setShowInventory(true)
                            }}
                            className='flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg hover:bg-[#DDF0E1] transition-colors'
                        >
                            <Icon size={18} className='text-[#6A6F73] hover:text-[#1F2225]' />
                            <span className='text-[11px] font-medium text-[#6A6F73]'>{label}</span>
                        </button>
                    ))}
                </div>

                {/* Inventory panel */}
                {showInventory && (
                    <>
                        <div className='absolute inset-0 bg-black/20' onClick={() => setShowInventory(false)} />
                        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] max-w-[92vw] max-h-[90vh] overflow-auto bg-white border border-[#C9DDC4] rounded-2xl p-5 shadow-2xl z-10'>
                            <div className='flex items-center justify-between mb-1'>
                                <span className='text-base font-medium'>Inventory</span>
                                <button onClick={() => setShowInventory(false)} aria-label='Close inventory' className='text-[#6A6F73] hover:text-[#1F2225]'>
                                    <X size={16} />
                                </button>
                            </div>
                            <p className='text-[12px] text-[#6A6F73] mb-3'>{coins.toLocaleString()} coins</p>

                            <p className='text-[11px] font-bold tracking-wider text-[#6A6F73] mb-2'>BUILD MATERIALS</p>
                            <div className='grid grid-cols-4 gap-2 mb-4'>
                                {buildMaterials.map(material => (
                                    <div key={material.name} className='flex flex-col items-center justify-center rounded-xl bg-[#EEF6ED] py-2.5'>
                                        <material.icon size={20} className={material.color || 'text-[#6A6F73]'} />
                                        <span className='text-[12px] font-medium mt-1'>{material.count}</span>
                                        <span className='text-[10px] text-[#6A6F73]'>{material.name}</span>
                                    </div>
                                ))}
                            </div>

                            <p className='text-[11px] font-bold tracking-wider text-[#6A6F73] mb-2'>CONSUMABLES</p>
                            <div className='space-y-2'>
                                {consumables.map(item => {
                                    const ItemIcon = item.icon
                                    return (
                                        <div key={item.name} className='flex items-center justify-between rounded-xl bg-[#EEF6ED] px-3 py-2'>
                                            <div className='flex items-center gap-2 text-[13px]'>
                                                <ItemIcon size={17} className={item.iconColor} />
                                                {item.name}
                                            </div>
                                            <div className='flex items-center gap-2 text-[12px] text-[#6A6F73]'>
                                                <span>x{item.count}</span>
                                                <button className='rounded-full border border-[#C9DDC4] px-2.5 py-1 text-[11px] hover:border-[#A9D8AE] hover:text-[#1F2225]'>Use</button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </>
                )}

                <div className='absolute bottom-4 right-4 w-[520px] max-w-[92vw] max-h-[88vh] overflow-auto bg-white border border-[#C9DDC4] rounded-2xl p-5 shadow-2xl z-20'>
                    <div className='flex items-center justify-between mb-3'>
                        <span className='text-base font-medium'>Build menu</span>
                    </div>

                    <div className='grid grid-cols-2 gap-2.5'>
                        {buildItems.map(item => {
                            const ItemIcon = item.icon
                            return (
                                <div key={item.name} className='rounded-xl border border-[#C9DDC4] p-2.5'>
                                    <div className='flex items-center gap-1.5 text-[13px] font-medium mb-1.5'>
                                        <ItemIcon size={16} className={item.iconColor} />
                                        {item.name}
                                    </div>
                                    <p className='text-[12px] text-[#6A6F73] mb-2'>{item.desc}</p>

                                    {!item.locked && (
                                        <>
                                            {item.materials.map(mat => {
                                                const MatIcon = mat.icon
                                                return (
                                                    <div key={mat.name} className='text-[12px] flex items-center justify-between mb-1.5'>
                                                        <span className='flex items-center gap-1'>
                                                            <MatIcon size={13} />
                                                            {mat.name}
                                                        </span>
                                                        <span className={statusColor(mat.ok)}>
                                                            {mat.current} / {mat.total}
                                                        </span>
                                                    </div>
                                                )
                                            })}

                                            <button disabled={item.disabled} className={`w-full mt-2 text-[12px] py-1.5 rounded-full transition-colors ${item.style}`}>
                                                {item.action}
                                                {item.cost ? ` — ${item.cost}` : ''}
                                            </button>
                                        </>
                                    )}

                                    {item.locked && <div className='text-[12px] text-[#6A6F73]'>{item.desc}</div>}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </ProtectedLayout>
    )
}
