import { useCallback, useEffect, useState } from 'react'
import { Search, MessageSquare, Heart, Send, Users, TrendingUp, MoreHorizontal } from 'lucide-react'
import ProtectedLayout from '@/components/ProtectedLayout/ProtectedLayout'
import { useAuth } from '@/hooks/useAuth'
import { useWallet } from '@/hooks/useWallet'
import { listPosts, createPost, uploadPostImage, getMyLikedPostIds, getAllMyLikedPostIds, toggleLike, listComments, createComment } from '@/services/communityPosts'
import { getTopProfiles, getRecentProfiles, getProfilesCount } from '@/services/wallet'
import { WALLET_EVENT } from '@/services/events'
import { supabase } from '@/services/supabaseClient'
import { levelForXp, levelProgress } from '@/lib/economy'
import { formatRelativeTime } from '@/lib/utils'
import NewPostModal from './NewPostModal'

const LEADERBOARD_LIMIT = 5
const LEADERBOARD_COLORS = ['bg-[#141814]', 'bg-[#A9D8AE]', 'bg-[#B9D1E5]', 'bg-[#E8933E]', 'bg-[#6A6F73]']
const ONLINE_LIMIT = 5
const ONLINE_COLORS = ['bg-[#141814]', 'bg-[#A9D8AE]', 'bg-[#B9D1E5]', 'bg-[#E8933E]', 'bg-[#6A6F73]']

const initialThreads = [
    {
        author: 'Aisha R.',
        role: 'Chapter 3 Scholar',
        time: '2h',
        title: 'Best way to remember the key concepts in Chapter 3?',
        body: 'I keep mixing up "supporting details" and the "main idea". Anyone got a trick that worked for you?',
        likes: 12,
        comments: 7,
        tag: 'Study Help'
    },
    {
        author: 'Deniz K.',
        role: 'Level 4 Builder',
        time: '5h',
        title: 'Just unlocked the whole Meadow Grove 🎉',
        body: 'After finishing all the Algebra lessons my world completely transformed. Study really does make it grow.',
        likes: 34,
        comments: 15,
        tag: 'Milestone'
    },
    {
        author: 'Prof. Nafi',
        role: 'Instructor',
        time: '1d',
        title: 'Weekly Challenge: 7-day reading streak starts Monday',
        body: 'Complete one reading lesson a day this week to earn the Seasoned Reader badge and 200 bonus coins.',
        likes: 48,
        comments: 22,
        tag: 'Event'
    }
]

const tags = ['All', 'Study Help', 'Milestone', 'Event', 'Questions']

export default function Communities() {
    const { user } = useAuth()
    const { level } = useWallet()
    const [posts, setPosts] = useState([])
    const [showNewPost, setShowNewPost] = useState(false)
    const [showNewPostWithImage, setShowNewPostWithImage] = useState(false)
    const [activeTag, setActiveTag] = useState('All')
    const [search, setSearch] = useState('')
    const [leaderboardMembers, setLeaderboardMembers] = useState([])
    const [leaderboardLoading, setLeaderboardLoading] = useState(true)
    const [leaderboardError, setLeaderboardError] = useState('')
    const [onlineUsers, setOnlineUsers] = useState([])
    const [onlineCount, setOnlineCount] = useState(0)
    const [onlineLoading, setOnlineLoading] = useState(true)
    const [onlineError, setOnlineError] = useState('')
    const [likedIds, setLikedIds] = useState(() => new Set())
    const [likingIds, setLikingIds] = useState(() => new Set())
    const [expandedComments, setExpandedComments] = useState(() => new Set())
    const [commentsByPost, setCommentsByPost] = useState({}) // postId -> { list: [], loading: bool, error: '' }
    const [drafts, setDrafts] = useState({}) // postId -> text
    const [submittingComment, setSubmittingComment] = useState(() => new Set())
    const [localPlaceholderLikes, setLocalPlaceholderLikes] = useState({}) // title -> { likes, liked }
    const [localPlaceholderComments, setLocalPlaceholderComments] = useState({}) // title -> [{body}]

    const displayName = user?.user_metadata?.full_name || user?.email || 'Stellar Cadet'

    useEffect(() => {
        let cancelled = false
        listPosts().then(rows => {
            if (!cancelled) setPosts(rows)
        })
        return () => {
            cancelled = true
        }
    }, [])

    // Fetch my likes whenever posts change
    useEffect(() => {
        if (!posts.length) return
        const ids = posts.map(p => p.id).filter(Boolean)
        if (!ids.length) return
        let cancelled = false
        getMyLikedPostIds(ids).then(set => {
            if (!cancelled) setLikedIds(set)
        }).catch(() => {})
        return () => { cancelled = true }
    }, [posts])

    // Real-time: keep posts likes/comments in sync via postgres_changes
    useEffect(() => {
        let channel = null
        try {
            channel = supabase
                .channel('community-posts-realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'user_posts' }, (payload) => {
                    if (payload.eventType === 'UPDATE' && payload.new?.id) {
                        setPosts(prev => prev.map(p => p.id === payload.new.id ? { ...p, post_likes: payload.new.post_likes, post_comments: payload.new.post_comments } : p))
                    } else if (payload.eventType === 'INSERT' && payload.new?.id) {
                        // New post from other user: prepend if not already present
                        setPosts(prev => prev.some(p => p.id === payload.new.id) ? prev : [payload.new, ...prev])
                    }
                })
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_comments' }, (payload) => {
                    const cid = payload.new?.post_id
                    if (!cid) return
                    // Increment count optimistically already handled by trigger; also if comment list open, append
                    setCommentsByPost(prev => {
                        const entry = prev[cid]
                        if (!entry || !expandedComments.has(cid)) return prev
                        // Avoid duplicate if already have this comment id
                        if (entry.list?.some(c => c.id === payload.new.id)) return prev
                        const newComment = {
                            id: payload.new.id,
                            body: payload.new.body,
                            created_at: payload.new.created_at,
                            user_id: payload.new.user_id,
                            display_name: 'Someone',
                        }
                        return { ...prev, [cid]: { ...entry, list: [...entry.list, newComment] } }
                    })
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, () => {
                    // Likes count already synced via user_posts UPDATE trigger; refresh liked set for current user
                    getAllMyLikedPostIds().then(set => setLikedIds(set)).catch(() => {})
                })
                .subscribe()
        } catch (_e) {}
        return () => { if (channel) supabase.removeChannel(channel) }
    }, [expandedComments])

    const fetchLeaderboard = useCallback(async () => {
        try {
            setLeaderboardError('')
            const rows = await getTopProfiles(LEADERBOARD_LIMIT)
            if (!rows?.length) {
                setLeaderboardMembers([])
                return
            }
            const mapped = rows.map((p, i) => ({
                user_id: p.user_id,
                name: p.display_name || 'Stellar Cadet',
                xp: p.xp_total ?? 0,
                level: levelForXp(p.xp_total ?? 0),
                rank: i + 1,
                color: LEADERBOARD_COLORS[i % LEADERBOARD_COLORS.length],
            }))
            setLeaderboardMembers(mapped)
        } catch (e) {
            setLeaderboardError(e.message ?? 'Failed to load leaderboard')
        } finally {
            setLeaderboardLoading(false)
        }
    }, [])

    const fetchOnlineNow = useCallback(async () => {
        try {
            setOnlineError('')
            const [recent, count] = await Promise.all([
                getRecentProfiles(ONLINE_LIMIT),
                getProfilesCount(),
            ])
            const mapped = (recent ?? []).map((p, i) => ({
                user_id: p.user_id,
                name: p.display_name || 'Stellar Cadet',
                initials: (p.display_name || 'S').slice(0, 1).toUpperCase(),
                color: ONLINE_COLORS[i % ONLINE_COLORS.length],
            }))
            setOnlineUsers(mapped)
            setOnlineCount(count ?? mapped.length)
        } catch (e) {
            setOnlineError(e.message ?? 'Failed to load online users')
        } finally {
            setOnlineLoading(false)
        }
    }, [])

    useEffect(() => {
        let cancelled = false
        fetchLeaderboard()
        fetchOnlineNow()
        const onWalletChanged = () => {
            if (!cancelled) {
                fetchLeaderboard()
                fetchOnlineNow()
            }
        }
        window.addEventListener(WALLET_EVENT, onWalletChanged)

        // Poll every 30s for real-time freshness
        const interval = setInterval(() => {
            if (!cancelled) {
                fetchLeaderboard()
                fetchOnlineNow()
            }
        }, 30000)

        // Realtime subscriptions for profiles changes (xp / presence updates)
        let lbChannel = null
        let onlineChannel = null
        let presenceChannel = null
        try {
            lbChannel = supabase
                .channel('community-weekly-leaderboard')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                    if (!cancelled) fetchLeaderboard()
                })
                .subscribe()
            onlineChannel = supabase
                .channel('community-online-now')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                    if (!cancelled) fetchOnlineNow()
                })
                .subscribe()

            // Supabase Presence for true real-time online count
            const presenceKey = user?.id || `anon-${Math.random().toString(36).slice(2, 8)}`
            presenceChannel = supabase.channel('online-now-presence', {
                config: { presence: { key: presenceKey } },
            })
            presenceChannel
                .on('presence', { event: 'sync' }, () => {
                    if (cancelled) return
                    const state = presenceChannel.presenceState()
                    const count = Object.keys(state).length
                    if (count > 0) setOnlineCount(count)
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED' && !cancelled) {
                        await presenceChannel.track({
                            user_id: user?.id || presenceKey,
                            display_name: displayName,
                            online_at: new Date().toISOString(),
                        })
                    }
                })
        } catch (_e) {
            // Realtime not available — polling covers it
        }

        return () => {
            cancelled = true
            window.removeEventListener(WALLET_EVENT, onWalletChanged)
            clearInterval(interval)
            if (lbChannel) supabase.removeChannel(lbChannel)
            if (onlineChannel) supabase.removeChannel(onlineChannel)
            if (presenceChannel) supabase.removeChannel(presenceChannel)
        }
    }, [fetchLeaderboard, fetchOnlineNow, user?.id, displayName])

    // Real Supabase posts (newest first) shown above the placeholder threads
    // below, so the feed still has content while nothing's been posted yet.
    const realThreads = posts.map(post => ({
        id: post.id,
        author: post.profiles?.display_name || displayName,
        role: `Level ${levelProgress(post.profiles?.xp_total ?? 0).level}`,
        time: formatRelativeTime(post.post_time),
        title: post.post_title,
        body: post.post_body,
        likes: post.post_likes,
        comments: post.post_comments,
        tag: post.post_tag,
        imageUrl: post.post_image_url ?? null,
    }))
    const threads = [...realThreads, ...initialThreads]

    // Tag toggle narrows the list first, then the search box filters within
    // whichever tag is currently active (author, title, and body all match).
    const tagFiltered = activeTag === 'All' ? threads : threads.filter(t => t.tag === activeTag)
    const query = search.trim().toLowerCase()
    const filteredThreads = query
        ? tagFiltered.filter(t =>
              t.author.toLowerCase().includes(query) ||
              t.title.toLowerCase().includes(query) ||
              t.body.toLowerCase().includes(query)
          )
        : tagFiltered

    async function handleCreatePost({ title, body, tag, imageFile }) {
        let imageUrl = null
        if (imageFile) {
            imageUrl = await uploadPostImage(imageFile)
        }
        const created = await createPost({ title, body, tag, imageUrl })
        setPosts(prev => [created, ...prev])
        setShowNewPost(false)
        setShowNewPostWithImage(false)
    }

    async function handleToggleLike(thread) {
        const isReal = !!thread.id && !String(thread.id).startsWith('placeholder') && posts.some(p => p.id === thread.id)
        const realId = isReal ? thread.id : null
        if (!realId) {
            // Placeholder/local fallback: toggle locally
            const key = thread.title
            setLocalPlaceholderLikes(prev => {
                const cur = prev[key] ?? { likes: thread.likes, liked: false }
                const nextLiked = !cur.liked
                return { ...prev, [key]: { likes: cur.likes + (nextLiked ? 1 : -1), liked: nextLiked } }
            })
            return
        }
        if (likingIds.has(realId)) return
        setLikingIds(prev => new Set([...prev, realId]))
        const wasLiked = likedIds.has(realId)
        // Optimistic
        setPosts(prev => prev.map(p => p.id === realId ? { ...p, post_likes: (p.post_likes ?? 0) + (wasLiked ? -1 : 1) } : p))
        setLikedIds(prev => {
            const next = new Set(prev)
            if (wasLiked) next.delete(realId); else next.add(realId)
            return next
        })
        try {
            const res = await toggleLike(realId)
            // Reconcile with server truth
            setLikedIds(prev => {
                const next = new Set(prev)
                if (res.liked) next.add(realId); else next.delete(realId)
                return next
            })
        } catch (e) {
            // Rollback on error
            setPosts(prev => prev.map(p => p.id === realId ? { ...p, post_likes: (p.post_likes ?? 0) + (wasLiked ? 1 : -1) } : p))
            setLikedIds(prev => {
                const next = new Set(prev)
                if (wasLiked) next.add(realId); else next.delete(realId)
                return next
            })
            console.error('[like] failed', e.message)
        } finally {
            setLikingIds(prev => { const n = new Set(prev); n.delete(realId); return n })
        }
    }

    async function toggleComments(thread) {
        const id = thread.id
        const isReal = !!id && posts.some(p => p.id === id)
        if (!id) return
        const isOpen = expandedComments.has(id)
        if (isOpen) {
            setExpandedComments(prev => { const n = new Set(prev); n.delete(id); return n })
            return
        }
        setExpandedComments(prev => new Set([...prev, id]))
        if (!isReal) {
            // placeholder: ensure local comments entry exists
            return
        }
        if (commentsByPost[id]?.list) return // already loaded
        setCommentsByPost(prev => ({ ...prev, [id]: { list: [], loading: true, error: '' } }))
        try {
            const rows = await listComments(id)
            setCommentsByPost(prev => ({ ...prev, [id]: { list: rows, loading: false, error: '' } }))
        } catch (e) {
            setCommentsByPost(prev => ({ ...prev, [id]: { list: [], loading: false, error: e.message ?? 'Failed to load comments' } }))
        }
    }

    async function handleSubmitComment(thread) {
        const id = thread.id
        if (!id) return
        const isReal = posts.some(p => p.id === id)
        const text = (drafts[id] ?? '').trim()
        if (!text) return
        if (submittingComment.has(id)) return
        if (!isReal) {
            // placeholder local
            const entry = { id: `local-${Date.now()}`, body: text, created_at: new Date().toISOString(), display_name: displayName }
            setLocalPlaceholderComments(prev => ({ ...prev, [thread.title]: [...(prev[thread.title] ?? []), entry] }))
            setDrafts(prev => ({ ...prev, [id]: '' }))
            // also bump placeholder comment count locally via likes map? Use localPlaceholderLikes comment count alternative
            // We'll handle display via derived threads
            return
        }
        setSubmittingComment(prev => new Set([...prev, id]))
        // Optimistic
        const optimistic = { id: `optimistic-${Date.now()}`, body: text, created_at: new Date().toISOString(), user_id: user?.id, display_name: displayName }
        setCommentsByPost(prev => {
            const cur = prev[id] ?? { list: [], loading: false, error: '' }
            return { ...prev, [id]: { ...cur, list: [...cur.list, optimistic] } }
        })
        setPosts(prev => prev.map(p => p.id === id ? { ...p, post_comments: (p.post_comments ?? 0) + 1 } : p))
        setDrafts(prev => ({ ...prev, [id]: '' }))
        try {
            const saved = await createComment(id, text)
            setCommentsByPost(prev => {
                const cur = prev[id]
                if (!cur) return prev
                return { ...prev, [id]: { ...cur, list: cur.list.map(c => c.id === optimistic.id ? saved : c) } }
            })
        } catch (e) {
            // rollback
            setCommentsByPost(prev => {
                const cur = prev[id]
                if (!cur) return prev
                return { ...prev, [id]: { ...cur, list: cur.list.filter(c => c.id !== optimistic.id), error: e.message } }
            })
            setPosts(prev => prev.map(p => p.id === id ? { ...p, post_comments: Math.max(0, (p.post_comments ?? 1) - 1) } : p))
        } finally {
            setSubmittingComment(prev => { const n = new Set(prev); n.delete(id); return n })
        }
    }

    return (
        <ProtectedLayout>
            <div className='mb-6 flex items-center justify-between'>
                <div>
                    <p className='text-[11px] font-bold tracking-wider text-[#A9D8AE]'>CONNECT</p>
                    <h1 className='text-3xl font-extrabold tracking-tight'>Community</h1>
                </div>
                <button
                    onClick={() => { setShowNewPostWithImage(false); setShowNewPost(true) }}
                    className='flex items-center gap-2 bg-[#A9D8AE] text-white font-medium px-5 py-2.5 rounded-full hover:bg-[#98CD9E] transition-colors'
                >
                    <Send size={16} /> New Post
                </button>
            </div>

            {showNewPost && (
                <NewPostModal
                    key={showNewPostWithImage ? 'with-image' : 'plain'}
                    authorName={displayName}
                    authorLevel={level}
                    autoOpenImagePicker={showNewPostWithImage}
                    onClose={() => { setShowNewPost(false); setShowNewPostWithImage(false) }}
                    onSubmit={handleCreatePost}
                />
            )}

            {/* Search + filters */}
            <div className='mb-6'>
                <div className='flex items-center gap-3 px-4 py-3 bg-white border border-[#C9DDC4] rounded-xl mb-4'>
                    <Search size={18} className='text-[#6A6F73]' />
                    <input
                        type='text'
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder='Search discussions, members, topics...'
                        className='bg-transparent outline-none text-sm flex-1'
                    />
                </div>
                <div className='flex flex-wrap gap-2'>
                    {tags.map(tag => (
                        <button
                            key={tag}
                            onClick={() => setActiveTag(tag)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                tag === activeTag ? 'bg-[#141814] text-white' : 'bg-white border border-[#C9DDC4] text-[#6A6F73] hover:border-[#B7CDB1]'
                            }`}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            </div>

            <div className='grid grid-cols-[1fr_300px] gap-6'>
                {/* Threads */}
                <div className='space-y-4'>
                    {filteredThreads.length === 0 && (
                        <div className='bg-white rounded-2xl border border-[#C9DDC4] p-8 text-center'>
                            <p className='text-sm text-[#6A6F73]'>No posts match your search.</p>
                        </div>
                    )}
                    {filteredThreads.map(thread => {
                        const threadKey = thread.id ?? thread.title
                        const isReal = !!thread.id && posts.some(p => p.id === thread.id)
                        const localLike = localPlaceholderLikes[thread.title]
                        const displayLikes = isReal ? thread.likes : (localLike?.likes ?? thread.likes)
                        const isLiked = isReal ? likedIds.has(thread.id) : !!localLike?.liked
                        const isLiking = isReal && likingIds.has(thread.id)
                        const displayComments = isReal
                            ? thread.comments
                            : thread.comments + (localPlaceholderComments[thread.title]?.length ?? 0)
                        const isExpanded = expandedComments.has(threadKey) || expandedComments.has(thread.id)
                        const effectiveId = thread.id ?? thread.title
                        const commentState = isReal ? commentsByPost[thread.id] : null
                        const placeholderList = !isReal ? (localPlaceholderComments[thread.title] ?? []) : []
                        const commentList = isReal ? (commentState?.list ?? []) : placeholderList

                        return (
                            <article key={threadKey} className='bg-white rounded-2xl border border-[#C9DDC4] p-5'>
                                <div className='flex items-center justify-between mb-3'>
                                    <div className='flex items-center gap-3'>
                                        <div className='w-10 h-10 rounded-full bg-[#A9D8AE] text-white flex items-center justify-center font-bold text-sm'>
                                            {thread.author.split(' ').map(w => w[0]).join('').slice(0, 2)}
                                        </div>
                                        <div>
                                            <p className='text-sm font-bold'>{thread.author}</p>
                                            <p className='text-xs text-[#6A6F73]'>{thread.role} · {thread.time}</p>
                                        </div>
                                    </div>
                                    <button className='text-[#6A6F73] hover:text-[#1F2225]'>
                                        <MoreHorizontal size={18} />
                                    </button>
                                </div>

                                <span className='inline-block text-[10px] font-bold tracking-wider text-[#A9D8AE] bg-[#DDF0E1] px-2.5 py-1 rounded-full mb-3'>{thread.tag}</span>

                                <h2 className='font-bold leading-snug'>{thread.title}</h2>
                                <p className='text-sm text-[#6A6F73] mt-1.5 leading-relaxed'>{thread.body}</p>

                                {thread.imageUrl && (
                                    <img
                                        src={thread.imageUrl}
                                        alt='Post attachment'
                                        className='mt-3 w-full max-h-80 object-cover rounded-xl border border-[#EEF6ED]'
                                        loading='lazy'
                                    />
                                )}

                                <div className='flex items-center gap-6 mt-4 text-sm'>
                                    <button
                                        onClick={() => handleToggleLike(thread)}
                                        disabled={isLiking}
                                        className={`flex items-center gap-1.5 transition-colors ${isLiked ? 'text-[#E85D5D] font-semibold' : 'text-[#6A6F73] hover:text-[#E85D5D]'} ${isLiking ? 'opacity-60' : ''}`}
                                        aria-label={isLiked ? 'Unlike' : 'Like'}
                                    >
                                        <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} /> {displayLikes}
                                    </button>
                                    <button
                                        onClick={() => {
                                            const t = { ...thread, id: effectiveId }
                                            toggleComments(t)
                                        }}
                                        className={`flex items-center gap-1.5 transition-colors ${isExpanded ? 'text-[#A9D8AE] font-semibold' : 'text-[#6A6F73] hover:text-[#A9D8AE]'}`}
                                    >
                                        <MessageSquare size={16} /> {displayComments}
                                    </button>
                                    <span className='text-[11px] text-[#8BA089]'>Live • real-time</span>
                                </div>

                                {isExpanded && (
                                    <div className='mt-4 border-t border-[#EEF6ED] pt-4'>
                                        {isReal && commentState?.loading && (
                                            <p className='text-xs text-[#6A6F73] py-2'>Loading comments…</p>
                                        )}
                                        {isReal && commentState?.error && (
                                            <p className='text-xs text-red-500 py-2'>{commentState.error}</p>
                                        )}
                                        {!isReal && placeholderList.length === 0 && (
                                            <p className='text-xs text-[#6A6F73] py-2'>No comments yet — be the first.</p>
                                        )}
                                        {isReal && !commentState?.loading && commentList.length === 0 && !commentState?.error && (
                                            <p className='text-xs text-[#6A6F73] py-2'>No comments yet — be the first.</p>
                                        )}
                                        {commentList.length > 0 && (
                                            <div className='space-y-3 mb-3 max-h-64 overflow-y-auto pr-1'>
                                                {commentList.map(c => (
                                                    <div key={c.id} className='flex gap-2.5'>
                                                        <div className='w-7 h-7 rounded-full bg-[#141814] text-white flex items-center justify-center text-[11px] font-bold shrink-0'>
                                                            {(c.display_name || 'S').slice(0, 1).toUpperCase()}
                                                        </div>
                                                        <div className='bg-[#F3F7F1] rounded-2xl rounded-tl-sm px-3 py-2 flex-1'>
                                                            <p className='text-xs font-bold'>{c.display_name || 'Stellar Cadet'}</p>
                                                            <p className='text-xs text-[#1F2225] mt-0.5 leading-relaxed'>{c.body}</p>
                                                            <p className='text-[11px] text-[#8BA089] mt-1'>{formatRelativeTime(c.created_at)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className='flex items-center gap-2'>
                                            <input
                                                type='text'
                                                value={drafts[effectiveId] ?? ''}
                                                onChange={e => setDrafts(prev => ({ ...prev, [effectiveId]: e.target.value }))}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault()
                                                        const t = { ...thread, id: effectiveId }
                                                        handleSubmitComment(t)
                                                    }
                                                }}
                                                placeholder='Write a comment…'
                                                className='flex-1 bg-[#F3F7F1] border border-[#C9DDC4] rounded-full px-4 py-2 text-sm outline-none focus:border-[#A9D8AE]'
                                            />
                                            <button
                                                onClick={() => {
                                                    const t = { ...thread, id: effectiveId }
                                                    handleSubmitComment(t)
                                                }}
                                                disabled={!(drafts[effectiveId] ?? '').trim() || submittingComment.has(effectiveId)}
                                                className='w-9 h-9 rounded-full bg-[#A9D8AE] text-white flex items-center justify-center hover:bg-[#98CD9E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0'
                                                aria-label='Post comment'
                                            >
                                                <Send size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </article>
                        )
                    })}
                </div>

                {/* Members sidebar */}
                <aside className='space-y-6'>
                    <div className='bg-white rounded-2xl p-5 border border-[#C9DDC4]'>
                        <div className='flex items-center justify-between mb-4'>
                            <p className='text-[11px] font-bold tracking-wider text-[#6A6F73]'>LEADERBOARD WEEKLY</p>
                            <TrendingUp size={16} className='text-[#A9D8AE]' />
                        </div>
                        {leaderboardLoading && (
                            <p className='text-xs text-[#6A6F73] py-4'>Loading leaderboard…</p>
                        )}
                        {!leaderboardLoading && leaderboardError && (
                            <p className='text-xs text-[#D9605B] py-4'>{leaderboardError}</p>
                        )}
                        {!leaderboardLoading && !leaderboardError && leaderboardMembers.length === 0 && (
                            <p className='text-xs text-[#6A6F73] py-4'>No rankings yet — be the first to earn XP!</p>
                        )}
                        {!leaderboardLoading && !leaderboardError && leaderboardMembers.length > 0 && (
                            <ul className='space-y-3'>
                                {leaderboardMembers.map(m => (
                                    <li key={m.user_id} className='flex items-center justify-between'>
                                        <div className='flex items-center gap-3'>
                                            <span className='text-xs font-bold text-[#6A6F73] w-4'>{m.rank}</span>
                                            <div className={`w-9 h-9 rounded-full ${m.color} text-white flex items-center justify-center font-bold text-sm`}>
                                                {m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className='text-sm font-medium'>{m.name}</p>
                                                <p className='text-xs text-[#6A6F73]'>Level {m.level}</p>
                                            </div>
                                        </div>
                                        <span className='text-xs font-bold text-[#6A6F73]'>{m.xp.toLocaleString()} XP</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <p className='text-[10px] text-[#8BA089] mt-3'>Live data • updates automatically</p>
                    </div>

                    <div className='bg-white rounded-2xl p-5 border border-[#C9DDC4]'>
                        <div className='flex items-center justify-between mb-4'>
                            <p className='text-[11px] font-bold tracking-wider text-[#6A6F73]'>ONLINE NOW</p>
                            <Users size={16} className='text-[#A9D8AE]' />
                        </div>
                        {onlineLoading && (
                            <p className='text-xs text-[#6A6F73] py-2'>Loading…</p>
                        )}
                        {!onlineLoading && onlineError && (
                            <p className='text-xs text-[#D9605B] py-2'>{onlineError}</p>
                        )}
                        {!onlineLoading && !onlineError && (
                            <>
                                <div className='flex -space-x-3'>
                                    {onlineUsers.length > 0 ? (
                                        onlineUsers.map(u => (
                                            <div
                                                key={u.user_id}
                                                title={u.name}
                                                className={`w-9 h-9 rounded-full ${u.color} text-white flex items-center justify-center text-xs font-bold border-2 border-white`}
                                            >
                                                {u.initials}
                                            </div>
                                        ))
                                    ) : (
                                        <div className='w-9 h-9 rounded-full bg-[#EEF6ED] text-[#6A6F73] flex items-center justify-center text-xs font-bold border-2 border-white'>
                                            —
                                        </div>
                                    )}
                                </div>
                                <p className='text-xs text-[#6A6F73] mt-3'>
                                    {onlineCount > 0
                                        ? `${onlineCount} student${onlineCount === 1 ? '' : 's'} studying right now.`
                                        : 'No one online right now.'}
                                </p>
                                <p className='text-[10px] text-[#8BA089] mt-1'>Live data • updates automatically</p>
                            </>
                        )}
                    </div>
                </aside>
            </div>
        </ProtectedLayout>
    )
}
