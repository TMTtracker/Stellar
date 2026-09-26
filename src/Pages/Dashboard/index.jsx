import { useEffect, useState } from 'react'
import { Backpack, Trophy, ShoppingBag, BookOpen, Settings, Flame, Zap, Banknote, Building2, Building, Warehouse, Lock, BrickWall, TreeDeciduous, Gem, Mountain, Pickaxe, Beaker, Lightbulb, Feather, Clock, X, Hammer, Check, User, Moon, Sun, LogOut, Minus, ListChecks, Blocks, Users } from 'lucide-react'
import ProtectedLayout from '@/components/ProtectedLayout/ProtectedLayout'
import NotificationBell from '@/components/Notifications/NotificationBell'
import GameWorld, { BASE_MODEL_URLS } from '@/components/GameWorld/GameWorld'
import UpgradeBaseModal from '@/components/GameWorld/UpgradeBaseModal'
import MiniMap from '@/components/GameWorld/MiniMap'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useWallet } from '@/hooks/useWallet'
import { usePlayerResources } from '@/hooks/usePlayerResources'
import { useAvatar, isImageAvatar } from '@/hooks/useAvatar'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useStreak } from '@/hooks/useStreak'
import { useBase } from '@/hooks/useBase'
import { listBuildMenu, listMyUnlockedBuildings, buildStructure, buyMissingMaterials, placeNewBuilding, RESOURCES_EVENT } from '@/services/resources'
import { listBaseLevels } from '@/services/base'
import { listDailyLessons } from '@/services/lessons'
import { activateXpBoost } from '@/services/wallet'
import { DollarSign } from 'lucide-react'

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
    { id: 'community', label: 'Community', icon: Users, to: '/communities' },
    { id: 'inventory', label: 'Inventory', icon: Backpack, to: null },
    { id: 'your-builds', label: 'Your Builds', icon: Hammer, to: null },
    { id: 'profile', label: 'Profile', icon: User, to: '/profile' }
]

// Visual metadata for each building - icon/color/description aren't stored
// in build_menu (that table only holds the numeric requirements), so this
// maps a build_menu.id to how it's presented. Falls back to a generic look
// for any future building id not listed here.
const BUILD_DISPLAY = {
    data_structures_hall: { icon: Building2, iconColor: 'text-[#A9D8AE]', desc: 'Unlocks arrays through trees content.' },
    algorithms_tower: { icon: Building, iconColor: 'text-[#141814]', desc: 'Unlocks sorting and graph content.' },
    interview_prep_dojo: { icon: Warehouse, iconColor: 'text-[#6A6F73] dark:text-[#8FA893]', desc: 'Unlocks mock interview mode.' },
    coding_coliseum: { icon: Lock, iconColor: 'text-[#6A6F73] dark:text-[#8FA893]', desc: 'Reach level 20 to unlock this building.' }
}
const DEFAULT_BUILD_DISPLAY = { icon: Building2, iconColor: 'text-[#6A6F73] dark:text-[#8FA893]', desc: '' }

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
        id: 'xp-boost',
        icon: Clock,
        iconColor: 'text-[#E8933E]',
        name: 'XP boost (2x, 1 hour)'
    }
]

export default function Dashboard() {
    const navigate = useNavigate()
    const [showInventory, setShowInventory] = useState(false)
    const [showYourBuilds, setShowYourBuilds] = useState(false)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const { user, signOut } = useAuth()
    const { coins, level, pct, xpBoostCharges, xpBoostUntil } = useWallet()
    const resources = usePlayerResources()
    const { avatar } = useAvatar()
    const { dark, toggle: toggleDarkMode } = useDarkMode()
    const { streak, nextXp, nextIsMilestone, daysToMilestone } = useStreak()
    const base = useBase()
    const avatarIsImage = isImageAvatar(avatar)
    const [buildMenu, setBuildMenu] = useState([])
    const [unlockedBuildings, setUnlockedBuildings] = useState([])
    const [placingId, setPlacingId] = useState('')
    const [dailyLessons, setDailyLessons] = useState([])
    const [dailyLoading, setDailyLoading] = useState(true)
    const [dailyError, setDailyError] = useState('')
    const [usingBoost, setUsingBoost] = useState(false)
    const [boostNowTick, setBoostNowTick] = useState(() => Date.now())
    const [baseLevels, setBaseLevels] = useState([])
    const [showUpgradeBase, setShowUpgradeBase] = useState(false)
    const [showDailyLessons, setShowDailyLessons] = useState(true)
    const [showBuildMenuPanel, setShowBuildMenuPanel] = useState(true)

    const displayName = user?.user_metadata?.full_name || user?.email || 'Stellar Cadet'
    const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const totalMaterialCount = MATERIAL_FIELDS.reduce((sum, f) => sum + (resources[f.key] ?? 0), 0)
    const unlockedIds = new Set(unlockedBuildings.map(b => b.build_id))

    // Base upgrade: the catalog only has rows for levels that are actually
    // configured (currently just 2), so anything past that - or past the
    // hard level-6 cap - simply has no next level to offer yet.
    const nextBaseLevelNum = (base.base_level ?? 1) + 1
    const nextBaseLevelInfo = nextBaseLevelNum <= 6 ? baseLevels.find(l => l.level === nextBaseLevelNum) : null
    const baseLevelMet = nextBaseLevelInfo ? level >= (nextBaseLevelInfo.unlock_level ?? 1) : false
    const baseRequirements = nextBaseLevelInfo
        ? MATERIAL_FIELDS
            .map(f => ({ key: f.key, required: nextBaseLevelInfo[f.required] ?? 0, have: resources[f.key] ?? 0 }))
            .filter(f => f.required > 0)
        : []
    const baseMaterialsHave = baseRequirements.reduce((sum, f) => sum + Math.min(f.have, f.required), 0)
    const baseMaterialsNeeded = baseRequirements.reduce((sum, f) => sum + f.required, 0)
    const baseReadyPct = !nextBaseLevelInfo
        ? 100
        : !baseLevelMet
            ? 0
            : baseMaterialsNeeded > 0
                ? Math.round((baseMaterialsHave / baseMaterialsNeeded) * 100)
                : 100
    const baseReady = !!nextBaseLevelInfo && baseLevelMet && baseMaterialsHave >= baseMaterialsNeeded
    const baseLabel = nextBaseLevelInfo
        ? `Level ${base.base_level ?? 1} Base · ${baseReadyPct}% Ready`
        : `Level ${base.base_level ?? 1} Base · Max`

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
        let cancelled = false
        listBaseLevels().then(rows => {
            if (!cancelled) setBaseLevels(rows)
        })
        return () => {
            cancelled = true
        }
    }, [])

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

    useEffect(() => {
        function loadUnlocked() {
            listMyUnlockedBuildings().then(setUnlockedBuildings).catch(() => {})
        }
        loadUnlocked()
        window.addEventListener(RESOURCES_EVENT, loadUnlocked)
        return () => window.removeEventListener(RESOURCES_EVENT, loadUnlocked)
    }, [])

    // Ticks once a second while a boost is running so the countdown pill
    // updates live, and stops itself once the boost has actually expired.
    useEffect(() => {
        if (!xpBoostUntil) return
        const endMs = new Date(xpBoostUntil).getTime()
        const id = setInterval(() => {
            const nowMs = Date.now()
            setBoostNowTick(nowMs)
            if (nowMs >= endMs) clearInterval(id)
        }, 1000)
        return () => clearInterval(id)
    }, [xpBoostUntil])

    const boostEndMs = xpBoostUntil ? new Date(xpBoostUntil).getTime() : 0
    const boostActive = boostEndMs > boostNowTick
    const boostRemainingLabel = (() => {
        if (!boostActive) return null
        const totalSec = Math.max(0, Math.ceil((boostEndMs - boostNowTick) / 1000))
        const m = Math.floor(totalSec / 60)
        const s = totalSec % 60
        return `${m}:${String(s).padStart(2, '0')}`
    })()

    async function handleUseXpBoost() {
        if (usingBoost || boostActive || xpBoostCharges <= 0) return
        setUsingBoost(true)
        try {
            await activateXpBoost()
        } catch (e) {
            console.error('[dashboard] xp boost activation failed:', e.message)
        } finally {
            setUsingBoost(false)
        }
    }

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

    async function handleLogout() {
        try {
            await signOut()
            navigate('/')
        } catch (e) {
            console.error('[auth] sign out failed:', e.message)
        }
    }

    return (
        <ProtectedLayout>
            <div className='relative w-full h-screen overflow-hidden'>
                {/* 3D world viewport */}
                <div className='absolute inset-0'>
                    <GameWorld dark={dark} />
                </div>

                {/* Top-left: profile chip + streak — links to /profile */}
                <div className='absolute top-4 left-4 flex items-center gap-2'>
                    <button
                        onClick={() => navigate('/profile')}
                        className='flex items-center gap-2.5 bg-white/95 dark:bg-[#14171A]/95 border border-[#C9DDC4] dark:border-[#262E28] rounded-xl px-3 py-2 shadow-sm hover:border-[#A9D8AE] hover:bg-white dark:hover:bg-[#1B1F22] transition-colors text-left'
                        aria-label="View profile"
                    >
                        <div className='w-9 h-9 rounded-full bg-[#141814] text-white flex items-center justify-center text-xs font-bold overflow-hidden'>
                            {avatarIsImage ? <img src={avatar} alt="Profile avatar" className="w-full h-full object-cover rounded-full" /> : avatar ? <span className="text-base leading-none">{avatar}</span> : initials}
                        </div>
                        <div>
                            <div className='text-sm font-bold leading-none'>{displayName} · Lv {level}</div>
                            <div className='w-28 h-1.5 rounded-full bg-[#EAF2E6] dark:bg-[#232A24] mt-2 overflow-hidden'>
                                <div className='h-full bg-[#A9D8AE] rounded-full' style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                        <div className='flex items-center gap-1.5 text-sm font-bold text-[#E8933E] border-l border-[#C9DDC4] dark:border-[#262E28] pl-2.5 ml-0.5'>
                            <Flame size={15} fill='currentColor' />
                            {streak} Days Streak
                        </div>
                    </button>

                    {/* Forecast: what tomorrow's login is worth, so the streak
                        actually motivates coming back instead of just being a
                        number. Same footprint as the streak segment above. */}
                    <div
                        className={`flex items-center gap-1.5 text-sm font-bold rounded-xl px-3 py-2 shadow-sm border ${
                            nextIsMilestone
                                ? 'bg-[#F1EEFB] dark:bg-[#241E33] border-[#C9BEEF] dark:border-[#3A2E52] text-[#6B5BA6] dark:text-[#B9A8E8]'
                                : 'bg-white/95 dark:bg-[#14171A]/95 border-[#C9DDC4] dark:border-[#262E28] text-[#E8933E]'
                        }`}
                        title='Keep your streak alive to earn this tomorrow'
                    >
                        {nextIsMilestone ? (
                            <>
                                <Gem size={15} /> +5 gems &amp; {nextXp} XP tomorrow!
                            </>
                        ) : daysToMilestone <= 3 ? (
                            <>
                                <Flame size={15} /> {daysToMilestone}d to +5 gems — keep going!
                            </>
                        ) : (
                            <>
                                <Zap size={15} className='text-[#A9D8AE]' /> +{nextXp} XP tomorrow
                            </>
                        )}
                    </div>

                    {/* XP boost countdown - only shown while a boost is running,
                        ticks live and disappears the moment it expires. */}
                    {boostActive && (
                        <div
                            className='flex items-center gap-1.5 text-sm font-bold rounded-xl px-3 py-2 shadow-sm border bg-[#FBF0D9] dark:bg-[#2A2417] border-[#E8933E]/40 text-[#8A6D2B] dark:text-[#E3BE72]'
                            title='2x XP boost active'
                        >
                            <Clock size={15} /> 2x XP · {boostRemainingLabel}
                        </div>
                    )}
                </div>

                {/* Top-left: Daily lessons panel - minimizes to a small icon so the
                    game world underneath stays visible when not needed. */}
                {!showDailyLessons && (
                    <button
                        onClick={() => setShowDailyLessons(true)}
                        aria-label='Expand daily lessons'
                        title='Daily lessons'
                        className='absolute top-[84px] left-4 w-11 h-11 rounded-xl bg-white/95 dark:bg-[#14171A]/95 border border-[#C9DDC4] dark:border-[#262E28] shadow-sm flex items-center justify-center text-[#6A6F73] dark:text-[#8FA893] hover:border-[#A9D8AE] hover:text-[#1F2225] dark:hover:text-[#EAF3E7] transition-colors'
                    >
                        <ListChecks size={18} />
                    </button>
                )}
                {showDailyLessons && (
                <div className='absolute top-[84px] left-4 w-[280px] bg-white/95 dark:bg-[#14171A]/95 border border-[#C9DDC4] dark:border-[#262E28] rounded-xl px-4 py-4 shadow-sm'>
                    <div className='flex items-center justify-between mb-3'>
                        <p className='text-[11px] font-bold tracking-wider text-[#6A6F73] dark:text-[#8FA893]'>DAILY LESSONS</p>
                        <button
                            onClick={() => setShowDailyLessons(false)}
                            aria-label='Minimize daily lessons'
                            title='Minimize'
                            className='w-6 h-6 -mr-1 -mt-1 flex items-center justify-center rounded-md text-[#6A6F73] dark:text-[#8FA893] hover:bg-[#DDF0E1] dark:hover:bg-[#1E2B20] hover:text-[#1F2225] dark:hover:text-[#EAF3E7] transition-colors'
                        >
                            <Minus size={14} />
                        </button>
                    </div>
                    {dailyLoading && <p className='text-[12px] text-[#6A6F73] dark:text-[#8FA893] py-3'>Loading lessons…</p>}
                    {!dailyLoading && dailyError && <p className='text-[12px] text-[#D9605B] py-3'>{dailyError}</p>}
                    {!dailyLoading && !dailyError && dailyLessons.length === 0 && (
                        <p className='text-[12px] text-[#6A6F73] dark:text-[#8FA893] py-3'>No lessons yet — check back soon.</p>
                    )}
                    {!dailyLoading && !dailyError && dailyLessons.length > 0 && (
                        <ul className='divide-y divide-[#C9DDC4] dark:divide-[#262E28]'>
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
                                                    <p className='text-[13px] font-medium text-[#1F2225] dark:text-[#F2F5F0] leading-tight truncate'>{lesson.title}</p>
                                                    <p className='text-[12px] text-[#6A6F73] dark:text-[#8FA893] mt-1'>
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
                                                        <MaterialIcon size={14} className='text-[#6A6F73] dark:text-[#8FA893]' />
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
                    <p className='text-[11px] text-[#6A6F73] dark:text-[#8FA893] mt-3 pt-3 border-t border-[#C9DDC4] dark:border-[#262E28]'>Harder lessons drop rarer build materials, not just more XP.</p>
                </div>
                )}

                {/* Top-right: friends + inventory + controls */}
                <div className='absolute top-4 right-4 flex items-center gap-2'>
                    {/* Friends stack */}
                    <div className='flex items-center mr-1'>
                        {friends.map(f => (
                            <div key={f.initials} className={`w-6.5 h-6.5 rounded-full ${f.cls} text-white flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm`}>
                                {f.initials}
                            </div>
                        ))}
                        <div className='w-6.5 h-6.5 rounded-full bg-white border-2 border-white text-[#6A6F73] dark:text-[#8FA893] flex items-center justify-center text-[10px] font-bold -ml-2 shadow-sm'>+3</div>
                    </div>

                    {/* Inventory — replaces the money indicator */}
                    <button aria-label='Inventory' onClick={() => navigate('/shop')} className='relative flex items-center gap-2 bg-white/95 dark:bg-[#14171A]/95 border border-[#C9DDC4] dark:border-[#262E28] rounded-xl px-3 py-1.5 hover:border-[#A9D8AE] transition-colors'>
                        <DollarSign size={16} className='text-[#A9D8AE]' />
                        <span className='text-sm font-bold'>{coins.toLocaleString()}</span>
                    </button>
                    <button aria-label='Inventory' onClick={() => setShowInventory(true)} className='relative flex items-center gap-2 bg-white/95 dark:bg-[#14171A]/95 border border-[#C9DDC4] dark:border-[#262E28] rounded-xl px-3 py-1.5 hover:border-[#A9D8AE] transition-colors'>
                        <Backpack size={16} className='text-[#A9D8AE]' />
                        <span className='text-sm font-bold'>{totalMaterialCount}</span>
                        <span className='absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#A9D8AE] text-white text-[10px] font-bold rounded-full flex items-center justify-center'>3</span>
                    </button>
                    <NotificationBell />
                    <div className='relative'>
                        <button aria-label='Settings' aria-expanded={settingsOpen} onClick={() => setSettingsOpen(open => !open)} className='w-9 h-9 bg-white/95 dark:bg-[#14171A]/95 border border-[#C9DDC4] dark:border-[#262E28] rounded-xl flex items-center justify-center text-[#6A6F73] dark:text-[#8FA893] hover:border-[#A9D8AE] hover:text-[#A9D8AE] transition-colors'>
                            <Settings size={16} />
                        </button>
                        {settingsOpen && (
                            <div className='absolute right-0 top-11 z-20 w-52 rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] bg-white dark:bg-[#14171A] p-2 text-[#1F2225] dark:text-[#F2F5F0] shadow-xl'>
                                <button
                                    onClick={toggleDarkMode}
                                    aria-pressed={dark}
                                    className='flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-[#EFFAF4] dark:hover:bg-[#1E2B20]'
                                >
                                    {dark ? <Moon size={16} /> : <Sun size={16} />}
                                    Night mode
                                    <span className={`ml-auto flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${dark ? 'bg-[#A9D8AE]' : 'bg-[#E4EBE2]'}`}>
                                        <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${dark ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </span>
                                </button>
                                <button
                                    onClick={() => { setSettingsOpen(false); handleLogout() }}
                                    className='flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#D9605B] hover:bg-[#FBF1ED] dark:hover:bg-[#2A1716]'
                                >
                                    <LogOut size={16} /> Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Top-center: active quest banner */}
                <div className='absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 dark:bg-[#14171A]/95 border border-[#A9D8AE] rounded-xl px-3.5 py-2 shadow-sm'>
                    <span className='w-6 h-6 rounded-md bg-[#DDF0E1] dark:bg-[#1E2B20] text-[#A9D8AE] flex items-center justify-center'>
                        <Building2 size={14} />
                    </span>
                    <span className='text-sm font-bold flex items-center gap-2 text-[#1F2225] dark:text-[#F2F5F0]'>
                        {baseLabel}
                        <button
                            onClick={() => setShowUpgradeBase(true)}
                            className={`px-3 py-1.5 transition-colors text-xs font-semibold rounded-full ${baseReady ? 'bg-[#8dc26d] hover:bg-[#A9D8AE] text-white' : 'bg-[#EFF3EE] dark:bg-[#1B211C] text-[#6A6F73] dark:text-[#8FA893] hover:bg-[#DDF0E1] dark:hover:bg-[#1E2B20]'}`}
                        >
                            {nextBaseLevelInfo ? 'Upgrade' : 'Preview'}
                        </button>
                    </span>
                </div>

                {showUpgradeBase && (
                    <UpgradeBaseModal
                        currentBaseLevel={base.base_level}
                        baseLevels={baseLevels}
                        modelUrls={BASE_MODEL_URLS}
                        resources={resources}
                        accountLevel={level}
                        onClose={() => setShowUpgradeBase(false)}
                    />
                )}

                {/* Bottom-left: minimap - a real, live plot of the camp/base
                    and every placed building, not a static decorative image. */}
                <div className='absolute bottom-4 left-4 p-1.5 bg-white/95 dark:bg-[#14171A]/95 border border-[#C9DDC4] dark:border-[#262E28] rounded-xl shadow-sm hover:border-[#A9D8AE] transition-colors'>
                    <MiniMap />
                </div>

                {/* Bottom nav bar */}
                <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/95 dark:bg-[#14171A]/95 border border-[#C9DDC4] dark:border-[#262E28] rounded-2xl px-2 py-1.5 shadow-sm'>
                    {nav.map(({ id, label, icon: Icon, to }) => (
                        <button
                            key={id}
                            onClick={() => {
                                if (to) navigate(to)
                                else if (id === 'inventory') setShowInventory(true)
                                else if (id === 'your-builds') setShowYourBuilds(true)
                            }}
                            className='flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg hover:bg-[#DDF0E1] dark:hover:bg-[#1E2B20] transition-colors'
                        >
                            <Icon size={18} className='text-[#6A6F73] dark:text-[#8FA893] hover:text-[#1F2225] dark:hover:text-[#EAF3E7]' />
                            <span className='text-[11px] font-medium text-[#6A6F73] dark:text-[#8FA893]'>{label}</span>
                        </button>
                    ))}
                </div>

                {/* Inventory panel */}
                {showInventory && (
                    <>
                        <div className='absolute inset-0 bg-black/20' onClick={() => setShowInventory(false)} />
                        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] max-w-[92vw] max-h-[90vh] overflow-auto bg-white dark:bg-[#14171A] border border-[#C9DDC4] dark:border-[#262E28] rounded-2xl p-5 shadow-2xl z-10'>
                            <div className='flex items-center justify-between mb-1'>
                                <span className='text-base font-medium'>Inventory</span>
                                <button onClick={() => setShowInventory(false)} aria-label='Close inventory' className='text-[#6A6F73] dark:text-[#8FA893] hover:text-[#1F2225] dark:hover:text-[#EAF3E7]'>
                                    <X size={16} />
                                </button>
                            </div>
                            <p className='text-[12px] text-[#6A6F73] dark:text-[#8FA893] mb-3'>{coins.toLocaleString()} coins</p>

                            <p className='text-[11px] font-bold tracking-wider text-[#6A6F73] dark:text-[#8FA893] mb-2'>BUILD MATERIALS</p>
                            <div className='grid grid-cols-4 gap-2 mb-4'>
                                {MATERIAL_FIELDS.map(f => (
                                    <div key={f.key} className='flex flex-col items-center justify-center rounded-xl bg-[#EEF6ED] dark:bg-[#1B211C] py-2.5'>
                                        <f.icon size={20} className='text-[#6A6F73] dark:text-[#8FA893]' />
                                        <span className='text-[12px] font-medium mt-1'>{resources[f.key] ?? 0}</span>
                                        <span className='text-[10px] text-[#6A6F73] dark:text-[#8FA893]'>{f.label}</span>
                                    </div>
                                ))}
                            </div>

                            <p className='text-[11px] font-bold tracking-wider text-[#6A6F73] dark:text-[#8FA893] mb-2'>CONSUMABLES</p>
                            <div className='space-y-2'>
                                {consumables.map(item => {
                                    const ItemIcon = item.icon
                                    return (
                                        <div key={item.name} className='flex items-center justify-between rounded-xl bg-[#EEF6ED] dark:bg-[#1B211C] px-3 py-2'>
                                            <div className='flex items-center gap-2 text-[13px]'>
                                                <ItemIcon size={17} className={item.iconColor} />
                                                {item.name}
                                            </div>
                                            <div className='flex items-center gap-2 text-[12px] text-[#6A6F73] dark:text-[#8FA893]'>
                                                <span>x{xpBoostCharges}</span>
                                                <button
                                                    onClick={handleUseXpBoost}
                                                    disabled={usingBoost || boostActive || xpBoostCharges <= 0}
                                                    className='rounded-full border border-[#C9DDC4] dark:border-[#262E28] px-2.5 py-1 text-[11px] hover:border-[#A9D8AE] hover:text-[#1F2225] dark:hover:text-[#EAF3E7] disabled:opacity-50 disabled:cursor-not-allowed'
                                                >
                                                    {boostActive ? 'Active' : usingBoost ? 'Using…' : 'Use'}
                                                </button>
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
                        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[92vw] max-h-[80vh] overflow-auto bg-white dark:bg-[#14171A] border border-[#C9DDC4] dark:border-[#262E28] rounded-2xl p-5 shadow-2xl z-10'>
                            <div className='flex items-center justify-between mb-3'>
                                <span className='text-base font-medium'>Your Builds</span>
                                <button onClick={() => setShowYourBuilds(false)} aria-label='Close your builds' className='text-[#6A6F73] dark:text-[#8FA893] hover:text-[#1F2225] dark:hover:text-[#EAF3E7]'>
                                    <X size={16} />
                                </button>
                            </div>

                            {unlockedBuildings.length === 0 && (
                                <p className='text-[12px] text-[#6A6F73] dark:text-[#8FA893]'>Nothing unlocked yet - build one from the Build menu.</p>
                            )}

                            <div className='space-y-2'>
                                {unlockedBuildings.map(b => {
                                    const display = BUILD_DISPLAY[b.build_id] ?? DEFAULT_BUILD_DISPLAY
                                    const Icon = display.icon
                                    return (
                                        <div key={b.build_id} className='flex items-center justify-between rounded-xl bg-[#EEF6ED] dark:bg-[#1B211C] px-3 py-2.5'>
                                            <div className='flex items-center gap-2.5 text-[13px] font-medium'>
                                                <span className='w-8 h-8 rounded-lg bg-white dark:bg-[#0E1210] flex items-center justify-center shrink-0'>
                                                    <Icon size={16} className={display.iconColor} />
                                                </span>
                                                {b.build_menu?.name ?? b.build_id}
                                            </div>
                                            <button
                                                onClick={() => handleUseBuilding(b)}
                                                disabled={placingId === b.build_id}
                                                className='rounded-full border border-[#C9DDC4] dark:border-[#262E28] bg-white dark:bg-[#0E1210] px-3 py-1.5 text-[11px] font-medium hover:border-[#A9D8AE] hover:text-[#1F2225] dark:hover:text-[#EAF3E7] disabled:opacity-60'
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

                {/* Bottom-right: Build menu - minimizes to a small icon so the
                    game world underneath stays visible when not needed. */}
                {!showBuildMenuPanel && (
                    <button
                        onClick={() => setShowBuildMenuPanel(true)}
                        aria-label='Expand build menu'
                        title='Build menu'
                        className='absolute bottom-4 right-4 w-12 h-12 rounded-2xl bg-white dark:bg-[#14171A] border border-[#C9DDC4] dark:border-[#262E28] shadow-2xl z-20 flex items-center justify-center text-[#6A6F73] dark:text-[#8FA893] hover:border-[#A9D8AE] hover:text-[#1F2225] dark:hover:text-[#EAF3E7] transition-colors'
                    >
                        <Blocks size={20} />
                    </button>
                )}
                {showBuildMenuPanel && (
                <div className='absolute bottom-4 right-4 w-[520px] max-w-[92vw] max-h-[88vh] overflow-auto bg-white dark:bg-[#14171A] border border-[#C9DDC4] dark:border-[#262E28] rounded-2xl p-5 shadow-2xl z-20'>
                    <div className='flex items-center justify-between mb-3'>
                        <span className='text-base font-medium'>Build menu</span>
                        <button
                            onClick={() => setShowBuildMenuPanel(false)}
                            aria-label='Minimize build menu'
                            title='Minimize'
                            className='w-6 h-6 flex items-center justify-center rounded-md text-[#6A6F73] dark:text-[#8FA893] hover:bg-[#DDF0E1] dark:hover:bg-[#1E2B20] hover:text-[#1F2225] dark:hover:text-[#EAF3E7] transition-colors'
                        >
                            <Minus size={14} />
                        </button>
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
                            <p className='col-span-2 text-[12px] text-[#6A6F73] dark:text-[#8FA893]'>No buildings available yet.</p>
                        )}
                    </div>
                </div>
                )}
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
        <div className='rounded-xl border border-[#C9DDC4] dark:border-[#262E28] p-2.5'>
            <div className='flex items-center gap-1.5 text-[13px] font-medium mb-1.5'>
                <ItemIcon size={16} className={display.iconColor} />
                {build.name}
            </div>
            <p className='text-[12px] text-[#6A6F73] dark:text-[#8FA893] mb-2'>{display.desc}</p>

            {!levelMet && (
                <div className='text-[12px] text-[#6A6F73] dark:text-[#8FA893]'>Reach level {build.unlock_level} to unlock this building.</div>
            )}

            {levelMet && unlocked && (
                <div className='flex items-center gap-1.5 text-[12px] font-medium text-[#3E7A42] dark:text-[#8FE0A0] bg-[#E1F0DF] dark:bg-[#1B2B1D] rounded-lg px-2.5 py-2'>
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

                    {message && <p className='text-[11px] text-[#6A6F73] dark:text-[#8FA893] mb-1.5'>{message}</p>}

                    {allMet ? (
                        <button
                            onClick={handleBuild}
                            disabled={busy}
                            className='w-full mt-2 text-[12px] py-1.5 rounded-full transition-colors border-2 border-[#A9D8AE] text-[#1F2225] dark:text-[#F2F5F0] hover:bg-[#DDF0E1] dark:hover:bg-[#1E2B20] disabled:opacity-60'
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
