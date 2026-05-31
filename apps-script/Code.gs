// Gym Tracker – Google Apps Script Backend
// Deploy as Web App: Execute as Me, Who has access: Anyone
// Script Properties needed: SPREADSHEET_ID, TOKEN

const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
const TOKEN = PropertiesService.getScriptProperties().getProperty('TOKEN')

function getSpreadsheet() { return SpreadsheetApp.openById(SPREADSHEET_ID) }

function getSheet(name) {
  const ss = getSpreadsheet()
  let sheet = ss.getSheetByName(name)
  if (!sheet) { sheet = ss.insertSheet(name); initSheet(sheet, name) }
  return sheet
}

function initSheet(sheet, name) {
  const headers = {
    Plans: ['id', 'name', 'description', 'created_at'],
    Exercises: ['id', 'name', 'muscle_group', 'notes'],
    Plan_Exercises: ['id', 'plan_id', 'exercise_id', 'exercise_name', 'default_sets', 'order'],
    Sessions: ['id', 'plan_id', 'plan_name', 'date', 'notes', 'completed'],
    Sets: ['id', 'session_id', 'exercise_id', 'exercise_name', 'set_number', 'weight', 'reps']
  }
  if (headers[name]) { sheet.appendRow(headers[name]); sheet.setFrozenRows(1) }
}

function generateId() { return Utilities.getUuid() }

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues()
  if (data.length < 2) return []
  const headers = data[0]
  return data.slice(1).map(row => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = row[i] })
    return obj
  })
}

function validateToken(e) {
  if (!TOKEN) return true
  return ((e.parameter && e.parameter.token) || '') === TOKEN
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON)
}

function doGet(e) {
  if (!validateToken(e)) return jsonResponse({ error: 'Unauthorized' })
  const action = e.parameter.action
  try {
    switch (action) {
      case 'ping': return jsonResponse({ ok: true, message: 'Verbindung erfolgreich!' })

      case 'getPlans': return jsonResponse({ plans: sheetToObjects(getSheet('Plans')) })

      case 'getPlanExercises': {
        const planId = e.parameter.planId
        const all = sheetToObjects(getSheet('Plan_Exercises'))
        return jsonResponse({ exercises: all.filter(r => r.plan_id === planId).sort((a, b) => Number(a.order) - Number(b.order)) })
      }

      // Combined endpoint: exercises + last weights in one round-trip
      case 'getPlanStartData': {
        const planId = e.parameter.planId
        const exercises = sheetToObjects(getSheet('Plan_Exercises'))
          .filter(r => r.plan_id === planId)
          .sort((a, b) => Number(a.order) - Number(b.order))
        const sessions = sheetToObjects(getSheet('Sessions'))
          .filter(s => s.plan_id === planId)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
        let lastWeights = {}
        if (sessions.length > 0) {
          sheetToObjects(getSheet('Sets'))
            .filter(s => s.session_id === sessions[0].id)
            .forEach(s => {
              if (!lastWeights[s.exercise_name]) lastWeights[s.exercise_name] = {}
              lastWeights[s.exercise_name][s.set_number] = { weight: s.weight, reps: s.reps }
            })
        }
        return jsonResponse({ exercises, lastWeights })
      }

      case 'searchExercises': {
        const q = (e.parameter.q || '').toLowerCase()
        const all = sheetToObjects(getSheet('Exercises'))
        return jsonResponse({ exercises: (q ? all.filter(ex => ex.name.toLowerCase().includes(q)) : all).slice(0, 20) })
      }

      // All exercise names that have actual set data (for progress autocomplete)
      case 'getUsedExerciseNames': {
        const names = [...new Set(
          sheetToObjects(getSheet('Sets')).map(s => s.exercise_name).filter(Boolean)
        )].sort()
        return jsonResponse({ names })
      }

      case 'getSessions': {
        const limit = parseInt(e.parameter.limit || '50')
        const all = sheetToObjects(getSheet('Sessions')).sort((a, b) => new Date(b.date) - new Date(a.date))
        return jsonResponse({ sessions: all.slice(0, limit) })
      }

      case 'getSessionSets': {
        const sessionId = e.parameter.sessionId
        return jsonResponse({ sets: sheetToObjects(getSheet('Sets')).filter(s => s.session_id === sessionId) })
      }

      case 'getExerciseProgress': {
        // Case-insensitive match
        const name = (e.parameter.exerciseName || '').toLowerCase().trim()
        const sets = sheetToObjects(getSheet('Sets'))
          .filter(s => s.exercise_name && s.exercise_name.toLowerCase().trim() === name)
        const sessionMap = {}
        sheetToObjects(getSheet('Sessions')).forEach(s => { sessionMap[s.id] = s.date })
        const byDate = {}
        sets.forEach(s => {
          const date = sessionMap[s.session_id]
          if (!date) return
          const w = parseFloat(s.weight) || 0
          if (!byDate[date] || w > byDate[date]) byDate[date] = w
        })
        const progress = Object.entries(byDate)
          .map(([date, weight]) => ({ date, weight }))
          .sort((a, b) => new Date(a.date) - new Date(b.date))
        return jsonResponse({ progress })
      }

      case 'getLastWeights': {
        const planId = e.parameter.planId
        const sessions = sheetToObjects(getSheet('Sessions'))
          .filter(s => s.plan_id === planId)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
        if (!sessions.length) return jsonResponse({ weights: {} })
        const weights = {}
        sheetToObjects(getSheet('Sets'))
          .filter(s => s.session_id === sessions[0].id)
          .forEach(s => {
            if (!weights[s.exercise_name]) weights[s.exercise_name] = {}
            weights[s.exercise_name][s.set_number] = { weight: s.weight, reps: s.reps }
          })
        return jsonResponse({ weights })
      }

      default: return jsonResponse({ error: 'Unknown action: ' + action })
    }
  } catch (err) { return jsonResponse({ error: err.message }) }
}

function doPost(e) {
  if (!validateToken(e)) return jsonResponse({ error: 'Unauthorized' })
  const action = e.parameter.action
  let body = {}
  try { body = JSON.parse(e.postData.contents) } catch (_) {}

  try {
    switch (action) {
      case 'savePlan': {
        const sheet = getSheet('Plans')
        if (body.id) {
          const data = sheet.getDataRange().getValues()
          const headers = data[0]
          const idCol = headers.indexOf('id')
          for (let i = 1; i < data.length; i++) {
            if (data[i][idCol] === body.id) {
              headers.forEach((h, j) => { if (body[h] !== undefined) sheet.getRange(i + 1, j + 1).setValue(body[h]) })
              return jsonResponse({ ok: true, id: body.id })
            }
          }
        }
        const id = generateId()
        sheet.appendRow([id, body.name || '', body.description || '', new Date().toISOString()])
        return jsonResponse({ ok: true, id })
      }

      case 'deletePlan': {
        deleteRowById(getSheet('Plans'), body.id)
        deleteRowsByField(getSheet('Plan_Exercises'), 'plan_id', body.id)
        return jsonResponse({ ok: true })
      }

      case 'addExerciseToPlan': {
        const sheet = getSheet('Plan_Exercises')
        const existing = sheetToObjects(sheet).filter(r => r.plan_id === body.planId)
        const order = existing.length
        let exerciseId = body.exerciseId
        if (!exerciseId) {
          const exSheet = getSheet('Exercises')
          const found = sheetToObjects(exSheet).find(ex => ex.name.toLowerCase() === (body.exercise_name || '').toLowerCase())
          if (found) {
            exerciseId = found.id
          } else {
            exerciseId = generateId()
            exSheet.appendRow([exerciseId, body.exercise_name || '', body.muscle_group || '', ''])
          }
        }
        const id = generateId()
        sheet.appendRow([id, body.planId, exerciseId, body.exercise_name || '', body.default_sets || 3, order])
        return jsonResponse({ ok: true, id, exerciseId })
      }

      case 'removeExerciseFromPlan': {
        deleteRowById(getSheet('Plan_Exercises'), body.exerciseId)
        return jsonResponse({ ok: true })
      }

      case 'updatePlanExercise': {
        const sheet = getSheet('Plan_Exercises')
        const data = sheet.getDataRange().getValues()
        const headers = data[0]
        const idCol = headers.indexOf('id')
        for (let i = 1; i < data.length; i++) {
          if (data[i][idCol] === body.exerciseId && data[i][headers.indexOf('plan_id')] === body.planId) {
            if (body.default_sets !== undefined) sheet.getRange(i + 1, headers.indexOf('default_sets') + 1).setValue(body.default_sets)
            return jsonResponse({ ok: true })
          }
        }
        return jsonResponse({ error: 'Not found' })
      }

      case 'reorderPlanExercises': {
        const sheet = getSheet('Plan_Exercises')
        const data = sheet.getDataRange().getValues()
        const headers = data[0]
        const idCol = headers.indexOf('id')
        const orderCol = headers.indexOf('order')
        ;(body.updates || []).forEach(function (u) {
          for (let i = 1; i < data.length; i++) {
            if (String(data[i][idCol]) === String(u.id)) {
              sheet.getRange(i + 1, orderCol + 1).setValue(u.order)
              break
            }
          }
        })
        return jsonResponse({ ok: true })
      }

      case 'saveSession': {
        const sessionId = generateId()
        getSheet('Sessions').appendRow([
          sessionId, body.plan_id || '', body.plan_name || '',
          body.date || new Date().toISOString(), body.notes || '', true
        ])
        writeSets(getSheet('Sets'), sessionId, body.sets || [])
        return jsonResponse({ ok: true, sessionId })
      }

      case 'updateSession': {
        const setSheet = getSheet('Sets')
        deleteRowsByField(setSheet, 'session_id', body.session_id)
        writeSets(setSheet, body.session_id, body.sets || [])
        if (body.date || body.plan_name || body.notes !== undefined) {
          const sessionSheet = getSheet('Sessions')
          const data = sessionSheet.getDataRange().getValues()
          const headers = data[0]
          const idCol = headers.indexOf('id')
          for (let i = 1; i < data.length; i++) {
            if (data[i][idCol] === body.session_id) {
              if (body.date) sessionSheet.getRange(i + 1, headers.indexOf('date') + 1).setValue(body.date)
              if (body.plan_name) sessionSheet.getRange(i + 1, headers.indexOf('plan_name') + 1).setValue(body.plan_name)
              if (body.notes !== undefined) sessionSheet.getRange(i + 1, headers.indexOf('notes') + 1).setValue(body.notes)
              break
            }
          }
        }
        return jsonResponse({ ok: true, sessionId: body.session_id })
      }

      case 'deleteSession': {
        deleteRowById(getSheet('Sessions'), body.id)
        deleteRowsByField(getSheet('Sets'), 'session_id', body.id)
        return jsonResponse({ ok: true })
      }

      default: return jsonResponse({ error: 'Unknown action: ' + action })
    }
  } catch (err) { return jsonResponse({ error: err.message }) }
}

// Normalise "80,5"/"80.5" to real number — prevents Sheets date auto-format
function toNum(v) {
  if (v === '' || v === null || v === undefined) return ''
  var n = parseFloat(String(v).replace(',', '.'))
  return isNaN(n) ? '' : n
}

function writeSets(setSheet, sessionId, sets) {
  sets.forEach(function (s) {
    setSheet.appendRow([generateId(), sessionId, s.exercise_id || '', s.exercise_name || '',
      toNum(s.set_number), toNum(s.weight), toNum(s.reps)])
  })
}

function deleteRowById(sheet, id) {
  const data = sheet.getDataRange().getValues()
  const idCol = data[0].indexOf('id')
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][idCol] === id) { sheet.deleteRow(i + 1); break }
  }
}

function deleteRowsByField(sheet, field, value) {
  const data = sheet.getDataRange().getValues()
  const col = data[0].indexOf(field)
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][col] === value) sheet.deleteRow(i + 1)
  }
}
