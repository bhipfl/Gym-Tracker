// Kurzes haptisches Feedback (Android; iOS Safari ignoriert vibrate).
export function buzz(pattern = 15) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* nicht unterstützt */
  }
}
