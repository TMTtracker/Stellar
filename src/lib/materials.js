import { Box, TreePine, Gem, Mountain } from 'lucide-react'

// Maps a lesson's material_name (free text) to a display icon. Shared
// between the course lesson list and the single lesson page so both show
// the same icon for the same material.
const materialIcon = {
    Bricks: Box,
    Timber: TreePine,
    'Rare gem': Gem,
    Stone: Mountain
}

export function materialIconFor(name) {
    return materialIcon[name] ?? Box
}
