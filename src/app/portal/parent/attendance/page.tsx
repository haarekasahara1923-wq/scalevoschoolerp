'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Child {
  id: string
  fullName: string
  rollNo?: string
  course?: { id: string; name: string }
  batch?: { id: string; name: string }
}

interface AttendanceRecord {
  id: string
  date: string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE'
  notes?: string
  studentName?: string
}

interface AttendanceStats {
  total: number
  present: number
  absent: number
  late: number
  halfDay: number
  leave: number
  percentage: number
}

const statusConfig: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
  PRESENT: { label: 'Present', icon: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
  ABSENT: { label: 'Absent', icon: '❌', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
  LATE: { label: 'Late', icon: '⏰', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  HALF_DAY: { label: 'Half Day', icon: '🌓', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.3)' },
  LEAVE: { label: 'Leave', icon: '🏖️', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.3)' },
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function ParentAttendancePage() {
  const { token } = useAuth()
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string>('')
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<AttendanceStats>({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    leave: 0,
    percentage: 0
  })
  const [loading, setLoading] = useState(true)

  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear())

  // Load children on mount
  useEffect(() => {
    if (!token) return
    const h = { Authorization: `Bearer ${token}` }

    fetch('/api/parent', { headers: h })
      .then(r => r.json())
      .then(d => {
        const kids: Child[] = d.profile?.children || []
        setChildren(kids)
        if (kids.length > 0) {
          // Check query param for childId
          const params = new URLSearchParams(window.location.search)
          const childParam = params.get('childId')
          if (childParam && kids.some(k => k.id === childParam)) {
            setSelectedChildId(childParam)
          } else {
            setSelectedChildId(kids[0].id)
          }
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }, [token])

  // Load attendance when child or month changes
  useEffect(() => {
    if (!token || !selectedChildId) return
    setLoading(true)

    const url = `/api/attendance?studentId=${selectedChildId}&month=${selectedMonth}&year=${selectedYear}`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setRecords(d.data || [])
          if (d.stats) setStats(d.stats)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [selectedChildId, selectedMonth, selectedYear, token])

  const selectedChild = children.find(c => c.id === selectedChildId)

  // Find today's record if present in records
  const todayDateStr = new Date().toDateString()
  const todayRecord = records.find(r => new Date(r.date).toDateString() === todayDateStr)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', borderRadius: '16px', padding: '20px', color: 'white' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>✅ Children's Attendance</h1>
        <p style={{ fontSize: '12px', opacity: 0.9, margin: '4px 0 0 0' }}>
          Daily attendance records & monthly presence percentage
        </p>
      </div>

      {/* No Children Linked State */}
      {!loading && children.length === 0 && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '30px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>👶</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'white', marginBottom: '6px' }}>No Children Linked Yet</div>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
            Please link your children to your parent account to see their daily attendance records.
          </p>
          <Link href="/portal/parent/children" style={{ background: '#6366f1', color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>
            Link Children Now →
          </Link>
        </div>
      )}

      {/* Children Tabs */}
      {children.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {children.map(child => {
            const isSelected = child.id === selectedChildId
            return (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                style={{
                  background: isSelected ? '#3b82f6' : '#1e293b',
                  border: isSelected ? '1px solid #60a5fa' : '1px solid #334155',
                  color: isSelected ? 'white' : '#94a3b8',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: isSelected ? '700' : '500',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>🧒</span>
                <span>{child.fullName}</span>
                {child.course?.name && (
                  <span style={{ fontSize: '11px', opacity: 0.75 }}>({child.course.name})</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {selectedChild && (
        <>
          {/* Today's Attendance Card */}
          <div style={{
            background: todayRecord ? statusConfig[todayRecord.status]?.bg || '#1e293b' : '#1e293b',
            border: `1px solid ${todayRecord ? statusConfig[todayRecord.status]?.border || '#334155' : '#334155'}`,
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Today: {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'white', marginTop: '2px' }}>
                {selectedChild.fullName}
              </div>
            </div>
            <div>
              {todayRecord ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: statusConfig[todayRecord.status]?.bg,
                  border: `1px solid ${statusConfig[todayRecord.status]?.border}`,
                  padding: '6px 12px',
                  borderRadius: '20px',
                  color: statusConfig[todayRecord.status]?.color,
                  fontWeight: '700',
                  fontSize: '13px'
                }}>
                  <span>{statusConfig[todayRecord.status]?.icon}</span>
                  <span>{statusConfig[todayRecord.status]?.label}</span>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(148,163,184,0.1)',
                  border: '1px solid #334155',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  color: '#94a3b8',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  ⏳ Pending / Not Marked
                </div>
              )}
            </div>
          </div>

          {/* Month & Year Filter Bar */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#cbd5e1' }}>
              Select Month:
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: 'white',
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: 'white',
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Monthly Statistics Overview */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {months[selectedMonth - 1]} {selectedYear} Attendance
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: stats.percentage >= 75 ? '#10b981' : stats.percentage >= 50 ? '#f59e0b' : '#ef4444', marginTop: '2px' }}>
                  {stats.percentage}%
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Total Marked Days</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: 'white' }}>{stats.total} Days</div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ width: '100%', height: '8px', background: '#0f172a', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{
                width: `${stats.percentage}%`,
                height: '100%',
                background: stats.percentage >= 75 ? '#10b981' : stats.percentage >= 50 ? '#f59e0b' : '#ef4444',
                borderRadius: '4px',
                transition: 'width 0.4s ease'
              }} />
            </div>

            {/* Breakdown Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '10px 4px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#10b981' }}>{stats.present}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Present</div>
              </div>
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px 4px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#ef4444' }}>{stats.absent}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Absent</div>
              </div>
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '10px 4px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#f59e0b' }}>{stats.late}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Late</div>
              </div>
              <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '10px', padding: '10px 4px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#8b5cf6' }}>{stats.leave + stats.halfDay}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Leave/Half</div>
              </div>
            </div>
          </div>

          {/* Daily Attendance Log */}
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#cbd5e1', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Daily Attendance Log</span>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'normal' }}>
                {records.length} records found
              </span>
            </div>

            {loading ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '30px' }}>Loading records...</div>
            ) : records.length === 0 ? (
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>No Records for this Month</div>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  No attendance entries have been published for {months[selectedMonth - 1]} {selectedYear}.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {records.map(rec => {
                  const d = new Date(rec.date)
                  const conf = statusConfig[rec.status] || { label: rec.status, icon: '●', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: '#334155' }
                  return (
                    <div
                      key={rec.id}
                      style={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>
                          {d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          {d.toLocaleDateString('en-IN', { weekday: 'long' })}
                          {rec.notes && ` • "${rec.notes}"`}
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: conf.bg,
                        border: `1px solid ${conf.border}`,
                        color: conf.color,
                        padding: '5px 12px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '700',
                        flexShrink: 0
                      }}>
                        <span>{conf.icon}</span>
                        <span>{conf.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
