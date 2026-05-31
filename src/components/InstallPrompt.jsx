import { useEffect, useState } from 'react'
import styles from './InstallPrompt.module.css'

const DISMISS_KEY = 'gtracker_install_dismissed'

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [visible, setVisible] = useState(false)
  const [showIosHelp, setShowIosHelp] = useState(false)

  useEffect(() => {
    if (isStandalone()) return // bereits installiert
    if (localStorage.getItem(DISMISS_KEY) === '1') return

    // iOS Safari feuert kein beforeinstallprompt -> manuell anzeigen
    if (isIOS()) {
      setVisible(true)
      return
    }

    function onBeforeInstall(e) {
      e.preventDefault()
      setDeferred(e)
      setVisible(true)
    }
    function onInstalled() {
      setVisible(false)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function handleInstall() {
    if (isIOS()) {
      setShowIosHelp(true)
      return
    }
    if (!deferred) return
    deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
    }
    setDeferred(null)
  }

  function handleDismiss() {
    setVisible(false)
    setShowIosHelp(false)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  useEffect(() => {
    document.body.classList.toggle('has-install-banner', visible)
    return () => document.body.classList.remove('has-install-banner')
  }, [visible])

  if (!visible) return null

  return (
    <>
      <div className={styles.banner}>
        <div className={styles.icon}>💪</div>
        <div className={styles.text}>
          <strong>App installieren</strong>
          <span>Auf dem Startbildschirm – schneller Zugriff, Vollbild, offline.</span>
        </div>
        <button className={styles.installBtn} onClick={handleInstall}>
          Installieren
        </button>
        <button className={styles.closeBtn} onClick={handleDismiss} aria-label="Schließen">✕</button>
      </div>

      {showIosHelp && (
        <div className={styles.overlay} onClick={() => setShowIosHelp(false)}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <h3>Zum Startbildschirm hinzufügen</h3>
              <button className={styles.closeBtn} onClick={() => setShowIosHelp(false)}>✕</button>
            </div>
            <ol className={styles.steps}>
              <li>
                Tippe unten in Safari auf das <strong>Teilen-Symbol</strong>
                <span className={styles.shareIcon}> ⎙ </span>
                (Kästchen mit Pfeil nach oben)
              </li>
              <li>Wähle <strong>„Zum Home-Bildschirm"</strong></li>
              <li>Tippe oben rechts auf <strong>„Hinzufügen"</strong></li>
            </ol>
            <p className={styles.note}>
              Funktioniert in Safari. In Chrome auf iPhone: Menü ⋯ → „Zum Home-Bildschirm".
            </p>
            <button className={styles.gotIt} onClick={handleDismiss}>Verstanden</button>
          </div>
        </div>
      )}
    </>
  )
}
