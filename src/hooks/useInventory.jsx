import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { getMyInventory, inventoryTotal, INVENTORY_EVENT, ZERO_INVENTORY } from '@/services/inventory'
import { WALLET_EVENT } from '@/services/wallet'

/**
 * Reactive inventory: { inventory, total, loading, refresh }.
 * Refetches on sign-in/out and whenever a grant/spend fires
 * INVENTORY_EVENT (also on WALLET_EVENT, since lesson awards grant
 * materials alongside XP/coins). Degrades to zeros when the 003
 * migration hasn't been run yet.
 */
export function useInventory() {
    const { user } = useAuth()
    const [inventory, setInventory] = useState({ ...ZERO_INVENTORY })
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        if (!user) {
            setInventory({ ...ZERO_INVENTORY })
            setLoading(false)
            return
        }
        setLoading(true)
        try {
            const row = await getMyInventory()
            setInventory(row)
        } catch (e) {
            console.error('[inventory] refresh failed:', e.message)
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        if (!user) return
        let cancelled = false
        getMyInventory()
            .then(row => {
                if (cancelled) return
                setInventory(row)
            })
            .catch(e => console.error('[inventory] refresh failed:', e.message))
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [user])

    useEffect(() => {
        window.addEventListener(INVENTORY_EVENT, refresh)
        window.addEventListener(WALLET_EVENT, refresh)
        return () => {
            window.removeEventListener(INVENTORY_EVENT, refresh)
            window.removeEventListener(WALLET_EVENT, refresh)
        }
    }, [refresh])

    return {
        inventory: user ? inventory : { ...ZERO_INVENTORY },
        total: user ? inventoryTotal(inventory) : 0,
        loading: user ? loading : false,
        refresh
    }
}
