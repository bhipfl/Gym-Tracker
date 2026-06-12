import styles from './Skeleton.module.css'

export function SkeletonLine({ width = '100%', height = 16 }) {
  return <div className={styles.line} style={{ width, height }} />
}

export function SkeletonCard({ lines = 2 }) {
  return (
    <div className={`card ${styles.card}`}>
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLine key={i} width={i === 0 ? '60%' : '40%'} height={i === 0 ? 18 : 13} />
      ))}
    </div>
  )
}

export function SkeletonList({ count = 4, lines = 2 }) {
  return (
    <div className={styles.list}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  )
}

export function SkeletonPage({ title = true, count = 4 }) {
  return (
    <div className="page">
      {title && <SkeletonLine width="50%" height={28} />}
      <div style={{ height: 16 }} />
      <SkeletonList count={count} />
    </div>
  )
}
