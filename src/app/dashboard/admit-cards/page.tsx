'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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

// ── Combined Admit Card + Timetable Print Generator ───────────────────────────
// Upper half: Admit Card with student photo & details (scholar no = roll no)
// Lower half: Exam Time Table
function generateAdmitCardsPrintHTML(eventDetails: any, tenant: any, singleCard?: any) {
  const schoolName = tenant?.name || 'School'
  const schoolLogo = tenant?.logo || ''
  const schoolAddress = tenant?.address || ''
  const schoolPhone = tenant?.phone || ''
  const schoolEmail = tenant?.email || ''
  const schoolCode = tenant?.schoolCode || ''
  const directorSign = tenant?.directorSign || ''

  const cardsToPrint = singleCard ? [singleCard] : (eventDetails.admitCards || [])
  const timeTable = Array.isArray(eventDetails.timeTable) ? eventDetails.timeTable : []

  const ttRows = timeTable.map((t: any, i: number) => `
    <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#fff'}">
      <td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#1a237e;">${fmtDate(t.date)}</td>
      <td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #e2e8f0;font-weight:600;">${t.subject}</td>
      <td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #e2e8f0;color:#475569;">${fmtTime(t.startTime)} – ${fmtTime(t.endTime)}</td>
      <td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #e2e8f0;color:#059669;font-weight:700;">${t.duration || computeDuration(t.startTime, t.endTime) || '—'}</td>
    </tr>`).join('')

  const cardsHtml = cardsToPrint.map((card: any) => {
    const rollNo = card.student.scholarNo || card.student.studentId || 'N/A'
    return `
    <div class="admit-card-page">
      <div class="card-border">
        <!-- TOP STRIP -->
        <div class="top-strip"></div>

        <!-- SCHOOL HEADER -->
        <div class="header">
          <div class="logo-box">
            ${schoolLogo ? `<img src="${schoolLogo}" alt="Logo" onerror="this.src='/logo.png'"/>` : '<span style="font-size:28px">🏫</span>'}
          </div>
          <div class="header-text">
            <h1 class="school-name">${schoolName.toUpperCase()}</h1>
            ${schoolAddress ? `<p class="school-sub">${schoolAddress}</p>` : ''}
            <p class="school-contact">
              ${schoolPhone ? `📞 ${schoolPhone}` : ''}${schoolPhone && schoolEmail ? ' &nbsp;|&nbsp; ' : ''}${schoolEmail ? `✉ ${schoolEmail}` : ''}
              ${schoolCode ? ` &nbsp;|&nbsp; Code: <strong>${schoolCode}</strong>` : ''}
            </p>
          </div>
          <div class="header-tag">
            <div class="tag-sub">HALL TICKET</div>
            <div class="tag-main">ADMIT CARD</div>
          </div>
        </div>

        <!-- EXAM BANNER -->
        <div class="exam-banner">
          ✦ &nbsp; ${eventDetails.examName} &nbsp; ✦
          <div style="font-size:10px;font-weight:600;margin-top:2px;opacity:0.9;">
            ${eventDetails.course?.name || ''}${eventDetails.batch?.name ? ' — ' + eventDetails.batch.name : ''}
            &nbsp;|&nbsp; ${fmtDate(eventDetails.startDate)} to ${fmtDate(eventDetails.endDate)}
          </div>
        </div>

        <!-- STUDENT DETAILS + PHOTO (Upper Half) -->
        <div class="student-section">
          <div class="student-grid">
            <div class="detail-row"><span class="lbl">STUDENT NAME</span><span class="val bold">${card.student.fullName}</span></div>
            <div class="detail-row"><span class="lbl">ROLL NO. / SCHOLAR NO.</span><span class="val bold red">${rollNo}</span></div>
            <div class="detail-row"><span class="lbl">FATHER'S NAME</span><span class="val">${card.student.fatherName || 'N/A'}</span></div>
            <div class="detail-row"><span class="lbl">MOTHER'S NAME</span><span class="val">${card.student.motherName || 'N/A'}</span></div>
            <div class="detail-row"><span class="lbl">CLASS &amp; SECTION</span><span class="val">${eventDetails.course?.name || ''}${eventDetails.batch?.name ? ' - ' + eventDetails.batch.name : ''}</span></div>
            <div class="detail-row"><span class="lbl">DATE OF BIRTH</span><span class="val">${card.student.dob ? fmtDate(card.student.dob) : 'N/A'}</span></div>
            <div class="detail-row"><span class="lbl">GENDER</span><span class="val">${card.student.gender || 'N/A'}</span></div>
            <div class="detail-row"><span class="lbl">CONTACT</span><span class="val">${card.student.phone || 'N/A'}</span></div>
          </div>
          <div class="photo-box">
            ${card.student.photo
        ? `<img src="${card.student.photo}" alt="Student Photo" onerror="this.style.display='none'"/>`
        : '<div class="photo-placeholder">📷<br/><small>Photo</small></div>'}
            <div class="photo-label">Student Photo</div>
          </div>
        </div>

        <!-- INSTRUCTIONS -->
        <div class="instructions">
          <strong>Instructions:</strong>
          This admit card must be presented at the examination centre. • Report 20 mins early. • No electronic devices allowed. • This card is non-transferable.
        </div>

        <!-- CUT LINE -->
        <div class="cut-line">✂ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ EXAM TIME TABLE ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ✂</div>

        <!-- TIME TABLE (Lower Half) -->
        <div class="tt-section">
          <div class="tt-header-row">
            <div>
              <div class="tt-title">📅 Examination Schedule — ${eventDetails.examName}</div>
              <div class="tt-sub">${eventDetails.course?.name || ''}${eventDetails.batch?.name ? ' · ' + eventDetails.batch.name : ''} &nbsp;|&nbsp; Roll No: <strong>${rollNo}</strong></div>
            </div>
          </div>
          ${timeTable.length > 0 ? `
          <table class="tt-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Subject / Paper</th>
                <th>Timings</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>${ttRows}</tbody>
          </table>` : '<div style="text-align:center;color:#94a3b8;padding:12px;font-size:12px;">Time table not available</div>'}
        </div>

        <!-- SIGNATURES -->
        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-label">Student Signature</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">
              ${directorSign ? `<img src="${directorSign}" alt="Sign" style="max-height:40px;max-width:120px;object-fit:contain;"/>` : ''}
            </div>
            <div class="sig-label">Principal / Exam Controller</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-label">Invigilator's Signature</div>
          </div>
        </div>

        <!-- BOTTOM STRIP -->
        <div class="bottom-strip">
          Official document of ${schoolName} · Roll No: ${rollNo} · This card must be surrendered after the examination
        </div>
      </div>
    </div>`}).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Admit Cards – ${eventDetails.examName}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',Arial,sans-serif;background:#e8ecf0;padding:16px;}
.admit-card-page{width:210mm;margin:0 auto 32px;page-break-after:always;}
.card-border{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);border:1px solid #e2e8f0;}
.top-strip{height:6px;background:linear-gradient(90deg,#1a237e,#1565c0,#0288d1,#00acc1);}
.header{background:linear-gradient(135deg,#1a237e 0%,#1565c0 60%,#283593 100%);color:#fff;padding:14px 20px;display:flex;align-items:center;gap:14px;}
.logo-box{width:60px;height:60px;border-radius:10px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;}
.logo-box img{width:100%;height:100%;object-fit:cover;}
.header-text{flex:1;}
.school-name{font-size:16px;font-weight:900;letter-spacing:.5px;}
.school-sub{font-size:9.5px;color:rgba(255,255,255,.75);margin-top:3px;line-height:1.5;}
.school-contact{font-size:9.5px;color:rgba(255,255,255,.65);margin-top:2px;}
.header-tag{text-align:center;background:rgba(255,255,255,0.12);border-radius:8px;padding:8px 12px;flex-shrink:0;}
.tag-sub{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.7);}
.tag-main{font-size:16px;font-weight:900;letter-spacing:1px;color:#fbbf24;}
.exam-banner{background:linear-gradient(135deg,#1565c0,#0288d1);color:#fff;text-align:center;padding:8px 16px;font-size:13px;font-weight:800;letter-spacing:1px;}
.student-section{display:flex;gap:16px;padding:14px 20px;border-bottom:1px solid #f1f5f9;}
.student-grid{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:6px;}
.detail-row{display:flex;flex-direction:column;gap:1px;padding:5px 8px;background:#f8fafc;border-radius:6px;border-left:3px solid #1565c0;}
.lbl{font-size:8.5px;text-transform:uppercase;letter-spacing:.5px;color:#64748b;font-weight:700;}
.val{font-size:12px;font-weight:600;color:#0f172a;}
.val.bold{font-weight:800;}
.val.red{color:#dc2626;font-weight:900;}
.photo-box{width:90px;flex-shrink:0;text-align:center;}
.photo-box img{width:80px;height:96px;object-fit:cover;border:2px solid #1565c0;border-radius:8px;}
.photo-placeholder{width:80px;height:96px;border:2px dashed #cbd5e1;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#94a3b8;font-size:20px;}
.photo-label{font-size:9px;color:#94a3b8;margin-top:4px;font-weight:600;}
.instructions{padding:7px 20px;font-size:9.5px;color:#475569;background:#fffbeb;border-top:1px solid #fde68a;border-bottom:1px solid #e2e8f0;}
.cut-line{text-align:center;padding:5px;font-size:9px;color:#94a3b8;letter-spacing:1px;border-top:1px dashed #cbd5e1;background:#f8fafc;}
.tt-section{padding:12px 20px;}
.tt-header-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
.tt-title{font-size:12px;font-weight:800;color:#1a237e;}
.tt-sub{font-size:10px;color:#64748b;margin-top:2px;}
.tt-table{width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;font-size:11px;}
.tt-table thead tr{background:linear-gradient(135deg,#1a237e,#1565c0);color:#fff;}
.tt-table th{padding:7px 10px;text-align:left;font-weight:700;font-size:9.5px;text-transform:uppercase;letter-spacing:.4px;}
.signatures{display:flex;justify-content:space-between;padding:10px 24px;border-top:1px solid #e2e8f0;gap:16px;}
.sig-box{flex:1;text-align:center;}
.sig-line{height:36px;border-bottom:1.5px solid #0f172a;margin-bottom:4px;display:flex;align-items:flex-end;justify-content:center;}
.sig-label{font-size:9px;text-transform:uppercase;letter-spacing:.4px;font-weight:700;color:#475569;}
.bottom-strip{background:linear-gradient(135deg,#1a237e,#1565c0);color:rgba(255,255,255,0.65);text-align:center;padding:5px 16px;font-size:9px;}
@media print{
  body{background:#fff;padding:0;}
  .admit-card-page{margin:0;width:100%;page-break-after:always;}
  .card-border{box-shadow:none;border-radius:0;border:none;}
  @page{margin:8mm;size:A4;}
}
</style>
</head>
<body>
${cardsHtml}
<script>window.onload=function(){window.print();}</script>
</body>
</html>`
}

function printCardsWindow(eventDetails: any, tenant: any, singleCard?: any) {
  const html = generateAdmitCardsPrintHTML(eventDetails, tenant, singleCard)
  const win = window.open('', '_blank', 'width=1000,height=800')
  if (!win) { alert('Please allow popups to print/download the admit cards.'); return }
  win.document.open()
  win.document.write(html)
  win.document.close()
}

// ── Main Inner Component ──────────────────────────────────────────────────────
function DashboardAdmitCardsContent() {
  const searchParams = useSearchParams()
  const preselectedEventId = searchParams.get('eventId')
  const { token, tenant, user } = useAuth()

  const [events, setEvents] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [filterCourse, setFilterCourse] = useState('')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(preselectedEventId || null)
  const [eventDetails, setEventDetails] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [fetchingEvents, setFetchingEvents] = useState(true)
  const [toast, setToast] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // For selective publish: track checked students
  const [checkedStudents, setCheckedStudents] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(true)

  const headers = { Authorization: `Bearer ${token}` }
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4500) }

  useEffect(() => {
    if (!token) return
    fetchEvents()
    fetchCourses()
  }, [token])

  useEffect(() => {
    if (selectedEventId) fetchEventDetails(selectedEventId)
    else setEventDetails(null)
  }, [selectedEventId])

  // When event details load, initialize checkedStudents (all eligible cards)
  useEffect(() => {
    if (!eventDetails) return
    const eligible = (eventDetails.admitCards || [])
      .filter((c: any) => !c.isBlocked && !c.student?.tcGenerated)
      .map((c: any) => c.studentId)
    setCheckedStudents(new Set(eligible))
    setSelectAll(true)
  }, [eventDetails])

  const fetchEvents = async () => {
    setFetchingEvents(true)
    try {
      const res = await fetch('/api/admit-cards', { headers })
      const d = await res.json()
      if (d.success) setEvents(d.data || [])
    } catch { }
    setFetchingEvents(false)
  }

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses', { headers })
      const d = await res.json()
      if (d.success) setCourses(d.data || [])
    } catch { }
  }

  const fetchEventDetails = async (id: string) => {
    setLoadingDetails(true)
    try {
      const res = await fetch(`/api/admit-cards/${id}`, { headers })
      const d = await res.json()
      if (d.success) setEventDetails(d.data)
    } catch { }
    setLoadingDetails(false)
  }

  const handleAction = async (action: string, studentIds?: string[]) => {
    if (!selectedEventId) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admit-cards/${selectedEventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ action, studentIds })
      })
      const d = await res.json()
      if (d.success) {
        const labels: Record<string, string> = {
          publish: '✅ Published successfully',
          unpublish: '✅ Unpublished successfully',
          block: '🚫 Blocked successfully',
          unblock: '✅ Unblocked successfully',
          approve: '⚡ Approved for publication',
        }
        showToast(labels[action] || '✅ Done')
        fetchEventDetails(selectedEventId)
      } else {
        showToast('❌ ' + (d.error || 'Action failed'))
      }
    } catch {
      showToast('❌ Network error')
    }
    setActionLoading(false)
  }

  // Publish only the checked (selected) students
  const handlePublishSelected = async () => {
    if (checkedStudents.size === 0) { showToast('⚠️ No students selected'); return }
    await handleAction('publish', Array.from(checkedStudents))
  }

  // Print all eligible (non-blocked, non-TC) cards at once
  const handlePrintAll = () => {
    if (!eventDetails) return
    const eligible = { ...eventDetails, admitCards: (eventDetails.admitCards || []).filter((c: any) => !c.isBlocked && !c.student?.tcGenerated) }
    if (eligible.admitCards.length === 0) { showToast('⚠️ No eligible cards to print'); return }
    printCardsWindow(eligible, tenant)
  }

  const toggleCheck = (studentId: string) => {
    const next = new Set(checkedStudents)
    if (next.has(studentId)) next.delete(studentId)
    else next.add(studentId)
    setCheckedStudents(next)
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setCheckedStudents(new Set())
      setSelectAll(false)
    } else {
      const eligible = (eventDetails?.admitCards || [])
        .filter((c: any) => !c.isBlocked && !c.student?.tcGenerated)
        .map((c: any) => c.studentId)
      setCheckedStudents(new Set(eligible))
      setSelectAll(true)
    }
  }

  const filteredEvents = filterCourse ? events.filter(e => e.courseId === filterCourse) : events

  const totalPublished = eventDetails ? (eventDetails.admitCards || []).filter((c: any) => c.isPublished).length : 0
  const totalBlocked = eventDetails ? (eventDetails.admitCards || []).filter((c: any) => c.isBlocked).length : 0
  const totalEligible = eventDetails ? (eventDetails.admitCards || []).filter((c: any) => !c.isBlocked && !c.student?.tcGenerated).length : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
          background: toast.startsWith('✅') ? '#064e3b' : toast.startsWith('⚠️') ? '#78350f' : '#7f1d1d',
          color: 'white', padding: '12px 24px', borderRadius: '12px', zIndex: 99999,
          fontSize: '13px', fontWeight: '700', boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🎫</span>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Admit Cards Management
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
            Select an exam event → manage, publish, block, print/download individual or all admit cards. Blocked &amp; TC students are auto-excluded. Roll No = Scholar No.
          </p>
        </div>
        <Link href="/dashboard/exam-timetable" style={{
          background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: '12px', padding: '10px 16px', color: '#10b981',
          fontSize: '13px', fontWeight: '700', textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <span>📅</span> Create Exam Timetable
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* LEFT: Events List */}
        <div style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
              className="input" style={{ flex: 1, padding: '8px 10px', borderRadius: '10px', fontSize: '12px' }}>
              <option value="">All Classes</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {fetchingEvents ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading...</div>
          ) : filteredEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)',
              border: '2px dashed var(--border)', borderRadius: '12px', fontSize: '13px' }}>
              No exam events found.
              <br/>
              <Link href="/dashboard/exam-timetable" style={{ color: '#10b981', textDecoration: 'none', fontWeight: '700' }}>
                Create one →
              </Link>
            </div>
          ) : filteredEvents.map(ev => (
            <div key={ev.id} onClick={() => setSelectedEventId(ev.id)} style={{
              background: selectedEventId === ev.id ? 'rgba(99,102,241,0.15)' : 'var(--surface)',
              border: selectedEventId === ev.id ? '1px solid rgba(99,102,241,0.5)' : '1px solid var(--border)',
              borderRadius: '12px', padding: '12px 14px', cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-primary)' }}>{ev.examName}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {ev.course?.name}{ev.batch?.name ? ` — ${ev.batch.name}` : ''}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {fmtDate(ev.startDate)} → {fmtDate(ev.endDate)}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.15)', color: '#a78bfa', padding: '2px 7px', borderRadius: '20px', fontWeight: '700' }}>
                  {ev._count?.admitCards || 0} Cards
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT: Event Detail & Actions */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          {!selectedEventId && (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)',
              border: '2px dashed var(--border)', borderRadius: '16px' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>👈</div>
              <div>Select an exam event from the left to manage its admit cards</div>
            </div>
          )}

          {selectedEventId && loadingDetails && (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Loading admit cards...</div>
          )}

          {selectedEventId && !loadingDetails && eventDetails && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Event header */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                      {eventDetails.examName}
                    </h2>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                      {eventDetails.course?.name}{eventDetails.batch?.name ? ` — ${eventDetails.batch.name}` : ''}
                      &nbsp;·&nbsp; {fmtDate(eventDetails.startDate)} → {fmtDate(eventDetails.endDate)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Print All (eligible) */}
                    <button onClick={handlePrintAll} style={{
                      background: 'linear-gradient(135deg,#1a237e,#1565c0)',
                      color: 'white', border: 'none', borderRadius: '10px',
                      padding: '8px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '5px'
                    }}>
                      🖨 Print All Admit Cards
                    </button>
                    {/* Publish Selected */}
                    <button onClick={handlePublishSelected} disabled={actionLoading || checkedStudents.size === 0} style={{
                      background: checkedStudents.size === 0 ? 'rgba(16,185,129,0.1)' : 'linear-gradient(135deg,#10b981,#059669)',
                      color: 'white', border: 'none', borderRadius: '10px',
                      padding: '8px 14px', fontSize: '12px', fontWeight: '700',
                      cursor: actionLoading || checkedStudents.size === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '5px'
                    }}>
                      📢 Publish Selected ({checkedStudents.size})
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Total', value: eventDetails.admitCards?.length || 0, color: '#a78bfa' },
                    { label: 'Eligible', value: totalEligible, color: '#10b981' },
                    { label: 'Published', value: totalPublished, color: '#3b82f6' },
                    { label: 'Blocked', value: totalBlocked, color: '#ef4444' },
                  ].map((s, i) => (
                    <div key={i} style={{ background: 'var(--surface-2)', borderRadius: '10px', padding: '8px 14px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Student List */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
                {/* Header row with select all */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--surface-2)' }}>
                  <input type="checkbox" checked={selectAll} onChange={toggleSelectAll}
                    style={{ width: '15px', height: '15px', accentColor: '#6366f1', cursor: 'pointer' }} />
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Student Name &amp; Roll No.
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {(eventDetails.admitCards || []).length} students
                  </span>
                </div>

                {(eventDetails.admitCards || []).map((card: any) => {
                  const isTcBlocked = card.student?.tcGenerated
                  const isInactive = card.student?.status !== 'ACTIVE'
                  const isFullyBlocked = card.isBlocked || isTcBlocked
                  const rollNo = card.student?.scholarNo || card.student?.studentId || 'N/A'

                  let statusLabel = ''
                  let statusColor = ''
                  if (isTcBlocked) { statusLabel = 'TC Generated'; statusColor = '#dc2626' }
                  else if (card.isBlocked && !card.superAdminApproved) { statusLabel = 'Blocked'; statusColor = '#ef4444' }
                  else if (card.isBlocked && card.superAdminApproved) { statusLabel = 'Approved'; statusColor = '#f59e0b' }
                  else if (card.isPublished) { statusLabel = 'Published'; statusColor = '#10b981' }
                  else { statusLabel = 'Pending'; statusColor = '#94a3b8' }

                  return (
                    <div key={card.id} style={{
                      padding: '12px 16px', borderBottom: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                      opacity: isFullyBlocked && !card.superAdminApproved ? 0.65 : 1,
                      background: isTcBlocked ? 'rgba(239,68,68,0.04)' : 'transparent'
                    }}>
                      {/* Checkbox — disabled for TC/blocked */}
                      <input type="checkbox"
                        checked={checkedStudents.has(card.studentId) && !isFullyBlocked}
                        disabled={isFullyBlocked && !card.superAdminApproved}
                        onChange={() => !isFullyBlocked && toggleCheck(card.studentId)}
                        style={{ width: '15px', height: '15px', accentColor: '#6366f1', cursor: isFullyBlocked ? 'not-allowed' : 'pointer' }} />

                      {/* Photo */}
                      <div style={{
                        width: '34px', height: '40px', borderRadius: '6px', overflow: 'hidden',
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {card.student?.photo
                          ? <img src={card.student.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          : <span style={{ fontSize: '16px' }}>👤</span>}
                      </div>

                      {/* Name & Roll */}
                      <div style={{ flex: 1, minWidth: '120px' }}>
                        <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>
                          {card.student?.fullName}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Roll No: <strong style={{ color: '#6366f1' }}>{rollNo}</strong>
                          {isTcBlocked && <span style={{ marginLeft: '6px', color: '#dc2626', fontSize: '10px' }}>⚠ TC Issued</span>}
                        </div>
                      </div>

                      {/* Status badge */}
                      <span style={{
                        fontSize: '10px', fontWeight: '800', padding: '3px 9px', borderRadius: '20px',
                        background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40`
                      }}>{statusLabel}</span>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {/* Super admin approve blocked */}
                        {card.isBlocked && !card.superAdminApproved && !isTcBlocked &&
                          (user?.role === 'SUPER_ADMIN' || user?.role === 'COACHING_ADMIN') && (
                            <button onClick={() => handleAction('approve', [card.studentId])} style={{
                              background: '#f59e0b', color: 'white', border: 'none',
                              padding: '5px 10px', borderRadius: '7px', fontSize: '10px', fontWeight: '800', cursor: 'pointer'
                            }}>⚡ Approve</button>
                          )}

                        {/* Publish single */}
                        {!card.isPublished && (!card.isBlocked || card.superAdminApproved) && !isTcBlocked && (
                          <button onClick={() => handleAction('publish', [card.studentId])} style={{
                            background: '#10b981', color: 'white', border: 'none',
                            padding: '5px 10px', borderRadius: '7px', fontSize: '10px', fontWeight: '800', cursor: 'pointer'
                          }}>Publish</button>
                        )}

                        {/* Unpublish single */}
                        {card.isPublished && (
                          <button onClick={() => handleAction('unpublish', [card.studentId])} style={{
                            background: 'rgba(100,116,139,0.15)', color: '#94a3b8',
                            border: '1px solid rgba(100,116,139,0.3)',
                            padding: '5px 10px', borderRadius: '7px', fontSize: '10px', fontWeight: '700', cursor: 'pointer'
                          }}>Unpublish</button>
                        )}

                        {/* Block / Unblock */}
                        {!isTcBlocked && (
                          <button onClick={() => handleAction(card.isBlocked ? 'unblock' : 'block', [card.studentId])} style={{
                            background: card.isBlocked ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            color: card.isBlocked ? '#10b981' : '#ef4444',
                            border: `1px solid ${card.isBlocked ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                            padding: '5px 10px', borderRadius: '7px', fontSize: '10px', fontWeight: '700', cursor: 'pointer'
                          }}>{card.isBlocked ? 'Unblock' : 'Block'}</button>
                        )}

                        {/* Print individual card */}
                        {!isTcBlocked && (
                          <button onClick={() => printCardsWindow(eventDetails, tenant, card)} style={{
                            background: 'var(--surface-2)', border: '1px solid var(--border)',
                            color: 'var(--text-primary)', padding: '5px 10px',
                            borderRadius: '7px', fontSize: '10px', fontWeight: '700', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '3px'
                          }}>🖨 Print Card</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DashboardAdmitCards() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>}>
      <DashboardAdmitCardsContent />
    </Suspense>
  )
}
