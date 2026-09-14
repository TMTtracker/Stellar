import { useState, useEffect, useCallback } from 'react'

export const STORAGE_AVATAR_KEY = 'stellar:avatar'
export const AVATAR_UPDATED_EVENT = 'stellar:avatar-updated'

export function getStoredAvatar() {
  try {
    return localStorage.getItem(STORAGE_AVATAR_KEY) || null
  } catch {
    return null
  }
}

export function isImageAvatar(value) {
  if (!value) return false
  return (
    value.startsWith('data:image/') ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('blob:')
  )
}

export function useAvatar() {
  const [avatar, setAvatarState] = useState(() => getStoredAvatar() || '🧑‍🚀')

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_AVATAR_KEY) {
        setAvatarState(e.newValue || '🧑‍🚀')
      }
    }
    const onCustom = (e) => {
      const next = e.detail ?? getStoredAvatar() ?? '🧑‍🚀'
      setAvatarState(next)
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(AVATAR_UPDATED_EVENT, onCustom)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(AVATAR_UPDATED_EVENT, onCustom)
    }
  }, [])

  const setAvatar = useCallback((value) => {
    try {
      localStorage.setItem(STORAGE_AVATAR_KEY, value)
    } catch {
      // ignore quota errors
    }
    setAvatarState(value)
    window.dispatchEvent(new CustomEvent(AVATAR_UPDATED_EVENT, { detail: value }))
  }, [])

  return { avatar, setAvatar, isImage: isImageAvatar(avatar) }
}
