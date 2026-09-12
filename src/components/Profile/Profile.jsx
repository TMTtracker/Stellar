import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Banknote, Trophy, Star, LogOut, Pencil, Award, BookOpen, Clock, Flame, Library } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useWallet } from '@/hooks/useWallet'
import { getMyProfile, getMyRecentRewards } from '@/services/wallet'
import { getMyEnrollments } from '@/services/courses'
import { levelProgress, xpForLevel } from '@/lib/economy'
import './Profile.css'

const AVATAR_OPTIONS = ['🧑‍🚀', '👩‍🎓', '🧑‍💻', '🦊', '🐱', '⭐', '🎓', '🌟', '🔥', '🚀', '🧠', '💎']
const STORAGE_AVATAR_KEY = 'stellar:avatar'

function getStoredAvatar() {
  try {
    return localStorage.getItem(STORAGE_AVATAR_KEY) || null
  } catch {
    return null 
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function kindLabel(kind) {
  switch (kind) {
    case 'lesson_complete': return 'Lesson completed'
    case 'quiz_pass': return 'Quiz passed'
    case 'spend': return 'Coins spent'
    case 'grant': return 'Reward granted'
    default: return kind || 'Activity'
  }
}

function kindIcon(kind) {
  switch (kind) {
    case 'lesson_complete': return BookOpen
    case 'quiz_pass': return Award
    case 'spend': return Banknote
    default: return Zap
  }
}

export default function Profile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { xp, coins, current, needed, pct, loading: walletLoading } = useWallet()

  const [profile, setProfile] = useState(null)
  const [rewards, setRewards] = useState([])
  const [enrolledCount, setEnrolledCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [avatar, setAvatar] = useState(() => getStoredAvatar() || '🧑‍🚀')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [p, r, enrollments] = await Promise.all([
        getMyProfile(),
        getMyRecentRewards(20),
        getMyEnrollments().catch(() => []),
      ])
      setProfile(p)
      setRewards(r ?? [])
      setEnrolledCount(Array.isArray(enrollments) ? enrollments.length : 0)
    } catch (e) {
      console.error('[profile] fetch failed:', e.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    let cancelled = false
    Promise.resolve()
      .then(() => {
        if (!cancelled) fetchData()
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [fetchData])

  const handleAvatarSelect = (emoji) => {
    setAvatar(emoji)
    try {
      localStorage.setItem(STORAGE_AVATAR_KEY, emoji)
    } catch {
      // ignore the errors
    }
    setShowAvatarPicker(false)
  }

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (e) {
      console.error('[profile] sign out failed:', e.message)
    }
  }

  // Derived stats - mirrors economy.js / dashboard consistency
  const progress = levelProgress(xp)
  const nextLevelXp = xpForLevel(progress.level + 1)
  const xpToNext = Math.max(0, nextLevelXp - xp)
  const memberSince = profile?.created_at ? formatDate(profile.created_at) : user?.created_at ? formatDate(user.created_at) : '—'
  const email = user?.email || profile?.user_id || '—'

  // Guest / signed out state
  if (!user) {
    return (
      <section id="profile" className="profile-section">
        <div className="profile-container">
          <div className="profile-guest">
            <div style={{ fontSize: 36, marginBottom: 12 }}>👋</div>
            <h3>Your profile awaits</h3>
            <p>Sign in to see your level, coins, XP history and customize your Stellar identity.</p>
            <button className="profile-guest-btn" onClick={() => navigate('/')}>Go to Home</button>
          </div>
        </div>
      </section>
    )
  }

  if (loading || walletLoading) {
    return (
      <section id="profile" className="profile-section">
        <div className="profile-container">
          <div className="profile-card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: '#6A6F73', fontSize: 13 }}>Loading your Stellar profile…</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="profile" className="profile-section">
      <div className="profile-container">
        {/* Hero */}
        <div className="profile-hero">
          <div className="profile-hero-avatar-wrap">
            <div className="profile-hero-avatar">{avatar}</div>
            <button
              className="profile-avatar-edit"
              aria-label="Change avatar"
              onClick={() => setShowAvatarPicker(v => !v)}
            >
              <Pencil size={12} />
            </button>
          </div>

          <div className="profile-hero-info">
            <h2>
              {profile?.display_name || 'Stellar Cadet'}
              <small>Lv {progress.level}</small>
            </h2>
            <p className="profile-hero-email">{email}</p>
            <div className="profile-level-row">
              <span className="profile-level-pill">Level {progress.level}</span>
              <div className="profile-progress-wrap">
                <div className="profile-progress-bar">
                  <div className="profile-progress-fill" style={{ width: `${progress.pct}%` }} />
                </div>
                <span className="profile-progress-text">
                  {progress.current} / {progress.needed} XP to Lv {progress.level + 1} • {xpToNext} XP to go
                </span>
              </div>
            </div>
          </div>

          <div className="profile-hero-actions">
            <div className="profile-coins-badge">
              <Banknote size={16} style={{ color: '#E8933E' }} />
              {coins.toLocaleString()} coins
            </div>
            <div className="profile-coins-badge" style={{ background: 'white' }}>
              <Zap size={16} style={{ color: '#A8D79F' }} />
              {xp.toLocaleString()} XP
            </div>
            <button className="profile-logout-btn" onClick={handleLogout}>
              <LogOut size={14} />
              Log out
            </button>
          </div>
        </div>

        {showAvatarPicker && (
          <div className="profile-card">
            <h3>Choose your avatar</h3>
            <div className="profile-avatar-grid">
              {AVATAR_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  className={`profile-avatar-option ${avatar === emoji ? 'active' : ''}`}
                  onClick={() => handleAvatarSelect(emoji)}
                  aria-label={`Select avatar ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main grid */}
        <div className="profile-grid">
          {/* Left column: stats + details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="profile-card">
              <h3>
                Stats overview
                <span>{rewards.length} activities</span>
              </h3>
              <div className="profile-stats-grid">
                <div className="profile-stat">
                  <div className="profile-stat-icon"><Trophy size={18} /></div>
                  <strong>{progress.level}</strong>
                  <span>Level</span>
                </div>
                <div className="profile-stat">
                  <div className="profile-stat-icon"><Zap size={18} /></div>
                  <strong>{xp.toLocaleString()}</strong>
                  <span>Total XP</span>
                </div>
                <div className="profile-stat">
                  <div className="profile-stat-icon"><Banknote size={18} /></div>
                  <strong>{coins.toLocaleString()}</strong>
                  <span>Coins</span>
                </div>
                <div className="profile-stat">
                  <div className="profile-stat-icon"><Star size={18} fill="#F6C445" color="#F6C445" /></div>
                  <strong>{pct}%</strong>
                  <span>Progress</span>
                </div>
                <div className="profile-stat">
                  <div className="profile-stat-icon"><Flame size={18} color="#E8933E" /></div>
                  <strong>9</strong>
                  <span>Day streak</span>
                </div>
                <div className="profile-stat">
                  <div className="profile-stat-icon"><Library size={18} /></div>
                  <strong>{enrolledCount}</strong>
                  <span>Courses enrolled</span>
                </div>
                <div className="profile-stat">
                  <div className="profile-stat-icon"><Clock size={18} /></div>
                  <strong>{memberSince}</strong>
                  <span>Member since</span>
                </div>
              </div>
            </div>

            <div className="profile-card">
              <h3>Account details</h3>
              <div className="profile-detail-row">
                <span>Display name</span>
                <span>{profile?.display_name || '—'}</span>
              </div>
              <div className="profile-detail-row">
                <span>Email</span>
                <span style={{ fontSize: 12, wordBreak: 'break-all' }}>{email}</span>
              </div>
              <div className="profile-detail-row">
                <span>User ID</span>
                <span style={{ fontSize: 10, color: '#6A6F73', fontFamily: 'monospace' }}>{profile?.user_id?.slice(0, 8)}…</span>
              </div>
              <div className="profile-detail-row">
                <span>Level formula</span>
                <span style={{ fontSize: 11, color: '#6A6F73' }}>{current}/{needed} XP</span>
              </div>
            </div>
          </div>

          {/* Right column: history */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="profile-card">
              <h3>
                Recent XP history
                <span>{xp} XP total</span>
              </h3>
              {rewards.length === 0 ? (
                <div className="profile-empty">
                  No activity yet. Complete a lesson or pass a quiz to earn XP &amp; coins — they&apos;ll appear here.
                </div>
              ) : (
                <div className="profile-history-list">
                  {rewards.map(item => {
                    const Icon = kindIcon(item.kind)
                    const isPositive = (item.coins ?? 0) >= 0 && (item.xp ?? 0) >= 0
                    return (
                      <div key={item.id} className="profile-history-item">
                        <div className="profile-history-icon">
                          <Icon size={16} style={{ color: isPositive ? '#A8D79F' : '#E05252' }} />
                        </div>
                        <div className="profile-history-info">
                          <strong>{kindLabel(item.kind)}</strong>
                          <small>{formatDate(item.created_at)}{item.note ? ` • ${item.note}` : ''}</small>
                        </div>
                        <div className="profile-history-reward">
                          {item.xp !== 0 && <span className="xp">+{item.xp} XP</span>}
                          {item.coins !== 0 && <span className="coins">{item.coins > 0 ? '+' : ''}{item.coins} coins</span>}
                          {item.xp === 0 && item.coins === 0 && <span style={{ fontSize: 11, color: '#6A6F73' }}>—</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
