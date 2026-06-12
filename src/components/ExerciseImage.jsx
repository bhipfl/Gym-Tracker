import { useEffect, useState } from 'react'
import { findExercise } from '../services/exerciseDb.js'
import { X } from 'lucide-react'
import styles from './ExerciseImage.module.css'

export function useExerciseInfo(name) {
  const [info, setInfo] = useState(null)
  useEffect(() => {
    let active = true
    findExercise(name).then((ex) => { if (active) setInfo(ex) })
    return () => { active = false }
  }, [name])
  return info
}

/**
 * Thumbnail einer Übung (falls in der lokalen wger-DB vorhanden),
 * Tap öffnet ein Overlay mit Großbild und Lizenz-Attribution.
 */
export default function ExerciseImage({ name, size = 44 }) {
  const ex = useExerciseInfo(name)
  const [open, setOpen] = useState(false)
  if (!ex) return null

  const src = import.meta.env.BASE_URL + ex.image

  return (
    <>
      <button
        className={styles.thumbBtn}
        style={{ width: size, height: size }}
        onClick={() => setOpen(true)}
        title={`${ex.name} – Bild vergrößern`}
      >
        <img src={src} alt={ex.name} loading="lazy" className={styles.thumb} />
      </button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.box} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setOpen(false)} aria-label="Schließen"><X size={18} /></button>
            <img src={src} alt={ex.name} className={styles.full} />
            <div className={styles.caption}>
              <div className={styles.exName}>{ex.name}</div>
              {ex.muscle && <div className="text-xs text-muted">{ex.muscle}</div>}
              <div className={styles.attribution}>
                Bild: {ex.author} · {ex.license} ·{' '}
                <a href={ex.sourceUrl} target="_blank" rel="noopener noreferrer">wger.de</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
