import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Banknote, Trophy, Star, Pencil, Award, BookOpen, Flame, Library, X, Mail, Lock, User as UserIcon, Image as ImageIcon, Save } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useWallet } from '@/hooks/useWallet'
import { getMyProfile, getMyRecentRewards } from '@/services/wallet'
import { getMyEnrollments } from '@/services/courses'
import { levelProgress, xpForLevel } from '@/lib/economy'
import { supabase } from '@/services/supabaseClient'
import { useAvatar, isImageAvatar } from '@/hooks/useAvatar'
import './Profile.css'

const AVATAR_OPTIONS = ['🧑‍🚀', '👩‍🎓', '🧑‍💻', '🦊', '🐱', '⭐', '🎓', '🌟', '🔥', '🚀', '🧠', '💎']

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
  const { user } = useAuth()
  const navigate = useNavigate()
  const { xp, coins, current, needed, pct, loading: walletLoading } = useWallet()

  const [profile, setProfile] = useState(null)
  const [rewards, setRewards] = useState([])
  const [enrolledCount, setEnrolledCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const { avatar, setAvatar } = useAvatar()

  // Edit profile modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [draftAvatar, setDraftAvatar] = useState(avatar)
  const [draftName, setDraftName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [editMsg, setEditMsg] = useState(null)
  const fileInputRef = useRef(null)

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

  const openEditModal = useCallback(() => {
    setDraftAvatar(avatar)
    setDraftName(profile?.display_name || '')
    setNewPassword('')
    setConfirmPassword('')
    setEditMsg(null)
    setShowEditModal(true)
  }, [avatar, profile?.display_name])

  const closeEditModal = useCallback(() => {
    if (saving) return
    setShowEditModal(false)
  }, [saving])

  // Close on Escape
  useEffect(() => {
    if (!showEditModal) return
    const onKey = (e) => { if (e.key === 'Escape') closeEditModal() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showEditModal, closeEditModal])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setEditMsg({ type: 'error', text: 'Please select an image file.' })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setEditMsg({ type: 'error', text: 'Image must be smaller than 2 MB.' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') setDraftAvatar(result)
    }
    reader.onerror = () => setEditMsg({ type: 'error', text: 'Failed to read image.' })
    reader.readAsDataURL(file)
    // reset input so same file can be re-selected
    e.target.value = ''
  }

  const handleSave = async () => {
    setEditMsg(null)

    const trimmedName = draftName.trim()

    if (!trimmedName) {
      setEditMsg({ type: 'error', text: 'Display name cannot be empty.' })
      return
    }
    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) {
        setEditMsg({ type: 'error', text: 'Password must be at least 6 characters.' })
        return
      }
      if (newPassword !== confirmPassword) {
        setEditMsg({ type: 'error', text: 'Passwords do not match.' })
        return
      }
    }

    setSaving(true)
    try {
      // 1) Avatar / profile pic — stored locally (no avatar column in DB), synced to top-right icon via useAvatar
      if (draftAvatar !== avatar) {
        setAvatar(draftAvatar)
      }

      // 2) Display name — profiles table
      if (trimmedName !== (profile?.display_name || '')) {
        const { error } = await supabase
          .from('profiles')
          .update({ display_name: trimmedName, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
        if (error) throw error
        setProfile((prev) => (prev ? { ...prev, display_name: trimmedName } : prev))
      }

      let pwdChanged = false

      // 3) Password — supabase auth
      if (newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) throw error
        pwdChanged = true
      }

      const msg = pwdChanged ? 'Password updated successfully.' : 'Profile updated successfully.'

      setEditMsg({ type: 'success', text: msg })
      setTimeout(() => {
        setShowEditModal(false)
        setNewPassword('')
        setConfirmPassword('')
      }, 900)
    } catch (e) {
      setEditMsg({ type: 'error', text: e.message || 'Update failed. Please try again.' })
    } finally {
      setSaving(false)
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
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Loading your Stellar profile…</p>
          </div>
        </div>
      </section>
    )
  }

  const avatarIsImage = isImageAvatar(avatar)
  const draftAvatarIsImage = isImageAvatar(draftAvatar)

  return (
    <section id="profile" className="profile-section">
      <div className="profile-container">
        {/* Hero */}
        <div className="profile-hero">
          <div className="profile-hero-avatar-wrap">
            <div className="profile-hero-avatar">
              {avatarIsImage ? <img src={avatar} alt="Profile avatar" className="profile-hero-avatar-img" /> : avatar}
            </div>
            <button
              className="profile-avatar-edit"
              aria-label="Edit profile"
              onClick={openEditModal}
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
            <div className="profile-coins-badge profile-coins-badge--alt">
              <Zap size={16} style={{ color: '#A8D79F' }} />
              {xp.toLocaleString()} XP
            </div>
          </div>
        </div>

        {/* Edit profile modal */}
        {showEditModal && (
          <div
            className="profile-edit-overlay"
            onMouseDown={(e) => { if (e.target === e.currentTarget) closeEditModal() }}
          >
            <div className="profile-edit-modal" role="dialog" aria-modal="true" aria-label="Edit profile">
              <button className="profile-edit-close" onClick={closeEditModal} aria-label="Close edit profile">
                <X size={18} />
              </button>

              <h3 className="profile-edit-title">Edit profile</h3>
              <p className="profile-edit-subtitle">Update your avatar, display name, email and password.</p>

              {/* Avatar / Profile pic */}
              <div className="profile-edit-section">
                <label className="profile-edit-label">
                  <ImageIcon size={14} /> Avatar / Profile picture
                </label>
                <div className="profile-edit-avatar-row">
                  <div className="profile-edit-avatar-preview">
                    {draftAvatarIsImage ? <img src={draftAvatar} alt="Preview" /> : <span>{draftAvatar}</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="profile-edit-hint">Choose an emoji below or upload a photo. Uploaded images are stored locally on this device.</div>
                    <button type="button" className="profile-edit-upload-btn" onClick={() => fileInputRef.current?.click()}>
                      <ImageIcon size={14} /> Upload photo
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
                  </div>
                </div>
                <div className="profile-avatar-grid">
                  {AVATAR_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      className={`profile-avatar-option ${draftAvatar === emoji ? 'active' : ''}`}
                      onClick={() => setDraftAvatar(emoji)}
                      aria-label={`Select avatar ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fields */}
              <div className="profile-edit-section">
                <div className="profile-edit-field">
                  <label><UserIcon size={12} /> Display name</label>
                  <div className="profile-edit-input-wrap">
                    <UserIcon size={16} className="profile-edit-input-icon" />
                    <input
                      className="profile-edit-input has-icon"
                      type="text"
                      placeholder="Stellar Cadet"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      maxLength={32}
                    />
                  </div>
                </div>

                <div className="profile-edit-field">
                  <label><Mail size={12} /> Email</label>
                  <div className="profile-edit-input-wrap">
                    <Mail size={16} className="profile-edit-input-icon" />
                    <input
                      className="profile-edit-input has-icon"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      autoComplete="email"
                    />
                  </div>
                  <span className="profile-edit-hint">Email cannot be changed.</span>
                </div>

                <div className="profile-edit-field">
                  <label><Lock size={12} /> New password</label>
                  <div className="profile-edit-input-wrap">
                    <Lock size={16} className="profile-edit-input-icon" />
                    <input
                      className="profile-edit-input has-icon"
                      type="password"
                      placeholder="Leave blank to keep current"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="profile-edit-field">
                  <label><Lock size={12} /> Confirm new password</label>
                  <div className="profile-edit-input-wrap">
                    <Lock size={16} className="profile-edit-input-icon" />
                    <input
                      className="profile-edit-input has-icon"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>

              {editMsg && <div className={`profile-message ${editMsg.type}`}>{editMsg.text}</div>}

              <div className="profile-edit-actions">
                <button type="button" className="profile-cancel-btn" onClick={closeEditModal} disabled={saving}>Cancel</button>
                <button type="button" className="profile-save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : <><Save size={14} /> Save changes</>}
                </button>
              </div>
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
                <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>{profile?.user_id?.slice(0, 8)}…</span>
              </div>
              <div className="profile-detail-row">
                <span>Level formula</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{current}/{needed} XP</span>
              </div>
              <div className="profile-detail-row">
                <span>Member since</span>
                <span>{memberSince}</span>
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
                          {item.xp === 0 && item.coins === 0 && <span style={{ fontSize: 11, color: 'var(--muted)' }}>—</span>}
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
