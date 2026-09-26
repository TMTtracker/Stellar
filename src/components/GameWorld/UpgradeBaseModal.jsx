import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { X, Check, ChevronLeft, ChevronRight, BrickWall, TreeDeciduous, Gem, Mountain, Pickaxe, Beaker, Lightbulb, Feather, Star } from 'lucide-react'
import Camp from '../HeroModel/Camp'
import BuildingModel from './BuildingModel'
import { upgradeBase } from '@/services/base'

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

// Hardcoded to match however many base levels actually have a model
// uploaded so far - bump this the next time a new SM_House_level_N.glb
// (and its base_levels catalog row) is added.
const MAX_LEVEL = 3

/**
 * Preview + confirm for base levels 1-MAX_LEVEL, browsable with the same
 * arrows/dots pattern as the landing page's intro carousel. Levels already
 * reached show "Already Acquired"; the one immediately above your current
 * level shows its requirements and an "Upgrade Now" button once they're all
 * met; anything further out shows its requirements too (so you know what's
 * coming) but is gated behind upgrading the levels in between first.
 */
function UpgradeBaseModal({ currentBaseLevel, baseLevels, modelUrls, resources, accountLevel, onClose }) {
    const [step, setStep] = useState(() => Math.min(Math.max((currentBaseLevel ?? 1) + 1, 1), MAX_LEVEL))
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    const isCamp = step === 1
    const catalogRow = isCamp ? null : baseLevels.find(l => l.level === step)
    const modelUrl = isCamp ? null : modelUrls[step]
    const configured = isCamp || !!catalogRow
    const name = isCamp ? 'Level 1 Base' : (catalogRow?.name ?? `Level ${step} Base`)
    const unlockLevel = isCamp ? 1 : (catalogRow?.unlock_level ?? 1)

    const requirements = catalogRow
        ? MATERIAL_FIELDS
            .map(f => ({ ...f, required: catalogRow[f.required] ?? 0, have: resources[f.key] ?? 0 }))
            .filter(f => f.required > 0)
        : []

    const acquired = (currentBaseLevel ?? 1) >= step
    const isNext = step === (currentBaseLevel ?? 1) + 1 && configured
    const levelMet = accountLevel >= unlockLevel
    const materialsMet = requirements.every(f => f.have >= f.required)
    const allMet = levelMet && materialsMet

    async function handleUpgrade() {
        setBusy(true)
        setError('')
        try {
            const res = await upgradeBase()
            if (res?.ok) {
                onClose()
            } else {
                setError(res?.error === 'insufficient_materials' ? "You don't have enough materials anymore." : (res?.error ?? 'Upgrade failed.'))
            }
        } catch (e) {
            setError(e.message ?? 'Upgrade failed.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div
            className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm'
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className='relative w-full max-w-md bg-white dark:bg-[#14171A] rounded-2xl shadow-2xl p-6'>
                <button
                    onClick={onClose}
                    aria-label='Close'
                    className='absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[#6A6F73] dark:text-[#8FA893] hover:bg-[#EFF3EE] dark:hover:bg-[#1B211C]'
                >
                    <X size={16} />
                </button>

                <h2 className='text-lg font-bold text-[#1F2225] dark:text-[#F2F5F0] pr-8'>{name}</h2>
                <p className='text-xs text-[#6A6F73] dark:text-[#8FA893] mt-1 mb-4'>
                    {acquired ? 'You already own this base.' : "Here's what your base will look like once upgraded."}
                </p>

                <div className='relative h-52 rounded-xl bg-[#EFF6ED] dark:bg-[#0E1210] overflow-hidden mb-3'>
                    <button
                        aria-label='Previous level'
                        disabled={step <= 1}
                        onClick={() => setStep(s => Math.max(1, s - 1))}
                        className='absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 dark:bg-[#14171A]/90 border border-[#C9DDC4] dark:border-[#262E28] flex items-center justify-center text-[#6A6F73] dark:text-[#8FA893] hover:text-[#1F2225] dark:hover:text-[#EAF3E7] disabled:opacity-0 disabled:pointer-events-none transition-opacity'
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        aria-label='Next level'
                        disabled={step >= MAX_LEVEL}
                        onClick={() => setStep(s => Math.min(MAX_LEVEL, s + 1))}
                        className='absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 dark:bg-[#14171A]/90 border border-[#C9DDC4] dark:border-[#262E28] flex items-center justify-center text-[#6A6F73] dark:text-[#8FA893] hover:text-[#1F2225] dark:hover:text-[#EAF3E7] disabled:opacity-0 disabled:pointer-events-none transition-opacity'
                    >
                        <ChevronRight size={16} />
                    </button>

                    <Canvas
                        key={step}
                        orthographic
                        camera={{ position: [7, 5.5, 7], zoom: 20, near: 0.1, far: 100 }}
                        gl={{ alpha: true }}
                        onCreated={({ camera }) => camera.lookAt(0, 1.5, 0)}
                    >
                        <ambientLight intensity={1.5} />
                        <directionalLight position={[5, 8, 3]} intensity={1.6} />
                        <directionalLight position={[-4, 3, -3]} intensity={0.5} />
                        <Suspense fallback={null}>
                            {isCamp ? <Camp /> : (modelUrl && <BuildingModel modelUrl={modelUrl} />)}
                        </Suspense>
                    </Canvas>
                </div>

                <div className='flex items-center justify-center gap-1.5 mb-4'>
                    {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map(l => (
                        <button
                            key={l}
                            aria-label={`Go to level ${l}`}
                            onClick={() => setStep(l)}
                            className={`h-1.5 rounded-full transition-all ${l === step ? 'w-5 bg-[#A9D8AE]' : 'w-1.5 bg-[#E1EFDD] dark:bg-[#262E28]'}`}
                        />
                    ))}
                </div>

                {!configured ? (
                    <p className='text-xs text-center text-[#6A6F73] dark:text-[#8FA893]'>This level isn't available yet — check back soon.</p>
                ) : acquired ? (
                    <div className='flex items-center justify-center gap-2 text-sm font-semibold rounded-lg px-3 py-2.5 bg-[#E1F0DF] dark:bg-[#1B2B1D] text-[#3E7A42] dark:text-[#8FE0A0]'>
                        <Check size={15} /> Already acquired
                    </div>
                ) : (
                    <>
                        <div className='space-y-2 mb-4'>
                            <div className={`flex items-center justify-between text-sm rounded-lg px-3 py-2 ${levelMet ? 'bg-[#E1F0DF] dark:bg-[#1B2B1D] text-[#3E7A42] dark:text-[#8FE0A0]' : 'bg-[#FBF1ED] dark:bg-[#2A1716] text-[#C4634F]'}`}>
                                <span className='flex items-center gap-2'><Star size={14} /> Account level {unlockLevel}</span>
                                <span className='font-semibold'>{levelMet ? <Check size={14} /> : `Lv ${accountLevel}/${unlockLevel}`}</span>
                            </div>
                            {requirements.map(f => {
                                const met = f.have >= f.required
                                const Icon = f.icon
                                return (
                                    <div key={f.key} className={`flex items-center justify-between text-sm rounded-lg px-3 py-2 ${met ? 'bg-[#E1F0DF] dark:bg-[#1B2B1D] text-[#3E7A42] dark:text-[#8FE0A0]' : 'bg-[#FBF1ED] dark:bg-[#2A1716] text-[#C4634F]'}`}>
                                        <span className='flex items-center gap-2'><Icon size={14} /> {f.label}</span>
                                        <span className='font-semibold'>{met ? <Check size={14} /> : `${f.have}/${f.required}`}</span>
                                    </div>
                                )
                            })}
                        </div>

                        {error && <p className='text-xs text-[#C4634F] mb-3'>{error}</p>}

                        {isNext && allMet ? (
                            <button
                                onClick={handleUpgrade}
                                disabled={busy}
                                className='w-full py-2.5 rounded-xl font-semibold text-sm bg-[#A9D8AE] text-white hover:bg-[#96CC9C] disabled:opacity-60'
                            >
                                {busy ? 'Upgrading…' : 'Upgrade Now'}
                            </button>
                        ) : isNext ? (
                            <p className='text-xs text-center text-[#6A6F73] dark:text-[#8FA893]'>
                                {levelMet ? 'Gather the materials above to unlock this upgrade.' : `Reach account level ${unlockLevel} to unlock this upgrade.`}
                            </p>
                        ) : (
                            <p className='text-xs text-center text-[#6A6F73] dark:text-[#8FA893]'>
                                Upgrade to Level {(currentBaseLevel ?? 1) + 1} first to work your way up to this one.
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export default UpgradeBaseModal
