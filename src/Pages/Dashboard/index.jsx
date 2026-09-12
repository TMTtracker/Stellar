import { useEffect, useState } from 'react'
import { Backpack, Trophy, Map, ShoppingBag, BookOpen, Bell, Settings, Flame, Zap, Banknote, Building2, Building, Warehouse, Lock, BrickWall, TreeDeciduous, Gem, Mountain, Pickaxe, Beaker, Lightbulb, Feather, Clock, X, Hammer, Check } from 'lucide-react'
import ProtectedLayout from '@/components/ProtectedLayout/ProtectedLayout'
import GameWorld from '@/components/GameWorld/GameWorld'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useWallet } from '@/hooks/useWallet'
import { usePlayerResources } from '@/hooks/usePlayerResources'
import { listBuildMenu, listMyUnlockedBuildings, buildStructure, buyMissingMaterials, placeNewBuilding, RESOURCES_EVENT } from '@/services/resources'
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
    { id: 'courses', label: 'Courses', icon: BookOpen, to: '/courses' },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, to: '/leaderboard' },
    { id: 'shop', label: 'Shop', icon: ShoppingBag, to: '/shop' },
    { id: 'inventory', label: 'Inventory', icon: Backpack, to: null },
    { id: 'your-builds', label: 'Your Builds', icon: Hammer, to: null },
    { id: 'world-map', label: 'World map', icon: Map, to: '/' }
]

// Visual metadata for each building - icon/color/description aren't stored
// in build_menu (that table only holds the numeric requirements), so this
// maps a build_menu.id to how it's presented. Falls back to a generic look
// for any future building id not listed here.
const BUILD_DISPLAY = {
    data_structures_hall: { icon: Building2, iconColor: 'text-[#A9D8AE]', desc: 'Unlocks arrays through trees content.' },
    algorithms_tower: { icon: Building, iconColor: 'text-[#141814]', desc: 'Unlocks sorting and graph content.' },
    interview_prep_dojo: { icon: Warehouse, iconColor: 'text-[#6A6F73]', desc: 'Unlocks mock interview mode.' },
    coding_coliseum: { icon: Lock, iconColor: 'text-[#6A6F73]', desc: 'Reach level 20 to unlock this building.' }
}
const DEFAULT_BUILD_DISPLAY = { icon: Building2, iconColor: 'text-[#6A6F73]', desc: '' }

// Maps a player_resources column to its build_menu "_required" column and
// display icon/label - drives both the Inventory panel and each build
// menu card's requirement rows.
const MATERIAL_FIELDS = [
    { key: 'bricks', required: 'bricks_required', label: 'Bricks', icon: BrickWall },
    { key: 'timber', required: 'timber_required', label: 'Timber', icon: TreeDeciduous },
    { key: 'rare_gem', required: 'rare_gem_required', label: 'Rare gem', icon: Gem },
    { key: 'stone', required: 'stone_required', label: 'Stone', icon: Mountain },
    { key: 'iron', required: 'iron_required', label: 'Iron', icon: Pickaxe },
    { key: 'glass', required: 'glass_required', label: 'Glass', icon: Beaker },
    { key: 'crystal_shard', required: 'crystal_shard_required', label: 'Crystal shard', icon: Lightbulb },
    { key: 'fabric', required: 'fabric_required', label: 'Fabric', icon: Feather }
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
    const [showYourBuilds, setShowYourBuilds] = useState(false)
    const { user } = useAuth()
    const { coins, level, pct } = useWallet()
    const resources = usePlayerResources()
    const [buildMenu, setBuildMenu] = useState([])
    const [unlockedBuildings, setUnlockedBuildings] = useState([])
    const [placingId, setPlacingId] = useState('')

    const displayName = user?.user_metadata?.full_name || user?.email || 'Stellar Cadet'
    const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const totalMaterialCount = MATERIAL_FIELDS.reduce((sum, f) => sum + (resources[f.key] ?? 0), 0)
    const unlockedIds = new Set(unlockedBuildings.map(b => b.build_id))

    useEffect(() => {
        let cancelled = false
        listBuildMenu().then(rows => {
            if (!cancelled) setBuildMenu(rows)
        })
        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        function loadUnlocked() {
            listMyUnlockedBuildings().then(setUnlockedBuildings).catch(() => {})
        }
        loadUnlocked()
        window.addEventListener(RESOURCES_EVENT, loadUnlocked)
        return () => window.removeEventListener(RESOURCES_EVENT, loadUnlocked)
    }, [])

    // Panel stays open after "Use" - an unlocked type can be placed as
    // many times as you want, so closing on every click would just add
    // friction for someone placing several instances in a row.
    async function handleUseBuilding(building) {
        setPlacingId(building.build_id)
        try {
            await placeNewBuilding(building.build_id, { pos_x: 0, pos_y: 0, rotation: 0 })
        } catch (e) {
            console.error('[dashboard] place failed:', e.message)
        } finally {
            setPlacingId('')
        }
    }

    return (
        <ProtectedLayout>
            <div className='relative w-full h-screen overflow-hidden'>
                {/* 3D world viewport */}
                <div className='absolute inset-0'>
                    <GameWorld />
                </div>

                {/* Top-left: profile chip + streak */}
                <div className='absolute top-4 left-4 flex items-center gap-2.5 bg-white/95 border border-[#C9DDC4] rounded-xl px-3 py-2 shadow-sm'>
                    <div className='w-9 h-9 rounded-full bg-[#141814] text-white flex items-center justify-center text-xs font-bold'>{initials}</div>
                    <div>
                        <div className='text-sm font-bold leading-none'>{displayName} · Lv {level}</div>
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
                        <span className='text-sm font-bold'>{totalMaterialCount}</span>
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
                    {nav.map(({ id, label, icon: Icon, to }) => (
                        <button
                            key={id}
                            onClick={() => {
                                if (to) navigate(to)
                                else if (id === 'inventory') setShowInventory(true)
                                else if (id === 'your-builds') setShowYourBuilds(true)
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
                                {MATERIAL_FIELDS.map(f => (
                                    <div key={f.key} className='flex flex-col items-center justify-center rounded-xl bg-[#EEF6ED] py-2.5'>
                                        <f.icon size={20} className='text-[#6A6F73]' />
                                        <span className='text-[12px] font-medium mt-1'>{resources[f.key] ?? 0}</span>
                                        <span className='text-[10px] text-[#6A6F73]'>{f.label}</span>
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

                {/* Your Builds panel - building types you've permanently unlocked.
                    "Use" places a fresh instance each time; ownership never
                    leaves this list, even after removing an instance from
                    the grid. */}
                {showYourBuilds && (
                    <>
                        <div className='absolute inset-0 bg-black/20' onClick={() => setShowYourBuilds(false)} />
                        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[92vw] max-h-[80vh] overflow-auto bg-white border border-[#C9DDC4] rounded-2xl p-5 shadow-2xl z-10'>
                            <div className='flex items-center justify-between mb-3'>
                                <span className='text-base font-medium'>Your Builds</span>
                                <button onClick={() => setShowYourBuilds(false)} aria-label='Close your builds' className='text-[#6A6F73] hover:text-[#1F2225]'>
                                    <X size={16} />
                                </button>
                            </div>

                            {unlockedBuildings.length === 0 && (
                                <p className='text-[12px] text-[#6A6F73]'>Nothing unlocked yet - build one from the Build menu.</p>
                            )}

                            <div className='space-y-2'>
                                {unlockedBuildings.map(b => {
                                    const display = BUILD_DISPLAY[b.build_id] ?? DEFAULT_BUILD_DISPLAY
                                    const Icon = display.icon
                                    return (
                                        <div key={b.build_id} className='flex items-center justify-between rounded-xl bg-[#EEF6ED] px-3 py-2.5'>
                                            <div className='flex items-center gap-2.5 text-[13px] font-medium'>
                                                <span className='w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0'>
                                                    <Icon size={16} className={display.iconColor} />
                                                </span>
                                                {b.build_menu?.name ?? b.build_id}
                                            </div>
                                            <button
                                                onClick={() => handleUseBuilding(b)}
                                                disabled={placingId === b.build_id}
                                                className='rounded-full border border-[#C9DDC4] bg-white px-3 py-1.5 text-[11px] font-medium hover:border-[#A9D8AE] hover:text-[#1F2225] disabled:opacity-60'
                                            >
                                                {placingId === b.build_id ? 'Placing…' : 'Use'}
                                            </button>
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
                        {buildMenu.map(build => (
                            <BuildMenuCard
                                key={build.id}
                                build={build}
                                resources={resources}
                                level={level}
                                unlocked={unlockedIds.has(build.id)}
                            />
                        ))}
                        {buildMenu.length === 0 && (
                            <p className='col-span-2 text-[12px] text-[#6A6F73]'>No buildings available yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedLayout>
    )
}

// One build_menu row rendered as a card: shows only the materials it
// actually requires (>0), and switches between "Build now" (all met) and
// "Buy missing materials — N coins" (not met) - previously both the
// requirement numbers and the button were hardcoded per building with no
// real comparison at all.
function BuildMenuCard({ build, resources, level, unlocked }) {
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState('')

    const display = BUILD_DISPLAY[build.id] ?? { ...DEFAULT_BUILD_DISPLAY, desc: build.name }
    const ItemIcon = display.icon
    const levelMet = level >= (build.unlock_level ?? 1)

    const requirements = MATERIAL_FIELDS
        .map(f => ({ ...f, required: build[f.required] ?? 0, have: resources[f.key] ?? 0 }))
        .filter(f => f.required > 0)
    const allMet = requirements.every(f => f.have >= f.required)

    async function handleBuild() {
        setBusy(true)
        setMessage('')
        try {
            const res = await buildStructure(build.id)
            setMessage(res?.ok ? 'Crafted! Find it in Your Builds to place it on the map.' : "You don't have enough materials for this.")
        } catch (e) {
            setMessage(e.message ?? 'Build failed.')
        } finally {
            setBusy(false)
        }
    }

    async function handleBuyMissing() {
        setBusy(true)
        setMessage('')
        try {
            const res = await buyMissingMaterials(build.id)
            setMessage(res?.ok ? 'Materials purchased!' : `Not enough coins — you have ${res?.coins ?? 0}.`)
        } catch (e) {
            setMessage(e.message ?? 'Purchase failed.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className='rounded-xl border border-[#C9DDC4] p-2.5'>
            <div className='flex items-center gap-1.5 text-[13px] font-medium mb-1.5'>
                <ItemIcon size={16} className={display.iconColor} />
                {build.name}
            </div>
            <p className='text-[12px] text-[#6A6F73] mb-2'>{display.desc}</p>

            {!levelMet && (
                <div className='text-[12px] text-[#6A6F73]'>Reach level {build.unlock_level} to unlock this building.</div>
            )}

            {levelMet && unlocked && (
                <div className='flex items-center gap-1.5 text-[12px] font-medium text-[#3E7A42] bg-[#E1F0DF] rounded-lg px-2.5 py-2'>
                    <Check size={13} strokeWidth={3} /> Unlocked — place it from Your Builds.
                </div>
            )}

            {levelMet && !unlocked && (
                <>
                    {requirements.map(f => {
                        const MatIcon = f.icon
                        const ok = f.have >= f.required
                        return (
                            <div key={f.key} className='text-[12px] flex items-center justify-between mb-1.5'>
                                <span className='flex items-center gap-1'>
                                    <MatIcon size={13} />
                                    {f.label}
                                </span>
                                <span className={ok ? 'text-[#A9D8AE]' : 'text-[#D9605B]'}>
                                    {f.have} / {f.required}
                                </span>
                            </div>
                        )
                    })}

                    {message && <p className='text-[11px] text-[#6A6F73] mb-1.5'>{message}</p>}

                    {allMet ? (
                        <button
                            onClick={handleBuild}
                            disabled={busy}
                            className='w-full mt-2 text-[12px] py-1.5 rounded-full transition-colors border-2 border-[#A9D8AE] text-[#1F2225] hover:bg-[#DDF0E1] disabled:opacity-60'
                        >
                            {busy ? 'Building…' : 'Build now'}
                        </button>
                    ) : (
                        <button
                            onClick={handleBuyMissing}
                            disabled={busy}
                            className='w-full mt-2 text-[12px] py-1.5 rounded-full transition-colors bg-[#A9D8AE] text-white hover:bg-[#98CD9E] disabled:opacity-60'
                        >
                            {busy ? 'Buying…' : `Buy missing materials — ${build.coin_cost} coins`}
                        </button>
                    )}
                </>
            )}
        </div>
    )
}
