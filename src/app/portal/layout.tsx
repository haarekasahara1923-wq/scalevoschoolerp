'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

type NavItem = { href: string; icon: string; label: string; color?: string }

function PortalShell({ children }: { children: React.ReactNode }) {
  const { user, tenant, isLoading, logout, token } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading, router])

  useEffect(() => {
    setDrawerOpen(false)
    setQuickOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = drawerOpen || quickOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen, quickOpen])

  useEffect(() => {
    if (!isLoading && user && token && 'serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js')
        .then(async (reg) => {
          let sub = await reg.pushManager.getSubscription()
          if (!sub) {
            const pubKey = process.env.NEXT_PUBLIC_VAPID_KEY || 'BFG54n2XjD6u05w21Zsz2g5p7fR9n...'
            const padding = '='.repeat((4 - pubKey.length % 4) % 4)
            const base64 = (pubKey + padding).replace(/\-/g, '+').replace(/_/g, '/')
            const rawData = window.atob(base64)
            const outputArray = new Uint8Array(rawData.length)
            for (let i = 0; i < rawData.length; ++i) {
              outputArray[i] = rawData.charCodeAt(i)
            }
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: outputArray
            })
          }
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(sub)
          })
        }).catch(err => console.error('Push subscription failed:', err))
    }
  }, [user, isLoading, token])

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>Loading Sclevo School ERP...</p>
      </div>
    )
  }

  if (!user) return null

  const role = user.role

  // Full sidebar / hamburger drawer items per role
  const allSidebarItems: Record<string, NavItem[]> = {
    STUDENT: [
      { href: '/portal/student', icon: '🏠', label: 'Dashboard', color: '#6366f1' },
      { href: '/portal/student/homework', icon: '📚', label: 'My Homework', color: '#8b5cf6' },
      { href: '/portal/student/admit-cards', icon: '🎫', label: 'Admit Cards', color: '#10b981' },
      { href: '/portal/student/notices', icon: '📢', label: 'Notices', color: '#ec4899' },
    ],
    PARENT: [
      { href: '/portal/parent', icon: '🏠', label: 'Dashboard', color: '#ec4899' },
      { href: '/portal/parent/children', icon: '👶', label: 'Linked Children', color: '#f59e0b' },
      { href: '/portal/parent/attendance', icon: '✅', label: 'Attendance', color: '#10b981' },
      { href: '/portal/parent/fees', icon: '💳', label: 'Fee Ledger & Pay', color: '#3b82f6' },
      { href: '/portal/parent/homework', icon: '📚', label: 'Homework', color: '#8b5cf6' },
      { href: '/portal/parent/exams', icon: '📑', label: 'Exam Results', color: '#06b6d4' },
      { href: '/portal/parent/admit-cards', icon: '🎫', label: 'Admit Cards', color: '#f43f5e' },
    ],
    DRIVER: [
      { href: '/portal/driver', icon: '🚌', label: 'Driver Dashboard', color: '#f59e0b' },
    ],
    TEACHER: [
      { href: '/portal/staff', icon: '🏠', label: 'Dashboard', color: '#10b981' },
      { href: '/portal/staff/my-attendance', icon: '⏱️', label: 'My Attendance (IN/OUT)', color: '#10b981' },
      { href: '/portal/staff/attendance', icon: '✅', label: 'Student Attendance', color: '#059669' },
      { href: '/portal/staff/leaves', icon: '🏖️', label: 'My Leaves', color: '#f59e0b' },
      { href: '/portal/staff/timetable', icon: '📅', label: 'Time Table', color: '#3b82f6' },
      { href: '/portal/staff/salary', icon: '💰', label: 'Salary Ledger', color: '#14b8a6' },
      { href: '/portal/staff/homework', icon: '📚', label: 'Assign Homework', color: '#6366f1' },
      { href: '/portal/staff/homework/submissions', icon: '📋', label: 'Submissions', color: '#8b5cf6' },
      { href: '/portal/staff/exams', icon: '📝', label: 'Exams & Marks', color: '#06b6d4' },
      { href: '/portal/staff/exam-timetable', icon: '🗓️', label: 'Exam Time Table', color: '#f59e0b' },
      { href: '/portal/staff/admit-cards', icon: '🎫', label: 'Admit Cards', color: '#f43f5e' },
      { href: '/portal/staff/notices', icon: '📢', label: 'Notices', color: '#ec4899' },
      { href: '/portal/staff/profile', icon: '👤', label: 'My Profile', color: '#64748b' },
    ],
    STAFF: [
      { href: '/portal/staff', icon: '🏠', label: 'Dashboard', color: '#10b981' },
      { href: '/portal/staff/my-attendance', icon: '⏱️', label: 'My Attendance (IN/OUT)', color: '#10b981' },
      { href: '/portal/staff/attendance', icon: '✅', label: 'Student Attendance', color: '#059669' },
      { href: '/portal/staff/leaves', icon: '🏖️', label: 'My Leaves', color: '#f59e0b' },
      { href: '/portal/staff/timetable', icon: '📅', label: 'Time Table', color: '#3b82f6' },
      { href: '/portal/staff/salary', icon: '💰', label: 'Salary Ledger', color: '#14b8a6' },
      { href: '/portal/staff/homework', icon: '📚', label: 'Assign Homework', color: '#6366f1' },
      { href: '/portal/staff/homework/submissions', icon: '📋', label: 'Submissions', color: '#8b5cf6' },
      { href: '/portal/staff/exams', icon: '📝', label: 'Exams & Marks', color: '#06b6d4' },
      { href: '/portal/staff/exam-timetable', icon: '🗓️', label: 'Exam Time Table', color: '#f59e0b' },
      { href: '/portal/staff/admit-cards', icon: '🎫', label: 'Admit Cards', color: '#f43f5e' },
      { href: '/portal/staff/notices', icon: '📢', label: 'Notices', color: '#ec4899' },
      { href: '/portal/staff/profile', icon: '👤', label: 'My Profile', color: '#64748b' },
    ],
  }

  // Primary bottom navigation bar items (left 2 + center Quick Action + right 1 + Menu)
  const bottomBarByRole: Record<string, NavItem[]> = {
    STUDENT: [
      { href: '/portal/student', icon: '🏠', label: 'Home' },
      { href: '/portal/student/homework', icon: '📚', label: 'Homework' },
      { href: '/portal/student/notices', icon: '📢', label: 'Notices' },
    ],
    PARENT: [
      { href: '/portal/parent', icon: '🏠', label: 'Home' },
      { href: '/portal/parent/attendance', icon: '✅', label: 'Attendance' },
      { href: '/portal/parent/fees', icon: '💳', label: 'Fees' },
    ],
    DRIVER: [
      { href: '/portal/driver', icon: '🚌', label: 'Dashboard' },
    ],
    TEACHER: [
      { href: '/portal/staff', icon: '🏠', label: 'Home' },
      { href: '/portal/staff/my-attendance', icon: '⏱️', label: 'My Att.' },
      { href: '/portal/staff/attendance', icon: '✅', label: 'Students' },
    ],
    STAFF: [
      { href: '/portal/staff', icon: '🏠', label: 'Home' },
      { href: '/portal/staff/my-attendance', icon: '⏱️', label: 'My Att.' },
      { href: '/portal/staff/attendance', icon: '✅', label: 'Students' },
    ],
  }

  const sidebarItems = allSidebarItems[role] || allSidebarItems.STUDENT
  const bottomItems = bottomBarByRole[role] || bottomBarByRole.STUDENT
  const roleLabel = role === 'STUDENT' ? 'Student Portal' : role === 'PARENT' ? 'Parent Portal' : role === 'DRIVER' ? 'Driver Portal' : 'Staff Portal'

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', paddingBottom: 'calc(76px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Mobile App Top Header with Hamburger Button */}
      <header style={{
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '10px 14px',
        paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          {/* Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open Navigation Menu"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'white',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ☰
          </button>

          <div style={{ width: '34px', height: '34px', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <img src={tenant?.logo || '/logo.png'} alt="App Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'white', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tenant?.name || 'Sclevo School ERP'}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{roleLabel}</span>
              {tenant?.schoolCode && (
                <span style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.15)', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: '600', fontSize: '10px' }}>
                  {tenant.schoolCode}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          style={{
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171',
            borderRadius: '8px',
            padding: '6px 10px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Logout
        </button>
      </header>

      {/* Slide-out Hamburger Sidebar Drawer */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(4px)',
            zIndex: 2000,
            display: 'flex',
          }}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '280px',
              maxWidth: '82vw',
              height: '100%',
              background: '#111827',
              borderRight: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              boxShadow: '8px 0 30px rgba(0,0,0,0.6)',
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: '18px 16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={tenant?.logo || '/logo.png'} alt="Logo" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain', background: 'rgba(255,255,255,0.08)' }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{user.name}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{roleLabel}</div>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            {/* All Sidebar Links */}
            <div style={{ padding: '12px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {sidebarItems.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '11px 12px',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
                      border: active ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
                      color: active ? '#a5b4fc' : '#e2e8f0',
                      fontSize: '14px',
                      fontWeight: active ? '700' : '500',
                    }}
                  >
                    <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Drawer Footer */}
            <div style={{ padding: '14px 12px', borderTop: '1px solid #1e293b' }}>
              <button
                onClick={logout}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '10px',
                  background: 'rgba(239,68,68,0.14)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                🚪 Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Quick Actions Sheet Modal */}
      {quickOpen && (
        <div
          onClick={() => setQuickOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 2500,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#111827',
              borderTop: '2px solid rgba(99,102,241,0.45)',
              borderRadius: '22px 22px 0 0',
              padding: '18px 14px calc(24px + env(safe-area-inset-bottom, 0px))',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.7)',
            }}
          >
            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 14px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', padding: '0 4px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'white', margin: 0 }}>⚡ Quick Actions</h3>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{roleLabel} Shortcuts</p>
              </div>
              <button
                onClick={() => setQuickOpen(false)}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', maxHeight: '55vh', overflowY: 'auto' }}>
              {sidebarItems.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  onClick={() => setQuickOpen(false)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '12px 6px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px',
                    textDecoration: 'none',
                    textAlign: 'center',
                    gap: '6px',
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: `${action.color || '#6366f1'}22`,
                    border: `1px solid ${action.color || '#6366f1'}44`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}>
                    {action.icon}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#f1f5f9', lineHeight: 1.2 }}>
                    {action.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={{ padding: '16px', maxWidth: '640px', margin: '0 auto' }}>
        {children}
      </main>

      {/* Mobile App Bottom Navigation Bar with Center Quick Action Button & Menu */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(30, 41, 59, 0.97)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        height: '62px',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 50,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.45)',
      }}>
        {bottomItems.slice(0, 2).map((item) => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: 1, color: active ? '#818cf8' : '#94a3b8' }}>
              <span style={{ fontSize: '18px', lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontSize: '10px', fontWeight: active ? '700' : '500' }}>{item.label}</span>
            </Link>
          )
        })}

        {/* Center Elevated Quick Action Button */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setQuickOpen(!quickOpen)}
            aria-label="Quick Actions"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: '3px solid #0f172a',
              boxShadow: '0 4px 14px rgba(99,102,241,0.55)',
              color: 'white',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              marginTop: '-20px',
            }}
          >
            ⚡
          </button>
        </div>

        {bottomItems[2] && (
          <Link href={bottomItems[2].href} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: 1, color: pathname === bottomItems[2].href ? '#818cf8' : '#94a3b8' }}>
            <span style={{ fontSize: '18px', lineHeight: 1 }}>{bottomItems[2].icon}</span>
            <span style={{ fontSize: '10px', fontWeight: pathname === bottomItems[2].href ? '700' : '500' }}>{bottomItems[2].label}</span>
          </Link>
        )}

        {/* Menu Button (Opens Full Sidebar Drawer) */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            flex: 1,
            background: 'none',
            border: 'none',
            color: drawerOpen ? '#818cf8' : '#94a3b8',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <span style={{ fontSize: '18px', lineHeight: 1 }}>☰</span>
          <span style={{ fontSize: '10px', fontWeight: '600' }}>Menu</span>
        </button>
      </nav>
    </div>
  )
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PortalShell>{children}</PortalShell>
    </AuthProvider>
  )
}
