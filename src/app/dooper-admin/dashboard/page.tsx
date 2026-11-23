'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Tenant {
  id: string
  name: string
  slug: string
  schoolCode: string | null
  registrationCode: string | null
  diseCode: string | null
  email: string
  phone: string
  address: string
  isActive: boolean
  createdAt: string
  directorName: string
  directorPhone: string
  directorEmail: string
  superAdminEmail: string
  superAdminPassword: string
  superAdminName: string
  superAdminId: string | null
  studentCount: number
  userCount: number
  plan: string
  subscriptionStatus: string
  subscriptionAmount: number
  razorpayPaymentId: string | null
  razorpayOrderId: string | null
  paidAt: string | null
  markedPaidByAdmin: boolean
  currentPeriodEnd: string | null
}

interface Stats {
  totalSchools: number
  activeSchools: number
  blockedSchools: number
  totalStudents: number
  paidSchools: number
  pendingPayment: number
}

type ModalType = 'edit' | 'delete' | 'broadcast' | 'markPaid' | null

const PLAN_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly (₹599)',
  YEARLY: 'Yearly (₹5,000)',
  THREE_YEARLY: '3-Year (₹12,000)',
  NONE: 'No Plan',
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  ACTIVE: { bg: 'rgba(16,185,129,0.15)', text: '#34d399', border: 'rgba(16,185,129,0.3)', label: '● Active' },
  PENDING_PAYMENT: { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24', border: 'rgba(251,191,36,0.3)', label: '⏳ Pending Payment' },
  SUSPENDED: { bg: 'rgba(239,68,68,0.12)', text: '#f87171', border: 'rgba(239,68,68,0.3)', label: '⛔ Suspended' },
  CANCELLED: { bg: 'rgba(107,114,128,0.12)', text: '#9ca3af', border: 'rgba(107,114,128,0.3)', label: '✕ Cancelled' },
  GRACE_PERIOD: { bg: 'rgba(249,115,22,0.12)', text: '#fb923c', border: 'rgba(249,115,22,0.3)', label: '⚠ Grace Period' },
}

export default function DooperDashboard() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [admin, setAdmin] = useState<any>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [stats, setStats] = useState<Stats>({ totalSchools: 0, activeSchools: 0, blockedSchools: 0, totalStudents: 0, paidSchools: 0, pendingPayment: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalType>(null)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [editForm, setEditForm] = useState<Partial<Tenant>>({})
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [markPaidPlan, setMarkPaidPlan] = useState('MONTHLY')

  useEffect(() => {
    const t = localStorage.getItem('dooper_token')
    const a = localStorage.getItem('dooper_admin')
    if (!t) { router.replace('/dooper-admin'); return }
    setToken(t)
    if (a) setAdmin(JSON.parse(a))
  }, [router])

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/dooper-admin/tenants', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.status === 401) { localStorage.removeItem('dooper_token'); router.replace('/dooper-admin'); return }
      const data = await res.json()
      setTenants(data.tenants || [])
      setStats(data.stats || {})
    } catch { }
    setLoading(false)
  }, [token, router])

  useEffect(() => { if (token) fetchData() }, [token, fetchData])

  const showMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 4000) }

  const handleBlock = async (t: Tenant) => {
    if (!confirm(`${t.isActive ? 'Block' : 'Unblock'} "${t.name}"?`)) return
    setActionLoading(true)
    const res = await fetch('/api/dooper-admin/tenants', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tenantId: t.id, action: t.isActive ? 'block' : 'unblock' })
    })
    const data = await res.json()
    if (data.success) { showMsg(data.message); fetchData() }
    setActionLoading(false)
  }

  const handleDelete = async () => {
    if (!selectedTenant) return
    setActionLoading(true)
    const res = await fetch(`/api/dooper-admin/tenants?id=${selectedTenant.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    if (data.success) { showMsg(data.message); setModal(null); fetchData() }
    else showMsg(data.error || 'Failed')
    setActionLoading(false)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTenant) return
    setActionLoading(true)
    const res = await fetch('/api/dooper-admin/tenants', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tenantId: selectedTenant.id, action: 'edit', ...editForm })
    })
    const data = await res.json()
    if (data.success) { showMsg(data.message); setModal(null); fetchData() }
    setActionLoading(false)
  }

  const handleMarkPaid = async () => {
    if (!selectedTenant) return
    setActionLoading(true)
    const res = await fetch('/api/dooper-admin/tenants', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tenantId: selectedTenant.id, action: 'markPaid', plan: markPaidPlan })
    })
    const data = await res.json()
    if (data.success) { showMsg(data.message); setModal(null); fetchData() }
    else showMsg(data.error || 'Failed')
    setActionLoading(false)
  }

  const logout = () => {
    localStorage.removeItem('dooper_token')
    localStorage.removeItem('dooper_admin')
    router.push('/dooper-admin')
  }

  const openEdit = (t: Tenant) => {
    setSelectedTenant(t)
    setEditForm({ name: t.name, email: t.email, phone: t.phone, address: t.address, directorName: t.directorName, directorPhone: t.directorPhone, directorEmail: t.directorEmail })
    setModal('edit')
  }

  const openMarkPaid = (t: Tenant) => {
    setSelectedTenant(t)
    setMarkPaidPlan('MONTHLY')
    setModal('markPaid')
  }

  const openBroadcast = (t: Tenant) => { setSelectedTenant(t); setModal('broadcast') }

  const copyToClipboard = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedCode(id); setTimeout(() => setCopiedCode(null), 2000) } catch { }
  }

  const handleTopScroll = (e: any) => { const b = document.getElementById('table-scroll-bottom'); if (b) b.scrollLeft = e.target.scrollLeft }
  const handleBottomScroll = (e: any) => { const t = document.getElementById('table-scroll-top'); if (t) t.scrollLeft = e.target.scrollLeft }
  const togglePassword = (id: string) => setShowPasswords(p => ({ ...p, [id]: !p[id] }))

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.directorName?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase()) ||
    t.directorPhone?.includes(search) ||
    t.superAdminEmail?.toLowerCase().includes(search.toLowerCase())
  )

  const inputStyle = {
    width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(220,38,38,0.25)', borderRadius: '8px', color: 'white',
    fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#04030a', color: 'white', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        .tbl-scroll { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        th { padding: 10px 14px; text-align: left; font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.8px; background: rgba(220,38,38,0.06); border-bottom: 1px solid rgba(220,38,38,0.15); white-space: nowrap; }
        td { padding: 12px 14px; font-size: 12px; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; }
        tr:hover td { background: rgba(220,38,38,0.03); }
        .badge { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; white-space: nowrap; }
        .badge-active { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
        .badge-blocked { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
        .school-code-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.35); color: #fbbf24; padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 11px; font-weight: 800; letter-spacing: 1px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .school-code-badge:hover { background: rgba(251,191,36,0.2); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        select { background: rgba(255,255,255,0.08); border: 1px solid rgba(139,92,246,0.3); border-radius: 8px; color: white; padding: 10px 12px; font-size: 13px; outline: none; width: 100%; cursor: pointer; }
        select option { background: #1a1025; color: white; }
      `}</style>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(4,3,10,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(220,38,38,0.15)', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #dc2626, #991b1b)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>👁️</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: 'white', lineHeight: 1 }}>Sclevo School ERP</div>
            <div style={{ fontSize: '10px', color: '#f87171', fontWeight: '600', letterSpacing: '1px' }}>DOOPER ADMIN</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginLeft: '8px' }}>
            <span style={{ padding: '6px 14px', background: 'linear-gradient(135deg,#dc2626,#991b1b)', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: 'white' }}>
              🏫 All Schools
            </span>
            <Link href="/dooper-admin/dashboard/staff" style={{ padding: '6px 14px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#c4b5fd', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              👥 All Staff
            </Link>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {message && (
            <div style={{ padding: '6px 14px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', fontSize: '12px', color: '#34d399', animation: 'fadeIn 0.3s ease' }}>
              ✅ {message}
            </div>
          )}
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>👤 {admin?.name || 'Admin'}</div>
          <button onClick={logout} style={{ padding: '7px 14px', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            🚪 Logout
          </button>
        </div>
      </header>

      <main style={{ padding: '28px 24px', maxWidth: '1600px', margin: '0 auto' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: 'Total Schools', value: stats.totalSchools, icon: '🏫', color: '#a78bfa' },
            { label: 'Active Schools', value: stats.activeSchools, icon: '✅', color: '#34d399' },
            { label: 'Blocked Schools', value: stats.blockedSchools, icon: '⛔', color: '#f87171' },
            { label: 'Paid Schools', value: stats.paidSchools, icon: '💳', color: '#10b981' },
            { label: 'Pending Payment', value: stats.pendingPayment, icon: '⏳', color: '#fbbf24' },
            { label: 'Total Students', value: stats.totalStudents, icon: '👨‍🎓', color: '#fbbf24' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${s.color}25`, borderRadius: '14px', padding: '20px', borderLeft: `3px solid ${s.color}` }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontWeight: '600' }}>{s.label}</div>
            </div>
          ))}
          <Link href="/dooper-admin/dashboard/staff" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '14px', padding: '20px', borderLeft: '3px solid #a78bfa', textDecoration: 'none', display: 'block' }}>
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>👥</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#c4b5fd', lineHeight: 1 }}>View →</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontWeight: '600' }}>All Staff</div>
          </Link>
        </div>

        {/* Table */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(220,38,38,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontWeight: '800', fontSize: '17px', color: 'white' }}>🏫 All Registered Schools</h2>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Real-time registry — Sclevo School ERP Platform</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                placeholder="Search school, director, email, phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none', width: '280px', fontFamily: 'inherit' }}
              />
              <button onClick={fetchData} style={{ padding: '8px 14px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '13px', cursor: 'pointer', fontWeight: '700' }}>
                🔄 Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid rgba(220,38,38,0.2)', borderTopColor: '#dc2626', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              Loading schools...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
              {search ? '🔍 No schools found matching your search' : '🏫 No schools registered yet'}
            </div>
          ) : (
            <>
              <div id="table-scroll-top" style={{ overflowX: 'auto', marginBottom: '4px' }} onScroll={handleTopScroll}>
                <div style={{ height: '1px', width: '2200px' }}></div>
              </div>
              <div id="table-scroll-bottom" className="tbl-scroll" style={{ overflowX: 'auto' }} onScroll={handleBottomScroll}>
                <table style={{ minWidth: '2200px' }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>School Name</th>
                      <th>School ID</th>
                      <th>Director</th>
                      <th>Contact</th>
                      <th>Email</th>
                      <th>Address</th>
                      <th>Admin Email</th>
                      <th>Admin Password</th>
                      <th>Plan</th>
                      <th>Payment Status</th>
                      <th>Payment ID</th>
                      <th>Paid At</th>
                      <th>Valid Till</th>
                      <th>Students</th>
                      <th>School Status</th>
                      <th>Registered On</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t, i) => {
                      const subStatus = STATUS_COLORS[t.subscriptionStatus] || STATUS_COLORS['PENDING_PAYMENT']
                      return (
                        <tr key={t.id}>
                          <td style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>{i + 1}</td>
                          <td>
                            <div style={{ fontWeight: '700', color: 'white', whiteSpace: 'nowrap' }}>{t.name}</div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>/{t.slug}</div>
                          </td>
                          <td>
                            {t.schoolCode ? (
                              <span className="school-code-badge" onClick={() => openBroadcast(t)}>
                                {t.schoolCode} 📢
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>No ID</span>
                            )}
                          </td>
                          <td style={{ fontWeight: '600', color: '#e2e8f0', whiteSpace: 'nowrap' }}>{t.directorName || '—'}</td>
                          <td style={{ color: '#a5b4fc' }}>{t.directorPhone || t.phone || '—'}</td>
                          <td style={{ color: '#7dd3fc', fontSize: '11px' }}>{t.directorEmail || t.email || '—'}</td>
                          <td>
                            <div style={{ maxWidth: '140px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.4' }}>
                              {t.address || '—'}
                            </div>
                          </td>
                          <td style={{ fontSize: '11px', color: '#fde68a' }}>{t.superAdminEmail}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#c4b5fd', background: 'rgba(139,92,246,0.1)', padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                                {showPasswords[t.id] ? t.superAdminPassword : '••••••••'}
                              </span>
                              <button onClick={() => togglePassword(t.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '12px', padding: '2px' }}>
                                {showPasswords[t.id] ? '🙈' : '👁️'}
                              </button>
                            </div>
                          </td>
                          {/* Plan */}
                          <td>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#a78bfa', background: 'rgba(139,92,246,0.1)', padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                              {PLAN_LABELS[t.plan] || t.plan}
                            </span>
                          </td>
                          {/* Payment Status */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: subStatus.bg, color: subStatus.text, border: `1px solid ${subStatus.border}`, whiteSpace: 'nowrap' }}>
                                {subStatus.label}
                              </span>
                              {t.markedPaidByAdmin && (
                                <span style={{ fontSize: '9px', color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(251,191,36,0.2)' }}>
                                  Admin Override
                                </span>
                              )}
                            </div>
                          </td>
                          {/* Payment ID */}
                          <td>
                            {t.razorpayPaymentId ? (
                              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6ee7b7', background: 'rgba(110,231,183,0.08)', padding: '3px 6px', borderRadius: '4px', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {t.razorpayPaymentId}
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>—</span>
                            )}
                          </td>
                          {/* Paid At */}
                          <td style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
                            {t.paidAt ? new Date(t.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          {/* Valid Till */}
                          <td style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
                            {t.currentPeriodEnd ? new Date(t.currentPeriodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td style={{ fontWeight: '700', color: '#fbbf24' }}>{t.studentCount}</td>
                          <td>
                            <span className={`badge ${t.isActive ? 'badge-active' : 'badge-blocked'}`}>
                              {t.isActive ? '● Active' : '⛔ Blocked'}
                            </span>
                          </td>
                          <td style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
                            {new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              <button onClick={() => openEdit(t)} style={{ padding: '4px 8px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '5px', color: '#a5b4fc', fontSize: '10px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                ✏️ Edit
                              </button>
                              <button onClick={() => handleBlock(t)} disabled={actionLoading} style={{ padding: '4px 8px', background: t.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${t.isActive ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`, borderRadius: '5px', color: t.isActive ? '#f87171' : '#34d399', fontSize: '10px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                {t.isActive ? '⛔ Block' : '🟢 Unblock'}
                              </button>
                              <button onClick={() => openMarkPaid(t)} style={{ padding: '4px 8px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '5px', color: '#34d399', fontSize: '10px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                ✅ Mark Paid
                              </button>
                              <button onClick={() => { setSelectedTenant(t); setModal('delete') }} style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '5px', color: '#f87171', fontSize: '10px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Mark Paid Modal */}
      {modal === 'markPaid' && selectedTenant && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: '#0d0b14', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '460px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '52px', marginBottom: '12px' }}>✅</div>
              <h3 style={{ fontWeight: '900', fontSize: '20px', color: 'white', marginBottom: '6px' }}>Mark as Paid</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: '1.6' }}>
                Razorpay flow bypass karke <strong style={{ color: 'white' }}>{selectedTenant.name}</strong> ko manually paid mark karein. Ye school turant activate ho jayegi.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Select Plan *</label>
              <select value={markPaidPlan} onChange={e => setMarkPaidPlan(e.target.value)}>
                <option value="MONTHLY">Monthly — ₹599 (1 Month)</option>
                <option value="YEARLY">Yearly — ₹5,000 (12 Months)</option>
                <option value="THREE_YEARLY">3-Year — ₹12,000 (36 Months)</option>
              </select>
            </div>

            <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '10px', padding: '12px', marginBottom: '20px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.7' }}>
              ℹ️ Ye action dooper admin ke naam se record hoga. School portal immediately active ho jayega.
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>
                Cancel
              </button>
              <button onClick={handleMarkPaid} disabled={actionLoading} style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                {actionLoading ? 'Processing...' : '✅ Mark Paid & Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {modal === 'edit' && selectedTenant && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: '#0d0b14', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '18px', padding: '28px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontWeight: '800', fontSize: '18px' }}>✏️ Edit School</h3>
              <button onClick={() => setModal(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>
            <form onSubmit={handleEdit}>
              <div style={{ display: 'grid', gap: '14px' }}>
                {[
                  { label: 'School Name *', key: 'name', required: true },
                  { label: 'Director Name', key: 'directorName' },
                  { label: 'Director Phone', key: 'directorPhone' },
                  { label: 'Director Email', key: 'directorEmail' },
                  { label: 'School Email', key: 'email' },
                  { label: 'School Phone', key: 'phone' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '5px' }}>{f.label}</label>
                    <input
                      required={f.required}
                      value={(editForm as any)[f.key] || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '5px' }}>Address</label>
                  <textarea value={editForm.address || ''} onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setModal(null)} style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button type="submit" disabled={actionLoading} style={{ flex: 2, padding: '11px', background: 'linear-gradient(135deg, #dc2626, #991b1b)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  {actionLoading ? 'Saving...' : '✅ Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modal === 'delete' && selectedTenant && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: '#0d0b14', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '18px', padding: '32px', width: '100%', maxWidth: '440px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
              <h3 style={{ fontWeight: '900', fontSize: '20px', color: '#f87171', marginBottom: '8px' }}>Delete School?</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: '1.6' }}>
                You are about to permanently delete <strong style={{ color: 'white' }}>{selectedTenant.name}</strong> and ALL its data. This cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
              <button onClick={handleDelete} disabled={actionLoading} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #dc2626, #7f1d1d)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                {actionLoading ? 'Deleting...' : '🗑️ Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {modal === 'broadcast' && selectedTenant && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: '#0d0b14', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '24px', padding: '36px', width: '100%', maxWidth: '540px', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '52px', marginBottom: '10px' }}>📢</div>
              <h3 style={{ fontWeight: '900', fontSize: '20px', color: 'white', marginBottom: '6px' }}>Broadcast School ID</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Share with teachers, parents & students of <strong style={{ color: '#fbbf24' }}>{selectedTenant.name}</strong></p>
            </div>
            <div style={{ background: 'rgba(251,191,36,0.08)', border: '2px solid rgba(251,191,36,0.4)', borderRadius: '14px', padding: '20px', textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(251,191,36,0.6)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '10px' }}>App School ID</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#fbbf24', fontFamily: 'monospace', letterSpacing: '4px', marginBottom: '14px' }}>{selectedTenant.schoolCode}</div>
              <button onClick={() => copyToClipboard(selectedTenant.schoolCode!, 'code')}
                style={{ padding: '7px 18px', background: copiedCode === 'code' ? 'rgba(16,185,129,0.2)' : 'rgba(251,191,36,0.15)', border: `1px solid ${copiedCode === 'code' ? 'rgba(16,185,129,0.5)' : 'rgba(251,191,36,0.4)'}`, borderRadius: '8px', color: copiedCode === 'code' ? '#34d399' : '#fbbf24', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                {copiedCode === 'code' ? '✅ Copied!' : '📋 Copy ID'}
              </button>
            </div>
            <button onClick={() => setModal(null)} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'rgba(255,255,255,0.6)', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
