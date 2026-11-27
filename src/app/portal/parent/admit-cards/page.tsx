'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

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

// Generate full combined Admit Card + Timetable HTML for printing/PDF
function buildPrintHTML(card: any) {
  const sch = card.tenant || {}
  const stu = card.student || {}
  const ev = card.event || {}
  const timetable: any[] = Array.isArray(ev.timeTable) ? ev.timeTable : []
  const rollNo = stu.scholarNo || card.studentId || 'N/A'
  const schoolName = sch.name || 'School'
  const schoolLogo = sch.logo || ''

  const ttRows = timetable.map((t: any, i: number) => `
    <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#fff'}">
      <td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#1a237e;">${fmtDate(t.date)}</td>
      <td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #e2e8f0;font-weight:600;">${t.subject}</td>
      <td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #e2e8f0;">${fmtTime(t.startTime)} – ${fmtTime(t.endTime)}</td>
      <td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #e2e8f0;color:#059669;font-weight:700;">${t.duration || computeDuration(t.startTime, t.endTime) || '—'}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Admit Card – ${stu.fullName || ''}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',Arial,sans-serif;background:#e8ecf0;padding:16px;display:flex;justify-content:center;}
.card-wrap{width:210mm;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);}
.top-strip{height:6px;background:linear-gradient(90deg,#1a237e,#1565c0,#0288d1,#00acc1);}
.header{background:linear-gradient(135deg,#1a237e 0%,#1565c0 60%,#283593 100%);color:#fff;padding:14px 20px;display:flex;align-items:center;gap:14px;}
.logo-box{width:60px;height:60px;border-radius:10px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;}
.logo-box img{width:100%;height:100%;object-fit:cover;}
.header-text{flex:1;}
.school-name{font-size:16px;font-weight:900;letter-spacing:.5px;}
.school-sub{font-size:9.5px;color:rgba(255,255,255,.75);margin-top:3px;line-height:1.5;}
.header-tag{text-align:center;background:rgba(255,255,255,0.12);border-radius:8px;padding:8px 12px;flex-shrink:0;}
.tag-sub{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.7);}
.tag-main{font-size:16px;font-weight:900;letter-spacing:1px;color:#fbbf24;}
.exam-banner{background:linear-gradient(135deg,#1565c0,#0288d1);color:#fff;text-align:center;padding:8px 16px;font-size:13px;font-weight:800;letter-spacing:1px;}
.student-section{display:flex;gap:16px;padding:14px 20px;border-bottom:1px solid #f1f5f9;}
.student-grid{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:6px;}
.detail-row{display:flex;flex-direction:column;gap:1px;padding:5px 8px;background:#f8fafc;border-radius:6px;border-left:3px solid #1565c0;}
.lbl{font-size:8.5px;text-transform:uppercase;letter-spacing:.5px;color:#64748b;font-weight:700;}
.val{font-size:12px;font-weight:600;color:#0f172a;}
.photo-box{width:90px;flex-shrink:0;text-align:center;}
.photo-box img{width:80px;height:96px;object-fit:cover;border:2px solid #1565c0;border-radius:8px;}
.photo-placeholder{width:80px;height:96px;border:2px dashed #cbd5e1;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#94a3b8;font-size:20px;}
.photo-label{font-size:9px;color:#94a3b8;margin-top:4px;font-weight:600;}
.instructions{padding:7px 20px;font-size:9.5px;color:#475569;background:#fffbeb;border-top:1px solid #fde68a;border-bottom:1px solid #e2e8f0;}
.cut-line{text-align:center;padding:5px;font-size:9px;color:#94a3b8;letter-spacing:1px;border-top:1px dashed #cbd5e1;background:#f8fafc;}
.tt-section{padding:12px 20px;}
.tt-title{font-size:12px;font-weight:800;color:#1a237e;margin-bottom:6px;}
.tt-sub{font-size:10px;color:#64748b;margin-bottom:8px;}
.tt-table{width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;font-size:11px;}
.tt-table thead tr{background:linear-gradient(135deg,#1a237e,#1565c0);color:#fff;}
.tt-table th{padding:7px 10px;text-align:left;font-weight:700;font-size:9.5px;text-transform:uppercase;letter-spacing:.4px;}
.signatures{display:flex;justify-content:space-between;padding:10px 24px;border-top:1px solid #e2e8f0;gap:16px;}
.sig-box{flex:1;text-align:center;}
.sig-line{height:36px;border-bottom:1.5px solid #0f172a;margin-bottom:4px;}
.sig-label{font-size:9px;text-transform:uppercase;letter-spacing:.4px;font-weight:700;color:#475569;}
.bottom-strip{background:linear-gradient(135deg,#1a237e,#1565c0);color:rgba(255,255,255,0.65);text-align:center;padding:5px 16px;font-size:9px;}
@media print{
  body{background:#fff;padding:0;}
  .card-wrap{width:100%;box-shadow:none;border-radius:0;}
  @page{margin:8mm;size:A4;}
}
</style>
</head>
<body>
<div class="card-wrap">
  <div class="top-strip"></div>
  <div class="header">
    <div class="logo-box">
      ${schoolLogo ? `<img src="${schoolLogo}" alt="Logo" onerror="this.src='/logo.png'"/>` : '<span style="font-size:28px">🏫</span>'}
    </div>
    <div class="header-text">
      <div class="school-name">${schoolName.toUpperCase()}</div>
      <div class="school-sub">
        ${sch.address ? `📍 ${sch.address}<br/>` : ''}
        ${sch.phone ? `📞 ${sch.phone}` : ''}${sch.phone && sch.email ? ' | ' : ''}${sch.email ? `✉ ${sch.email}` : ''}
      </div>
    </div>
    <div class="header-tag">
      <div class="tag-sub">HALL TICKET</div>
      <div class="tag-main">ADMIT CARD</div>
    </div>
  </div>
  <div class="exam-banner">
    ✦ &nbsp; ${ev.examName || 'Examination'} &nbsp; ✦
    <div style="font-size:10px;font-weight:600;margin-top:2px;opacity:0.9;">
      ${ev.course?.name || ''}${ev.batch?.name ? ' — ' + ev.batch.name : ''}
      &nbsp;|&nbsp; ${fmtDate(ev.startDate)} to ${fmtDate(ev.endDate)}
    </div>
  </div>
  <div class="student-section">
    <div class="student-grid">
      <div class="detail-row"><span class="lbl">Student Name</span><span class="val" style="font-weight:800;">${stu.fullName || ''}</span></div>
      <div class="detail-row"><span class="lbl">Roll No. / Scholar No.</span><span class="val" style="color:#dc2626;font-weight:900;">${rollNo}</span></div>
      <div class="detail-row"><span class="lbl">Father's Name</span><span class="val">${stu.fatherName || 'N/A'}</span></div>
      <div class="detail-row"><span class="lbl">Mother's Name</span><span class="val">${stu.motherName || 'N/A'}</span></div>
      <div class="detail-row"><span class="lbl">Class &amp; Section</span><span class="val">${ev.course?.name || ''}${ev.batch?.name ? ' - ' + ev.batch.name : ''}</span></div>
      <div class="detail-row"><span class="lbl">Date of Birth</span><span class="val">${stu.dob ? fmtDate(stu.dob) : 'N/A'}</span></div>
    </div>
    <div class="photo-box">
      ${stu.photo
      ? `<img src="${stu.photo}" alt="Photo" onerror="this.style.display='none'"/>`
      : '<div class="photo-placeholder">📷<br/><small>Photo</small></div>'}
      <div class="photo-label">Student Photo</div>
    </div>
  </div>
  <div class="instructions">
    <strong>Instructions:</strong> This admit card must be presented at the examination centre. • Report 20 minutes before the examination starts. • No electronic devices allowed. • This card is non-transferable and must be surrendered after the exam.
  </div>
  <div class="cut-line">✂ ─ ─ ─ ─ ─ ─ ─ ─ ─ EXAM TIME TABLE ─ ─ ─ ─ ─ ─ ─ ─ ✂</div>
  <div class="tt-section">
    <div class="tt-title">📅 Examination Schedule — ${ev.examName || ''}</div>
    <div class="tt-sub">${ev.course?.name || ''}${ev.batch?.name ? ' · ' + ev.batch.name : ''} &nbsp;|&nbsp; Roll No: <strong>${rollNo}</strong></div>
    ${timetable.length > 0 ? `
    <table class="tt-table">
      <thead>
        <tr><th>Date</th><th>Subject / Paper</th><th>Timings</th><th>Duration</th></tr>
      </thead>
      <tbody>${ttRows}</tbody>
    </table>` : '<div style="text-align:center;color:#94a3b8;padding:12px;font-size:12px;">Time table not yet available</div>'}
  </div>
  <div class="signatures">
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Student Signature</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Principal / Exam Controller</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Invigilator's Signature</div></div>
  </div>
  <div class="bottom-strip">
    Official document of ${schoolName} · Roll No: ${rollNo} · Keep this card safe — surrender after examination
  </div>
</div>
<script>window.onload=function(){window.print();}</script>
</body>
</html>`
}

function downloadCard(card: any) {
  const html = buildPrintHTML(card)
  const win = window.open('', '_blank', 'width=1000,height=800')
  if (!win) { alert('Please allow popups to download the admit card.'); return }
  win.document.open()
  win.document.write(html)
  win.document.close()
}

export default function ParentAdmitCards() {
  const { token } = useAuth()
  const [admitCards, setAdmitCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    fetch('/api/my-admit-cards', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) setAdmitCards(d.data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div style={{ color: 'white', textAlign: 'center', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#94a3b8', fontSize: '14px' }}>Loading admit cards...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '16px', borderRadius: '14px', border: '1px solid #334155' }}>
        <Link href="/portal/parent" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '20px' }}>←</Link>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0 }}>🎫 Admit Cards</h2>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
            {admitCards.length} admit card{admitCards.length !== 1 ? 's' : ''} — Upper half: Admit Card | Lower half: Exam Timetable
          </p>
        </div>
      </div>

      {admitCards.length === 0 && (
        <div style={{ background: '#1e293b', padding: '40px 20px', borderRadius: '16px', textAlign: 'center', border: '1px dashed #334155' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎫</div>
          <div style={{ color: '#94a3b8', fontSize: '14px' }}>No admit cards available yet.</div>
          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '6px' }}>Admit cards will appear here once published by the school.</div>
        </div>
      )}

      {admitCards.map((card: any) => {
        const timetable: any[] = Array.isArray(card.event?.timeTable) ? card.event.timeTable : []
        const rollNo = card.student?.scholarNo || card.studentId || 'N/A'
        const schoolName = card.tenant?.name || 'School'
        const schoolLogo = card.tenant?.logo || ''

        return (
          <div key={card.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Visual Admit Card Preview */}
            <div style={{
              background: 'white', borderRadius: '16px', overflow: 'hidden',
              border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              fontFamily: 'Arial, sans-serif'
            }}>
              {/* Top Strip */}
              <div style={{ height: '6px', background: 'linear-gradient(90deg, #1a237e, #1565c0, #0288d1)' }} />

              {/* School Header */}
              <div style={{
                background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #1565c0 100%)',
                padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '14px'
              }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {schoolLogo ? <img src={schoolLogo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <span style={{ fontSize: '24px' }}>🏫</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'white', fontWeight: '900', fontSize: '14px' }}>{schoolName.toUpperCase()}</div>
                  {card.tenant?.address && <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', marginTop: '2px' }}>{card.tenant.address}</div>}
                  {(card.tenant?.phone || card.tenant?.email) && (
                    <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '10px' }}>
                      {card.tenant.phone && `📞 ${card.tenant.phone}`}{card.tenant.phone && card.tenant.email && ' | '}{card.tenant.email && `✉ ${card.tenant.email}`}
                    </div>
                  )}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '8px', padding: '6px 10px', textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: '7px', letterSpacing: '2px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Hall Ticket</div>
                  <div style={{ fontSize: '14px', fontWeight: '900', color: '#fbbf24' }}>ADMIT CARD</div>
                </div>
              </div>

              {/* Exam Banner */}
              <div style={{ background: 'linear-gradient(135deg,#1565c0,#0288d1)', color: 'white', textAlign: 'center', padding: '8px 16px', fontSize: '13px', fontWeight: '800' }}>
                ✦ &nbsp; {card.event?.examName} &nbsp; ✦
                <div style={{ fontSize: '10px', marginTop: '2px', opacity: 0.9 }}>
                  {card.event?.course?.name}{card.event?.batch?.name ? ` — ${card.event.batch.name}` : ''} &nbsp;|&nbsp;
                  {fmtDate(card.event?.startDate)} to {fmtDate(card.event?.endDate)}
                </div>
              </div>

              {/* UPPER HALF — Student Details + Photo */}
              <div style={{ display: 'flex', gap: '14px', padding: '14px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {[
                    { label: 'Student Name', value: card.student?.fullName, bold: true },
                    { label: 'Roll No. / Scholar No.', value: rollNo, red: true },
                    { label: "Father's Name", value: card.student?.fatherName || 'N/A' },
                    { label: "Mother's Name", value: card.student?.motherName || 'N/A' },
                    { label: 'Class & Section', value: `${card.event?.course?.name || ''}${card.event?.batch?.name ? ' - ' + card.event.batch.name : ''}` },
                    { label: 'Date of Birth', value: card.student?.dob ? fmtDate(card.student.dob) : 'N/A' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '5px 8px', background: '#f8fafc', borderRadius: '6px', borderLeft: '3px solid #1565c0' }}>
                      <div style={{ fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', fontWeight: '700' }}>{item.label}</div>
                      <div style={{ fontSize: '12px', fontWeight: (item as any).bold ? '800' : (item as any).red ? '900' : '600', color: (item as any).red ? '#dc2626' : '#0f172a' }}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ width: '84px', flexShrink: 0, textAlign: 'center' }}>
                  {card.student?.photo
                    ? <img src={card.student.photo} style={{ width: '80px', height: '96px', objectFit: 'cover', border: '2px solid #1565c0', borderRadius: '8px' }} alt="Student" />
                    : <div style={{ width: '80px', height: '96px', border: '2px dashed #cbd5e1', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '20px' }}>📷<br /><small style={{ fontSize: '10px' }}>Photo</small></div>}
                  <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '4px', fontWeight: '600' }}>Student Photo</div>
                </div>
              </div>

              {/* Instructions */}
              <div style={{ padding: '7px 20px', fontSize: '9.5px', color: '#475569', background: '#fffbeb', borderBottom: '1px solid #e2e8f0' }}>
                <strong>Instructions:</strong> Present this admit card at the examination centre. • Report 20 minutes early. • No electronic devices allowed. • Non-transferable.
              </div>

              {/* Cut Line */}
              <div style={{ textAlign: 'center', padding: '5px', fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', borderTop: '1px dashed #cbd5e1', background: '#f8fafc' }}>
                ✂ ─ ─ ─ ─ ─ ─ ─ ─ EXAM TIME TABLE ─ ─ ─ ─ ─ ─ ─ ─ ✂
              </div>

              {/* LOWER HALF — Exam Timetable */}
              <div style={{ padding: '12px 20px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#1a237e', marginBottom: '4px' }}>
                  📅 Examination Schedule — {card.event?.examName}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '8px' }}>
                  Roll No: <strong>{rollNo}</strong>
                </div>
                {timetable.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg,#1a237e,#1565c0)', color: 'white' }}>
                        {['Date', 'Subject / Paper', 'Timings', 'Duration'].map(h => (
                          <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: '700' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timetable.map((t: any, i: number) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                          <td style={{ padding: '5px 8px', fontSize: '11px', borderBottom: '1px solid #e2e8f0', fontWeight: '700', color: '#1a237e' }}>{fmtDate(t.date)}</td>
                          <td style={{ padding: '5px 8px', fontSize: '11px', borderBottom: '1px solid #e2e8f0', fontWeight: '600' }}>{t.subject}</td>
                          <td style={{ padding: '5px 8px', fontSize: '11px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>{fmtTime(t.startTime)} – {fmtTime(t.endTime)}</td>
                          <td style={{ padding: '5px 8px', fontSize: '11px', borderBottom: '1px solid #e2e8f0', color: '#059669', fontWeight: '700' }}>{t.duration || computeDuration(t.startTime, t.endTime) || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '12px', fontSize: '12px', border: '1px dashed #e2e8f0', borderRadius: '8px' }}>
                    Time table not yet published
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 24px', borderTop: '1px solid #e2e8f0' }}>
                {['Student Signature', 'Principal / Exam Controller', "Invigilator's Signature"].map(lbl => (
                  <div key={lbl} style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ height: '32px', borderBottom: '1.5px solid #0f172a', marginBottom: '4px' }} />
                    <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: '700', color: '#475569' }}>{lbl}</div>
                  </div>
                ))}
              </div>

              {/* Bottom Strip */}
              <div style={{ background: 'linear-gradient(135deg, #1a237e, #1565c0)', color: 'rgba(255,255,255,0.65)', textAlign: 'center', padding: '5px 16px', fontSize: '9px' }}>
                Official document of {schoolName} · Roll No: {rollNo} · Keep this card safe
              </div>
            </div>

            {/* Download Button */}
            <button onClick={() => downloadCard(card)} style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white', padding: '14px', borderRadius: '12px',
              border: 'none', fontWeight: 'bold', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px', fontSize: '14px', boxShadow: '0 4px 12px rgba(99,102,241,0.4)'
            }}>
              <span>📥</span> Download / Print PDF
            </button>
          </div>
        )
      })}
    </div>
  )
}
