export const WALLET_EVENT = 'stellar:wallet-changed'
export const INVENTORY_EVENT = 'stellar:inventory-changed'

function notify(event) {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(event))
    }
}

/** Notify all useWallet hooks to refetch (called after any award/spend). */
export function notifyWalletChanged() {
    notify(WALLET_EVENT)
}

/** Notify all useInventory hooks to refetch (called after any grant/spend). */
export function notifyInventoryChanged() {
    notify(INVENTORY_EVENT)
}
