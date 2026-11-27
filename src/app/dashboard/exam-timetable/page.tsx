'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtTime(t: string) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`
}

function computeDuration(start: string, end: string): string {
  if (!start || !end) return ''
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const total = (eh * 60 + em) - (sh * 60 + sm)
  if (total <= 0) return ''
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`
}

// ── Premium Branded PDF Generator ─────────────────────────────────────────────
function generateTimeTablePDF(event: any, tenant: any) {
  const schoolName = tenant?.name || 'School'
  const schoolAddress = tenant?.address || ''
  const schoolPhone = tenant?.phone || ''
  const schoolEmail = tenant?.email || ''
  const logoUrl = tenant?.logo || ''
  const schoolCode = tenant?.schoolCode || ''
  const directorSign = tenant?.directorSign || ''

  const timetable: any[] = Array.isArray(event.timeTable) ? event.timeTable : []

  const rows = timetable.map((t: any, i: number) => `
    <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#fff'};">
      <td style="padding:10px 14px;font-size:13px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#1a3c5e;">${fmtDate(t.date)}</td>
      <td style="padding:10px 14px;font-size:13px;border-bottom:1px solid #e2e8f0;font-weight:600;">${t.subject}</td>
      <td style="padding:10px 14px;font-size:12px;border-bottom:1px solid #e2e8f0;color:#475569;">${fmtTime(t.startTime)}</td>
      <td style="padding:10px 14px;font-size:12px;border-bottom:1px solid #e2e8f0;color:#475569;">${fmtTime(t.endTime)}</td>
      <td style="padding:10px 14px;font-size:12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-weight:600;">${t.duration || computeDuration(t.startTime, t.endTime) || '—'}</td>
    </tr>`
  ).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Exam Time Table – ${event.examName}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#f0f4f8;padding:20px;display:flex;justify-content:center;}
.page{width:210mm;background:#fff;box-shadow:0 4px 32px rgba(0,0,0,0.12);border-radius:8px;overflow:hidden;}
.header{background:linear-gradient(135deg,#1a237e 0%,#1565c0 100%);color:#fff;padding:24px 32px;display:flex;align-items:center;gap:20px;}
.logo-box{width:72px;height:72px;border-radius:12px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:36px;flex-shrink:0;overflow:hidden;}
.logo-box img{width:100%;height:100%;object-fit:cover;}
.school-info{flex:1;}
.school-name{font-size:20px;font-weight:800;letter-spacing:.5px;}
.school-sub{font-size:11px;color:rgba(255,255,255,.72);margin-top:5px;line-height:1.6;}
.title-band{background:#fbbf24;text-align:center;padding:9px;font-size:12px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#1a237e;}
.meta{padding:20px 32px 0;display:flex;justify-content:space-between;align-items:center;}
.exam-name{font-size:20px;font-weight:800;color:#1a237e;}
.exam-sub{font-size:12px;color:#64748b;margin-top:4px;}
.badge{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:6px 14px;font-size:11px;font-weight:700;color:#1e40af;}
.body{padding:20px 32px;}
table.tt{width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.06);}
table.tt thead tr{background:linear-gradient(135deg,#1a237e,#1565c0);color:#fff;}
table.tt th{padding:11px 14px;font-size:11px;text-align:left;font-weight:700;letter-spacing:.5px;text-transform:uppercase;}
.footer{padding:20px 32px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-end;margin-top:12px;}
.note{font-size:10px;color:#64748b;max-width:280px;line-height:1.7;}
.sig{text-align:center;}
.sig-line{width:180px;height:50px;border-bottom:1.5px solid #0f172a;margin-bottom:5px;display:flex;align-items:flex-end;justify-content:center;}
.sig-line img{max-height:48px;max-width:160px;object-fit:contain;}
.sig-lbl{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;}
@media print{body{background:#fff;padding:0;}.page{width:100%;box-shadow:none;}@page{margin:0;size:A4;}}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-box">${logoUrl ? `<img src="${logoUrl}" alt="Logo" onerror="this.src='/logo.png'"/>` : '<img src="/logo.png" style="width:100%;height:100%;object-fit:contain;"/>'}
    </div>
    <div class="school-info">
      <div class="school-name">${schoolName.toUpperCase()}</div>
      <div class="school-sub">
        ${schoolAddress ? `📍 ${schoolAddress}<br/>` : ''}
        ${schoolPhone ? `📞 ${schoolPhone}` : ''}${schoolPhone && schoolEmail ? ' &nbsp;|&nbsp; ' : ''}${schoolEmail ? `✉ ${schoolEmail}` : ''}
        ${schoolCode ? `<br/>School Code: <strong>${schoolCode}</strong>` : ''}
      </div>
    </div>
  </div>
  <div class="title-band">✦ &nbsp; Official Examination Time Table &nbsp; ✦</div>
  <div class="meta">
    <div>
      <div class="exam-name">${event.examName}</div>
      <div class="exam-sub">${event.course?.name || ''}${event.batch?.name ? ' · ' + event.batch.name : ''}</div>
      <div class="exam-sub" style="margin-top:4px;">📅 ${fmtDate(event.startDate)} &nbsp;→&nbsp; ${fmtDate(event.endDate)}</div>
    </div>
    <div class="badge">Total: ${timetable.length} Papers Scheduled</div>
  </div>
  <div class="body">
    <table class="tt">
      <thead>
        <tr>
          <th>Date</th>
          <th>Subject / Paper</th>
          <th>Start Time</th>
          <th>End Time</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="footer">
    <div class="note">
      <strong>Important Examination Instructions:</strong><br/>
      • Bring this official time table &amp; Admit Card to the exam hall.<br/>
      • Students must report 20 minutes before examination commences.<br/>
      • Any unfair means or electronic gadgets will lead to cancellation.
    </div>
    <div class="sig">
      <div class="sig-line">${directorSign ? `<img src="${directorSign}" alt="Sign"/>` : ''}</div>
      <div class="sig-lbl">Principal / Controller of Examinations</div>
      <div style="font-size:10px;color:#64748b;margin-top:2px;">${schoolName}</div>
    </div>
  </div>
</div>
<script>window.onload=function(){window.print();}</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=950,height=750')
  if (!win) { alert('Please allow popups to print/download the time table.'); return }
  win.document.open()
  win.document.write(html)
  win.document.close()
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DashboardExamTimetable() {
  const { token, tenant } = useAuth()
  const [courses, setCourses] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [selectedCourseObj, setSelectedCourseObj] = useState<any>(null)

  // Form state
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [examName, setExamName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [rows, setRows] = useState<{ date: string; subject: string; startTime: string; endTime: string; duration: string }[]>([])
  const [classStudentCount, setClassStudentCount] = useState<number | null>(null)

  const [loading, setLoading] = useState(false)
  const [fetchingEvents, setFetchingEvents] = useState(true)
  const [toast, setToast] = useState('')
  const [viewEvent, setViewEvent] = useState<any>(null)
  const [showForm, setShowForm] = useState(true)
  const [classStudents, setClassStudents] = useState<any[]>([])
  const [selectedStudentPreview, setSelectedStudentPreview] = useState('')

  // Filters
  const [filterCourse, setFilterCourse] = useState('')

  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    if (!token) return
    fetchCourses()
    fetchEvents()
  }, [token])

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses', { headers })
      const d = await res.json()
      if (d.success) setCourses(d.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const fetchBatches = async (courseId: string) => {
    try {
      const res = await fetch(`/api/batches?courseId=${courseId}`, { headers })
      const d = await res.json()
      if (d.success) setBatches(d.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  // When class changes: load batches, student count, and PRE-FILL subjects from course.subjects
  const handleCourseChange = async (courseId: string) => {
    setSelectedCourse(courseId)
    setSelectedBatch('')
    setSelectedStudentPreview('')
    setClassStudents([])
    setRows([])
    setSelectedCourseObj(null)

    if (!courseId) {
      setBatches([])
      setClassStudentCount(null)
      return
    }

    fetchBatches(courseId)

    // Find course object to get its subjects[]
    const courseObj = courses.find((c: any) => c.id === courseId)
    setSelectedCourseObj(courseObj || null)

    // Pre-fill rows from course subjects
    if (courseObj && Array.isArray(courseObj.subjects) && courseObj.subjects.length > 0) {
      const prefilled = courseObj.subjects.map((sub: string) => ({
        date: '',
        subject: sub,
        startTime: '09:00',
        endTime: '12:00',
        duration: '3h'
      }))
      setRows(prefilled)
    }

    try {
      const res = await fetch(`/api/students?courseId=${courseId}`, { headers })
      const data = await res.json()
      if (data.success) {
        const list = data.data || []
        setClassStudents(list)
        setClassStudentCount(list.filter((s: any) => s.status === 'ACTIVE' && !s.tcGenerated).length)
      }
    } catch {
      setClassStudentCount(null)
    }
  }

  const fetchEvents = async () => {
    setFetchingEvents(true)
    try {
      const res = await fetch('/api/exam-timetable', { headers })
      const d = await res.json()
      if (d.success) setEvents(d.data || [])
    } catch (err) {
      console.error(err)
    }
    setFetchingEvents(false)
  }

  const addRow = () => setRows([...rows, { date: '', subject: '', startTime: '09:00', endTime: '12:00', duration: '3h' }])
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i))
  const updateRow = (i: number, key: string, val: string) => {
    const updated = [...rows]
    updated[i] = { ...updated[i], [key]: val }
    if ((key === 'startTime' || key === 'endTime') && updated[i].startTime && updated[i].endTime) {
      updated[i].duration = computeDuration(updated[i].startTime, updated[i].endTime)
    }
    setRows(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rows.length === 0) { showToast('⚠️ Add at least one subject to the exam time table'); return }
    const incomplete = rows.some(r => !r.date || !r.subject || !r.startTime || !r.endTime)
    if (incomplete) { showToast('⚠️ Please fill Date, Subject, Start Time and End Time for all rows'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/exam-timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          examName,
          courseId: selectedCourse,
          batchId: selectedBatch,
          startDate,
          endDate,
          timeTable: rows
        }),
      })
      const d = await res.json()
      if (d.success) {
        showToast('✅ Exam Time Table & Admit Cards created successfully!')
        resetForm()
        fetchEvents()
        setShowForm(false)
      } else {
        showToast('❌ ' + (d.error || 'Failed to create time table'))
      }
    } catch {
      showToast('❌ Network error. Please try again.')
    }
    setLoading(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also remove associated admit cards.`)) return
    try {
      const res = await fetch(`/api/admit-cards/${id}`, { method: 'DELETE', headers })
      const d = await res.json()
      if (d.success) {
        showToast('🗑️ Exam Time Table deleted successfully')
        fetchEvents()
      } else {
        showToast('❌ ' + (d.error || 'Failed to delete'))
      }
    } catch {
      showToast('❌ Network error')
    }
  }

  const resetForm = () => {
    setExamName('')
    setStartDate('')
    setEndDate('')
    setSelectedCourse('')
    setSelectedBatch('')
    setRows([])
    setClassStudentCount(null)
    setSelectedCourseObj(null)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const filteredEvents = filterCourse ? events.filter(e => e.courseId === filterCourse) : events

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
          background: toast.startsWith('✅') ? '#064e3b' : toast.startsWith('⚠️') ? '#78350f' : '#7f1d1d',
          color: 'white', padding: '12px 24px', borderRadius: '12px', zIndex: 99999,
          fontSize: '13px', fontWeight: '700', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          {toast}
        </div>
      )}

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>📅</span>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Exam Time Table & Schedules
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
            Select a class → subjects auto-fill from class setup → add dates & times → Generate. Admit cards auto-create for all eligible students.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link href="/dashboard/admit-cards" style={{
            background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)',
            borderRadius: '12px', padding: '10px 16px', color: '#a78bfa',
            fontSize: '13px', fontWeight: '700', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <span>🎫</span> Manage Admit Cards
          </Link>
          <button onClick={() => setShowForm(!showForm)} style={{
            background: showForm ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg, #10b981, #059669)',
            border: showForm ? '1px solid rgba(239,68,68,0.4)' : 'none',
            borderRadius: '12px', padding: '10px 18px', color: 'white',
            fontSize: '13px', fontWeight: '800', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 4px 14px rgba(16,185,129,0.3)'
          }}>
            <span>{showForm ? '✕' : '+'}</span>
            {showForm ? 'Close Form' : 'Create Exam Time Table'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        {[
          { label: 'Total Timetables', value: events.length, color: 'var(--primary)' },
          { label: 'Total Papers Scheduled', value: events.reduce((s, e) => s + (Array.isArray(e.timeTable) ? e.timeTable.length : 0), 0), color: '#10b981' },
          { label: 'Total Admit Cards', value: events.reduce((s, e) => s + (e._count?.admitCards || 0), 0), color: '#f59e0b' },
        ].map((stat, i) => (
          <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: stat.color, marginTop: '4px' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ── Create Form ── */}
      {showForm && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--primary)',
          borderRadius: '20px', padding: '24px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📝</span>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                Generate New Exam Time Table
              </h2>
            </div>
            <span style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '4px 10px', borderRadius: '20px', fontWeight: '700' }}>
              Auto-creates Admit Cards for eligible students
            </span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Class & Batch */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px', display: 'block' }}>
                  Select Class / Course *
                </label>
                <select value={selectedCourse} onChange={e => handleCourseChange(e.target.value)}
                  className="input" style={{ width: '100%', padding: '12px', borderRadius: '10px' }} required>
                  <option value="">-- Choose Class --</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {classStudentCount !== null && (
                  <div style={{ fontSize: '12px', color: classStudentCount > 0 ? '#10b981' : '#ef4444', fontWeight: '700', marginTop: '6px' }}>
                    {classStudentCount > 0
                      ? `👥 ${classStudentCount} Active Students — Blocked/TC students excluded automatically`
                      : '⚠️ No active students found in this class'}
                  </div>
                )}
                {selectedCourseObj && Array.isArray(selectedCourseObj.subjects) && selectedCourseObj.subjects.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#a78bfa', background: 'rgba(139,92,246,0.1)', padding: '6px 10px', borderRadius: '8px', marginTop: '6px' }}>
                    ✨ <strong>{selectedCourseObj.subjects.length} subjects</strong> pre-filled from class setup. Add dates & times below.
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px', display: 'block' }}>
                  Section / Batch (Optional)
                </label>
                <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}
                  className="input" disabled={!selectedCourse}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', opacity: !selectedCourse ? 0.5 : 1 }}>
                  <option value="">{batches.length > 0 ? '-- All Sections / Whole Class (Optional) --' : '-- Whole Class (Optional) --'}</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px', display: 'block' }}>
                  Students in Class ({classStudents.length})
                </label>
                <select value={selectedStudentPreview} onChange={e => setSelectedStudentPreview(e.target.value)}
                  className="input" disabled={!selectedCourse}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', opacity: !selectedCourse ? 0.5 : 1 }}>
                  <option value="">{!selectedCourse ? '-- Select Class First --' : `-- All Eligible Students (${classStudentCount ?? classStudents.length}) --`}</option>
                  {classStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} {s.scholarNo ? `(Roll: ${s.scholarNo})` : ''} {s.tcGenerated ? '[TC - Excluded]' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Exam Name */}
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px', display: 'block' }}>
                Exam Title / Name *
              </label>
              <input type="text" placeholder="e.g. Mid Term Exam 2026 / Annual Examination"
                value={examName} onChange={e => setExamName(e.target.value)}
                className="input" style={{ width: '100%', padding: '12px', borderRadius: '10px' }} required />
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px', display: 'block' }}>
                  Exam Start Date *
                </label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="input" style={{ width: '100%', padding: '12px', borderRadius: '10px' }} required />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px', display: 'block' }}>
                  Exam End Date *
                </label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="input" style={{ width: '100%', padding: '12px', borderRadius: '10px' }} required />
              </div>
            </div>

            {/* Subject Rows — prefilled from course.subjects */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '800' }}>
                  📋 Exam Schedule (Subject-wise)
                  {selectedCourseObj?.subjects?.length > 0 && (
                    <span style={{ fontSize: '11px', color: '#a78bfa', marginLeft: '8px', fontWeight: '600' }}>
                      (Pre-filled from class subjects — just add dates & times)
                    </span>
                  )}
                </label>
                <button type="button" onClick={addRow} style={{
                  background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: '8px', padding: '6px 14px', color: '#a78bfa',
                  fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                }}>
                  + Add Subject Row
                </button>
              </div>

              {rows.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px',
                  border: '2px dashed var(--border)', borderRadius: '12px' }}>
                  Select a class above to auto-load its subjects, or click "+ Add Subject Row"
                </div>
              )}

              {rows.map((row, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1fr 80px 36px',
                  gap: '8px', marginBottom: '8px', alignItems: 'center',
                  background: 'var(--surface-2)', padding: '10px 12px',
                  borderRadius: '10px', border: '1px solid var(--border)'
                }}>
                  <input type="date" value={row.date} onChange={e => updateRow(i, 'date', e.target.value)}
                    className="input" style={{ padding: '8px', borderRadius: '8px', fontSize: '12px' }}
                    placeholder="Date" required />
                  <input type="text" value={row.subject} onChange={e => updateRow(i, 'subject', e.target.value)}
                    className="input" style={{ padding: '8px', borderRadius: '8px', fontSize: '12px' }}
                    placeholder="Subject / Paper" required />
                  <input type="time" value={row.startTime} onChange={e => updateRow(i, 'startTime', e.target.value)}
                    className="input" style={{ padding: '8px', borderRadius: '8px', fontSize: '12px' }} />
                  <input type="time" value={row.endTime} onChange={e => updateRow(i, 'endTime', e.target.value)}
                    className="input" style={{ padding: '8px', borderRadius: '8px', fontSize: '12px' }} />
                  <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '700', textAlign: 'center' }}>
                    {row.duration || computeDuration(row.startTime, row.endTime) || '—'}
                  </div>
                  <button type="button" onClick={() => removeRow(i)} style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '6px', color: '#ef4444', cursor: 'pointer',
                    padding: '6px 8px', fontSize: '14px', fontWeight: '800'
                  }}>✕</button>
                </div>
              ))}
            </div>

            <button type="submit" disabled={loading} style={{
              background: loading ? '#374151' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white', padding: '14px', borderRadius: '12px',
              border: 'none', fontSize: '14px', fontWeight: '800',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 14px rgba(99,102,241,0.4)'
            }}>
              {loading ? '⏳ Generating...' : '🚀 Generate Time Table & Admit Cards'}
            </button>
          </form>
        </div>
      )}

      {/* ── Filter */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
          className="input" style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '13px', minWidth: '200px' }}>
          <option value="">All Classes</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {filteredEvents.length} timetable{filteredEvents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Events List ── */}
      {fetchingEvents ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
      ) : filteredEvents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)',
          border: '2px dashed var(--border)', borderRadius: '16px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>📅</div>
          <div>No exam timetables created yet.</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>Click "Create Exam Time Table" to get started.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredEvents.map(event => (
            <div key={event.id} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '16px', padding: '18px 20px',
              display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-primary)' }}>{event.examName}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  {event.course?.name}{event.batch?.name ? ` — ${event.batch.name}` : ''} &nbsp;·&nbsp;
                  {fmtDate(event.startDate)} → {fmtDate(event.endDate)}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', background: 'rgba(99,102,241,0.15)', color: '#a78bfa', padding: '2px 8px', borderRadius: '20px', fontWeight: '700' }}>
                    {Array.isArray(event.timeTable) ? event.timeTable.length : 0} Papers
                  </span>
                  <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '20px', fontWeight: '700' }}>
                    {event._count?.admitCards || 0} Admit Cards
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => setViewEvent(event)} style={{
                  background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: '10px', padding: '8px 14px', color: '#a78bfa',
                  fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                }}>👁 View</button>
                <button onClick={() => generateTimeTablePDF(event, tenant)} style={{
                  background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: '10px', padding: '8px 14px', color: '#10b981',
                  fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                }}>🖨 Print Timetable</button>
                <Link href={`/dashboard/admit-cards?eventId=${event.id}`} style={{
                  background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: '10px', padding: '8px 14px', color: '#f59e0b',
                  fontSize: '12px', fontWeight: '700', cursor: 'pointer', textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}>🎫 Manage Admit Cards</Link>
                <button onClick={() => handleDelete(event.id, event.examName)} style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '10px', padding: '8px 14px', color: '#ef4444',
                  fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                }}>🗑 Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── View Modal ── */}
      {viewEvent && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} onClick={() => setViewEvent(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--surface)', borderRadius: '20px', padding: '24px',
            maxWidth: '700px', width: '100%', maxHeight: '80vh', overflowY: 'auto',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                {viewEvent.examName}
              </h2>
              <button onClick={() => setViewEvent(null)} style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '6px 12px', color: 'var(--text-muted)', cursor: 'pointer'
              }}>✕ Close</button>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {viewEvent.course?.name}{viewEvent.batch?.name ? ` — ${viewEvent.batch.name}` : ''} &nbsp;·&nbsp;
              {fmtDate(viewEvent.startDate)} → {fmtDate(viewEvent.endDate)}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  {['#', 'Date', 'Subject', 'Start', 'End', 'Duration'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px',
                      color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(viewEvent.timeTable) ? viewEvent.timeTable : []).map((t: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: '700' }}>{fmtDate(t.date)}</td>
                    <td style={{ padding: '10px 12px', fontWeight: '600' }}>{t.subject}</td>
                    <td style={{ padding: '10px 12px' }}>{fmtTime(t.startTime)}</td>
                    <td style={{ padding: '10px 12px' }}>{fmtTime(t.endTime)}</td>
                    <td style={{ padding: '10px 12px', color: '#10b981', fontWeight: '700' }}>
                      {t.duration || computeDuration(t.startTime, t.endTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => generateTimeTablePDF(viewEvent, tenant)} style={{
                background: 'linear-gradient(135deg, #1a237e, #1565c0)',
                color: 'white', border: 'none', borderRadius: '10px',
                padding: '10px 18px', fontSize: '13px', fontWeight: '700', cursor: 'pointer'
              }}>🖨 Print / Download PDF</button>
              <Link href={`/dashboard/admit-cards?eventId=${viewEvent.id}`} onClick={() => setViewEvent(null)} style={{
                background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '10px', padding: '10px 18px', color: '#f59e0b',
                fontSize: '13px', fontWeight: '700', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: '4px'
              }}>🎫 Go to Admit Cards</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
