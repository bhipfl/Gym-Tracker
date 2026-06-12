import { Dumbbell } from 'lucide-react'

// Marken-Logo: Hantel auf Volt-Kachel. Ersetzt das frühere Emoji-Logo.
export default function BrandMark({ size = 56 }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.29),
        background: 'var(--accent)',
        color: 'var(--accent-ink)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Dumbbell size={Math.round(size * 0.55)} strokeWidth={2.2} />
    </div>
  )
}
