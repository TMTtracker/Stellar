import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Heart, Send, Users, TrendingUp, MoreHorizontal, MessageCircle } from 'lucide-react'
import ProtectedLayout from '@/components/ProtectedLayout/ProtectedLayout'
import { useAuth } from '@/hooks/useAuth'
import { useWallet } from '@/hooks/useWallet'
import { listPosts, createPost, uploadPostImage, getMyLikedPostIds, toggleLike, listComments, createComment } from '@/services/communityPosts'
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
        id: 'placeholder-aisha',
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
        id: 'placeholder-deniz',
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
        id: 'placeholder-nafi',
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
    const [searchParams] = useSearchParams()
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
    const [localPlaceholderLikes, setLocalPlaceholderLikes] = useState({}) // id -> { likes, liked }
    const [expandedComments, setExpandedComments] = useState(() => new Set())
    const [commentsByPost, setCommentsByPost] = useState({}) // id -> { loading, error, items }
    const [commentDrafts, setCommentDrafts] = useState({}) // id -> string
    const [postingCommentIds, setPostingCommentIds] = useState(() => new Set())
    // Comment ids this tab has already counted optimistically - lets the
    // realtime post_comments INSERT listener below skip the echo of our own
    // insert instead of double-counting it.
    const selfCountedCommentIds = useRef(new Set())
    const deepLinkedPostId = useRef(null)

    const displayName = user?.user_metadata?.full_name || user?.email || 'Stellar Cadet'

    // Arriving from a "commented on your post" notification (?post=<id>) -
    // open that post's comments and scroll to it, once, as soon as it's
    // actually in the loaded posts list.
    useEffect(() => {
        const postId = searchParams.get('post')
        if (!postId || postId === deepLinkedPostId.current) return
        const match = posts.find(p => p.id === postId)
        if (!match) return
        deepLinkedPostId.current = postId

        setExpandedComments(prev => (prev.has(postId) ? prev : new Set(prev).add(postId)))
        setCommentsByPost(cur => (cur[postId] ? cur : { ...cur, [postId]: { loading: true, error: '', items: [] } }))
        listComments(postId)
            .then(items => setCommentsByPost(cur => ({ ...cur, [postId]: { loading: false, error: '', items } })))
            .catch(e => setCommentsByPost(cur => ({ ...cur, [postId]: { loading: false, error: e.message ?? 'Failed to load comments', items: [] } })))

        requestAnimationFrame(() => {
            document.getElementById(`post-${postId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
    }, [posts, searchParams])

    useEffect(() => {
        let cancelled = false
        listPosts().then(rows => {
            if (!cancelled) setPosts(rows)
        })
        return () => {
            cancelled = true
        }
    }, [])

    // Fetch my likes only when the set of known post ids actually grows (not
    // on every optimistic like/unlike, which would replace posts[] and used
    // to re-trigger this on a plain [posts] dependency - a stale/out-of-order
    // response could then wipe out an in-flight like on a different post).
    const postIdsKey = useMemo(() => posts.map(p => p.id).filter(Boolean).join(','), [posts])
    useEffect(() => {
        if (!postIdsKey) return
        const ids = postIdsKey.split(',')
        let cancelled = false
        getMyLikedPostIds(ids).then(set => {
            // Merge rather than replace so a slow response can never undo a
            // like/unlike that already landed locally in the meantime.
            if (!cancelled) setLikedIds(prev => new Set([...prev, ...set]))
        }).catch(() => {})
        return () => { cancelled = true }
    }, [postIdsKey])

    // Real-time: keep posts likes/comments in sync via postgres_changes
    useEffect(() => {
        let channel = null
        try {
            channel = supabase
                .channel('community-posts-realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'user_posts' }, (payload) => {
                    if (payload.eventType === 'UPDATE' && payload.new?.id) {
                        // post_likes is trigger-maintained on user_posts, safe to trust here.
                        // Comment count is NOT read from this row (see post_comments
                        // listeners below) - that counter column relies on a DB trigger
                        // that may not be installed, so it's ignored in favor of a live
                        // aggregate query on load plus the realtime post_comments events.
                        setPosts(prev => prev.map(p => p.id === payload.new.id ? { ...p, post_likes: payload.new.post_likes } : p))
                    } else if (payload.eventType === 'INSERT' && payload.new?.id) {
                        // New post from other user: prepend if not already present
                        setPosts(prev => prev.some(p => p.id === payload.new.id) ? prev : [{ ...payload.new, comment_count: 0 }, ...prev])
                    }
                })
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_comments' }, (payload) => {
                    // Comment counts are public, so reflect everyone's new comments live -
                    // this is the primary way the badge count now stays correct, since it
                    // does not depend on the (possibly never-applied) counter trigger.
                    // Skip the echo of a comment this tab already counted optimistically.
                    if (payload.new?.id && selfCountedCommentIds.current.has(payload.new.id)) {
                        selfCountedCommentIds.current.delete(payload.new.id)
                        return
                    }
                    if (payload.new?.post_id) {
                        setPosts(prev => prev.map(p => p.id === payload.new.post_id ? { ...p, comment_count: (p.comment_count ?? 0) + 1 } : p))
                    }
                })
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'post_comments' }, (payload) => {
                    if (payload.old?.post_id) {
                        setPosts(prev => prev.map(p => p.id === payload.old.post_id ? { ...p, comment_count: Math.max(0, (p.comment_count ?? 0) - 1) } : p))
                    }
                })
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_likes' }, (payload) => {
                    // Only react to the current user's own like (e.g. from another tab) -
                    // a targeted single-id update, never a wholesale refetch/replace.
                    if (payload.new?.user_id && payload.new.user_id === user?.id) {
                        setLikedIds(prev => new Set(prev).add(payload.new.post_id))
                    }
                })
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'post_likes' }, (payload) => {
                    if (payload.old?.user_id && payload.old.user_id === user?.id) {
                        setLikedIds(prev => { const next = new Set(prev); next.delete(payload.old.post_id); return next })
                    }
                })
                .subscribe()
        } catch (_e) {}
        return () => { if (channel) supabase.removeChannel(channel) }
    }, [user?.id])

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
        comments: post.comment_count ?? 0,
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
            const key = thread.id ?? thread.title
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

    function toggleCommentsPanel(thread) {
        const isReal = !!thread.id && !String(thread.id).startsWith('placeholder') && posts.some(p => p.id === thread.id)
        if (!isReal) return // demo posts have no backing rows to comment on
        setExpandedComments(prev => {
            const next = new Set(prev)
            if (next.has(thread.id)) {
                next.delete(thread.id)
            } else {
                next.add(thread.id)
                if (!commentsByPost[thread.id]) {
                    setCommentsByPost(cur => ({ ...cur, [thread.id]: { loading: true, error: '', items: [] } }))
                    listComments(thread.id)
                        .then(items => {
                            setCommentsByPost(cur => ({ ...cur, [thread.id]: { loading: false, error: '', items } }))
                            // Reconcile the badge with the real row count as a safety net,
                            // in case realtime is unavailable for this project.
                            setPosts(prev => prev.map(p => p.id === thread.id ? { ...p, comment_count: items.length } : p))
                        })
                        .catch(e => setCommentsByPost(cur => ({ ...cur, [thread.id]: { loading: false, error: e.message ?? 'Failed to load comments', items: [] } })))
                }
            }
            return next
        })
    }

    async function handleAddComment(postId) {
        const text = (commentDrafts[postId] ?? '').trim()
        if (!text || postingCommentIds.has(postId)) return
        setPostingCommentIds(prev => new Set(prev).add(postId))
        try {
            const created = await createComment(postId, text)
            setCommentsByPost(cur => ({
                ...cur,
                [postId]: { loading: false, error: '', items: [...(cur[postId]?.items ?? []), created] },
            }))
            setCommentDrafts(prev => ({ ...prev, [postId]: '' }))
            if (created?.id) selfCountedCommentIds.current.add(created.id)
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: (p.comment_count ?? 0) + 1 } : p))
        } catch (e) {
            console.error('[comment] failed', e.message)
        } finally {
            setPostingCommentIds(prev => { const n = new Set(prev); n.delete(postId); return n })
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
                <div className='flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#14171A] border border-[#C9DDC4] dark:border-[#262E28] rounded-xl mb-4'>
                    <Search size={18} className='text-[#6A6F73] dark:text-[#8FA893]' />
                    <input
                        type='text'
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder='Search discussions, members, topics...'
                        className='bg-transparent outline-none text-sm flex-1 text-[#1F2225] dark:text-[#F2F5F0] placeholder:text-[#9AA39C] dark:placeholder:text-[#5C6A5F]'
                    />
                </div>
                <div className='flex flex-wrap gap-2'>
                    {tags.map(tag => (
                        <button
                            key={tag}
                            onClick={() => setActiveTag(tag)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                tag === activeTag
                                    ? 'bg-[#141814] dark:bg-[#A9D8AE] text-white dark:text-[#0B0D0C]'
                                    : 'bg-white dark:bg-[#14171A] border border-[#C9DDC4] dark:border-[#262E28] text-[#6A6F73] dark:text-[#8FA893] hover:border-[#B7CDB1]'
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
                        <div className='bg-white dark:bg-[#14171A] rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] p-8 text-center'>
                            <p className='text-sm text-[#6A6F73] dark:text-[#8FA893]'>No posts match your search.</p>
                        </div>
                    )}
                    {filteredThreads.map(thread => {
                        const isReal = !!thread.id && !String(thread.id).startsWith('placeholder') && posts.some(p => p.id === thread.id)
                        const threadKey = thread.id
                        const localLike = localPlaceholderLikes[thread.id]
                        const displayLikes = isReal ? thread.likes : (localLike?.likes ?? thread.likes)
                        const isLiked = isReal ? likedIds.has(thread.id) : !!localLike?.liked
                        const isLiking = isReal && likingIds.has(thread.id)
                        const commentsOpen = expandedComments.has(thread.id)
                        const commentState = commentsByPost[thread.id]
                        const draft = commentDrafts[thread.id] ?? ''
                        const isPostingComment = postingCommentIds.has(thread.id)

                        return (
                            <article key={threadKey} id={isReal ? `post-${threadKey}` : undefined} className='bg-white dark:bg-[#14171A] rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] p-5'>
                                <div className='flex items-center justify-between mb-3'>
                                    <div className='flex items-center gap-3'>
                                        <div className='w-10 h-10 rounded-full bg-[#A9D8AE] text-white flex items-center justify-center font-bold text-sm'>
                                            {thread.author.split(' ').map(w => w[0]).join('').slice(0, 2)}
                                        </div>
                                        <div>
                                            <p className='text-sm font-bold text-[#1F2225] dark:text-[#F2F5F0]'>{thread.author}</p>
                                            <p className='text-xs text-[#6A6F73] dark:text-[#8FA893]'>{thread.role} · {thread.time}</p>
                                        </div>
                                    </div>
                                    <button className='text-[#6A6F73] dark:text-[#8FA893] hover:text-[#1F2225] dark:hover:text-[#EAF3E7]'>
                                        <MoreHorizontal size={18} />
                                    </button>
                                </div>

                                <span className='inline-block text-[10px] font-bold tracking-wider text-[#A9D8AE] bg-[#DDF0E1] dark:bg-[#1E2B20] px-2.5 py-1 rounded-full mb-3'>{thread.tag}</span>

                                <h2 className='font-bold leading-snug text-[#1F2225] dark:text-[#F2F5F0]'>{thread.title}</h2>
                                <p className='text-sm text-[#6A6F73] dark:text-[#8FA893] mt-1.5 leading-relaxed'>{thread.body}</p>

                                {thread.imageUrl && (
                                    <img
                                        src={thread.imageUrl}
                                        alt='Post attachment'
                                        className='mt-3 w-full max-h-80 object-cover rounded-xl border border-[#EEF6ED] dark:border-[#262E28]'
                                        loading='lazy'
                                    />
                                )}

                                <div className='flex items-center gap-6 mt-4 text-sm'>
                                    <button
                                        onClick={() => handleToggleLike(thread)}
                                        disabled={isLiking}
                                        className={`flex items-center gap-1.5 transition-colors ${isLiked ? 'text-[#E85D5D] font-semibold' : 'text-[#6A6F73] dark:text-[#8FA893] hover:text-[#E85D5D]'} ${isLiking ? 'opacity-60' : ''}`}
                                        aria-label={isLiked ? 'Unlike' : 'Like'}
                                    >
                                        <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} /> {displayLikes}
                                    </button>
                                    <button
                                        onClick={() => toggleCommentsPanel(thread)}
                                        disabled={!isReal}
                                        className={`flex items-center gap-1.5 transition-colors ${commentsOpen ? 'text-[#1F2225] dark:text-[#F2F5F0] font-semibold' : 'text-[#6A6F73] dark:text-[#8FA893]'} ${isReal ? 'hover:text-[#1F2225] dark:hover:text-[#EAF3E7]' : 'opacity-60 cursor-default'}`}
                                        aria-label='Comments'
                                    >
                                        <MessageCircle size={16} /> {thread.comments}
                                    </button>
                                </div>

                                {commentsOpen && (
                                    <div className='mt-4 pt-4 border-t border-[#EEF6ED] dark:border-[#262E28]'>
                                        {commentState?.loading && (
                                            <p className='text-xs text-[#6A6F73] dark:text-[#8FA893]'>Loading comments…</p>
                                        )}
                                        {commentState?.error && (
                                            <p className='text-xs text-[#D9605B]'>{commentState.error}</p>
                                        )}
                                        {!commentState?.loading && !commentState?.error && commentState?.items.length === 0 && (
                                            <p className='text-xs text-[#6A6F73] dark:text-[#8FA893]'>No comments yet - be the first to reply.</p>
                                        )}
                                        {!commentState?.loading && commentState?.items.length > 0 && (
                                            <div className={`space-y-3 ${commentState.items.length > 3 ? 'max-h-48 overflow-y-auto pr-1' : ''}`}>
                                                {commentState.items.map(c => (
                                                    <div key={c.id} className='flex items-start gap-2.5'>
                                                        <div className='w-7 h-7 shrink-0 rounded-full bg-[#B9D1E5] text-white flex items-center justify-center font-bold text-[11px]'>
                                                            {(c.display_name || 'S').slice(0, 1).toUpperCase()}
                                                        </div>
                                                        <div className='bg-[#F5FAF3] dark:bg-[#1B211C] rounded-xl px-3 py-2 flex-1'>
                                                            <div className='flex items-center gap-2'>
                                                                <p className='text-xs font-bold text-[#1F2225] dark:text-[#F2F5F0]'>{c.display_name}</p>
                                                                <p className='text-[10px] text-[#8BA089]'>{formatRelativeTime(c.created_at)}</p>
                                                            </div>
                                                            <p className='text-sm text-[#1F2225] dark:text-[#F2F5F0] mt-0.5 whitespace-pre-wrap break-words'>{c.body}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <form
                                            onSubmit={(e) => { e.preventDefault(); handleAddComment(thread.id) }}
                                            className='flex items-center gap-2 mt-3'
                                        >
                                            <input
                                                type='text'
                                                value={draft}
                                                onChange={(e) => setCommentDrafts(prev => ({ ...prev, [thread.id]: e.target.value }))}
                                                placeholder='Write a comment...'
                                                maxLength={1000}
                                                className='flex-1 bg-[#F5FAF3] dark:bg-[#1B211C] border border-[#E1EFDD] dark:border-[#262E28] rounded-full px-4 py-2 text-sm outline-none focus:border-[#A9D8AE] text-[#1F2225] dark:text-[#F2F5F0] placeholder:text-[#9AA39C] dark:placeholder:text-[#5C6A5F]'
                                            />
                                            <button
                                                type='submit'
                                                disabled={!draft.trim() || isPostingComment}
                                                className='w-9 h-9 shrink-0 rounded-full bg-[#A9D8AE] text-white flex items-center justify-center hover:bg-[#98CD9E] disabled:opacity-50 transition-colors'
                                                aria-label='Post comment'
                                            >
                                                <Send size={14} />
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </article>
                        )
                    })}
                </div>

                {/* Members sidebar */}
                <aside className='space-y-6'>
                    <div className='bg-white dark:bg-[#14171A] rounded-2xl p-5 border border-[#C9DDC4] dark:border-[#262E28]'>
                        <div className='flex items-center justify-between mb-4'>
                            <p className='text-[11px] font-bold tracking-wider text-[#6A6F73] dark:text-[#8FA893]'>LEADERBOARD WEEKLY</p>
                            <TrendingUp size={16} className='text-[#A9D8AE]' />
                        </div>
                        {leaderboardLoading && (
                            <p className='text-xs text-[#6A6F73] dark:text-[#8FA893] py-4'>Loading leaderboard…</p>
                        )}
                        {!leaderboardLoading && leaderboardError && (
                            <p className='text-xs text-[#D9605B] py-4'>{leaderboardError}</p>
                        )}
                        {!leaderboardLoading && !leaderboardError && leaderboardMembers.length === 0 && (
                            <p className='text-xs text-[#6A6F73] dark:text-[#8FA893] py-4'>No rankings yet — be the first to earn XP!</p>
                        )}
                        {!leaderboardLoading && !leaderboardError && leaderboardMembers.length > 0 && (
                            <ul className='space-y-3'>
                                {leaderboardMembers.map(m => (
                                    <li key={m.user_id} className='flex items-center justify-between'>
                                        <div className='flex items-center gap-3'>
                                            <span className='text-xs font-bold text-[#6A6F73] dark:text-[#8FA893] w-4'>{m.rank}</span>
                                            <div className={`w-9 h-9 rounded-full ${m.color} text-white flex items-center justify-center font-bold text-sm`}>
                                                {m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className='text-sm font-medium text-[#1F2225] dark:text-[#F2F5F0]'>{m.name}</p>
                                                <p className='text-xs text-[#6A6F73] dark:text-[#8FA893]'>Level {m.level}</p>
                                            </div>
                                        </div>
                                        <span className='text-xs font-bold text-[#6A6F73] dark:text-[#8FA893]'>{m.xp.toLocaleString()} XP</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <p className='text-[10px] text-[#8BA089] mt-3'>Live data • updates automatically</p>
                    </div>

                    <div className='bg-white dark:bg-[#14171A] rounded-2xl p-5 border border-[#C9DDC4] dark:border-[#262E28]'>
                        <div className='flex items-center justify-between mb-4'>
                            <p className='text-[11px] font-bold tracking-wider text-[#6A6F73] dark:text-[#8FA893]'>ONLINE NOW</p>
                            <Users size={16} className='text-[#A9D8AE]' />
                        </div>
                        {onlineLoading && (
                            <p className='text-xs text-[#6A6F73] dark:text-[#8FA893] py-2'>Loading…</p>
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
                                                className={`w-9 h-9 rounded-full ${u.color} text-white flex items-center justify-center text-xs font-bold border-2 border-white dark:border-[#14171A]`}
                                            >
                                                {u.initials}
                                            </div>
                                        ))
                                    ) : (
                                        <div className='w-9 h-9 rounded-full bg-[#EEF6ED] dark:bg-[#1B211C] text-[#6A6F73] dark:text-[#8FA893] flex items-center justify-center text-xs font-bold border-2 border-white dark:border-[#14171A]'>
                                            —
                                        </div>
                                    )}
                                </div>
                                <p className='text-xs text-[#6A6F73] dark:text-[#8FA893] mt-3'>
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
