import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { X, Check, BrickWall, TreeDeciduous, Gem, Mountain, Pickaxe, Beaker, Lightbulb, Feather, Star } from 'lucide-react'
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

/**
 * Preview + confirm for the next base level - a small static-camera canvas
 * (no OrbitControls, transparent background) showing the actual upgraded
 * model, a checklist of what's still missing, and an "Upgrade Now" button
 * that only appears once every requirement is met.
 */
function UpgradeBaseModal({ levelInfo, modelUrl, resources, accountLevel, onClose, onUpgraded }) {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    const levelMet = accountLevel >= (levelInfo.unlock_level ?? 1)
    const requirements = MATERIAL_FIELDS
        .map(f => ({ ...f, required: levelInfo[f.required] ?? 0, have: resources[f.key] ?? 0 }))
        .filter(f => f.required > 0)
    const materialsMet = requirements.every(f => f.have >= f.required)
    const allMet = levelMet && materialsMet

    async function handleUpgrade() {
        setBusy(true)
        setError('')
        try {
            const res = await upgradeBase()
            if (res?.ok) {
                onUpgraded?.()
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

                <h2 className='text-lg font-bold text-[#1F2225] dark:text-[#F2F5F0] pr-8'>{levelInfo.name}</h2>
                <p className='text-xs text-[#6A6F73] dark:text-[#8FA893] mt-1 mb-4'>Here's what your base will look like once upgraded.</p>

                <div className='h-52 rounded-xl bg-[#EFF6ED] dark:bg-[#0E1210] overflow-hidden mb-5'>
                    <Canvas
                        orthographic
                        camera={{ position: [7, 5.5, 7], zoom: 20, near: 0.1, far: 100 }}
                        gl={{ alpha: true }}
                        onCreated={({ camera }) => camera.lookAt(0, 1.5, 0)}
                    >
                        <ambientLight intensity={1.5} />
                        <directionalLight position={[5, 8, 3]} intensity={1.6} />
                        <directionalLight position={[-4, 3, -3]} intensity={0.5} />
                        <Suspense fallback={null}>
                            {modelUrl && <BuildingModel modelUrl={modelUrl} />}
                        </Suspense>
                    </Canvas>
                </div>

                <div className='space-y-2 mb-4'>
                    <div className={`flex items-center justify-between text-sm rounded-lg px-3 py-2 ${levelMet ? 'bg-[#E1F0DF] dark:bg-[#1B2B1D] text-[#3E7A42] dark:text-[#8FE0A0]' : 'bg-[#FBF1ED] dark:bg-[#2A1716] text-[#C4634F]'}`}>
                        <span className='flex items-center gap-2'><Star size={14} /> Account level {levelInfo.unlock_level}</span>
                        <span className='font-semibold'>{levelMet ? <Check size={14} /> : `Lv ${accountLevel}/${levelInfo.unlock_level}`}</span>
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

                {allMet ? (
                    <button
                        onClick={handleUpgrade}
                        disabled={busy}
                        className='w-full py-2.5 rounded-xl font-semibold text-sm bg-[#A9D8AE] text-white hover:bg-[#96CC9C] disabled:opacity-60'
                    >
                        {busy ? 'Upgrading…' : 'Upgrade Now'}
                    </button>
                ) : (
                    <p className='text-xs text-center text-[#6A6F73] dark:text-[#8FA893]'>
                        {levelMet ? 'Gather the materials above to unlock this upgrade.' : `Reach account level ${levelInfo.unlock_level} to unlock this upgrade.`}
                    </p>
                )}
            </div>
        </div>
    )
}

export default UpgradeBaseModal
