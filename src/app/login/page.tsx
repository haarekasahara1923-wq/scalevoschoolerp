'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { Eye, EyeOff, ChevronDown, Check, Star, Zap, Shield, Users, BookOpen, BarChart2, Bell, CreditCard } from 'lucide-react'

// ─── Subscription Plans shown below login form ───────────────────────────────
const LOGIN_PLANS = [
  {
    key: 'MONTHLY',
    label: 'Monthly',
    emoji: '📅',
    price: '₹599',
    period: '/month',
    duration: '1 Month',
    color: '#6366f1',
    glow: 'rgba(99,102,241,0.25)',
    border: 'rgba(99,102,241,0.4)',
    features: [
      'Unlimited Students & Teachers',
      'Fee & Attendance Management',
      'Parent & Student Portal',
      'SMS / WhatsApp Alerts',
      'Basic Reports & Analytics',
    ],
  },
  {
    key: 'YEARLY',
    label: 'Yearly',
    emoji: '🗓️',
    price: '₹5,000',
    period: '/year',
    duration: '12 Months',
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.3)',
    border: 'rgba(139,92,246,0.5)',
    popular: true,
    features: [
      'Everything in Monthly',
      'Multi-Branch Support',
      'Advanced Analytics & Reports',
      'AI Tools & Mock Tests',
      'Priority Support',
    ],
  },
  {
    key: 'THREE_YEARLY',
    label: '3-Year Plan',
    emoji: '🏆',
    price: '₹12,000',
    period: '/3 years',
    duration: '36 Months',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.25)',
    border: 'rgba(245,158,11,0.45)',
    badge: 'Best Value',
    features: [
      'Everything in Yearly',
      'White-Label Branding',
      'Custom Domain',
      'API Access',
      'Franchise / Chain Mode',
    ],
  },
]

// ─── Feature icon list for the "Why Sclevo?" strip ───────────────────────────
const WHY_FEATURES = [
  { icon: <Users size={18} />, label: 'Unlimited Users' },
  { icon: <CreditCard size={18} />, label: 'Fee Management' },
  { icon: <Bell size={18} />, label: 'Smart Alerts' },
  { icon: <BarChart2 size={18} />, label: 'Analytics' },
  { icon: <BookOpen size={18} />, label: 'Digital Library' },
  { icon: <Shield size={18} />, label: 'Secure & Reliable' },
  { icon: <Zap size={18} />, label: 'AI-Powered' },
  { icon: <Star size={18} />, label: 'Multi-Branch' },
]

function PricingSection() {
  const router = useRouter()

  const handlePlanClick = (planKey: string) => {
    router.push(`/school-signup?plan=${planKey}`)
  }

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '0 16px 60px' }}>
      {/* Section heading */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '20px', padding: '6px 16px', marginBottom: '14px' }}>
          <Star size={14} color="#a78bfa" />
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#a78bfa', letterSpacing: '1px', textTransform: 'uppercase' }}>Subscription Plans</span>
        </div>
        <h2 style={{ fontSize: 'clamp(22px,5vw,32px)', fontWeight: '900', color: 'white', margin: '0 0 10px' }}>
          Apne School ke liye Best Plan Choose Karein
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          Sabhi plans mein unlimited students, teachers aur features included hain
        </p>
      </div>

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {LOGIN_PLANS.map(plan => (
          <div
            key={plan.key}
            onClick={() => handlePlanClick(plan.key)}
            style={{
              background: '#111a0e',
              border: `1px solid ${plan.border}`,
              borderRadius: '20px',
              padding: '24px',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: `0 8px 32px ${plan.glow}`,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = `0 16px 48px ${plan.glow}`
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${plan.glow}`
            }}
          >
            {/* Glow blob */}
            <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '100px', height: '100px', background: plan.glow, borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />

            {/* Popular / Best Value badge */}
            {(plan.popular || plan.badge) && (
              <div style={{ position: 'absolute', top: '12px', right: '12px', background: plan.color, borderRadius: '8px', padding: '3px 10px', fontSize: '10px', fontWeight: '800', color: 'white', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                {plan.popular ? '⭐ Most Popular' : plan.badge}
              </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', background: `${plan.color}20`, border: `1px solid ${plan.color}40`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                {plan.emoji}
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: 'white' }}>{plan.label}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>{plan.duration}</div>
              </div>
            </div>

            {/* Price */}
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '36px', fontWeight: '900', color: plan.color, lineHeight: 1 }}>{plan.price}</span>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>{plan.period}</span>
            </div>

            {/* Features */}
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: `${plan.color}25`, border: `1px solid ${plan.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={10} color={plan.color} strokeWidth={3} />
                  </div>
                  {f}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              style={{
                width: '100%',
                padding: '12px',
                background: `linear-gradient(135deg, ${plan.color}, ${plan.color}bb)`,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: `0 4px 16px ${plan.glow}`,
              }}
            >
              🚀 Get Started — {plan.price}
            </button>
          </div>
        ))}
      </div>

      {/* Why Sclevo strip */}
      <div style={{ background: '#111a0e', border: '1px solid rgba(26,92,56,0.25)', borderRadius: '16px', padding: '20px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '13px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Why Choose Sclevo ERP?
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
          {WHY_FEATURES.map(wf => (
            <div key={wf.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>
              <span style={{ color: '#4ade80' }}>{wf.icon}</span>
              {wf.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const SCHOOL_TENANT_ID = process.env.NEXT_PUBLIC_SCHOOL_TENANT_ID || ''

const ADMIN_SUB_ROLES = [
  { key: 'ADMIN_OPERATION', label: 'Admin Operation', icon: '⚙️' },
  { key: 'ADMIN_LIBRARY', label: 'Admin Library', icon: '📚' },
  { key: 'ADMIN_SPORTS', label: 'Admin Sports', icon: '🏆' },
  { key: 'ADMIN_TRANSPORT', label: 'Admin Transport', icon: '🚌' },
]

function LoginForm() {
  const { user, login } = useAuth()
  const router = useRouter()
  const [role, setRole] = useState('SUPER_ADMIN')
  const [showAdminDropdown, setShowAdminDropdown] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) redirectByRole(user.role)
  }, [user])

  const redirectByRole = (r: string) => {
    if (r === 'STUDENT') router.push('/portal/student')
    else if (r === 'PARENT') router.push('/portal/parent')
    else if (r === 'DRIVER') router.push('/portal/driver')
    else if (r === 'TEACHER' || r === 'STAFF') router.push('/portal/staff')
    else router.push('/dashboard')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Don't scope to SCHOOL_TENANT_ID from .env because the actual db tenantId might be a cuid.
    // Let the API search globally by email/phone.
    const tenantId = undefined

    const result = await login(identifier, password, role, tenantId)
    setLoading(false)

    if (result.success) {
      // Read from scalevo_user (current key); udba_user is legacy and no longer written
      const storedUser = localStorage.getItem('scalevo_user')
      if (storedUser) redirectByRole(JSON.parse(storedUser).role)
      else router.push('/dashboard')
    } else {
      setError(result.error || 'Login failed')
    }
  }

  const topRoles = [
    { key: 'SUPER_ADMIN', label: 'Super Admin', icon: '👑' },
    { key: 'COACHING_ADMIN', label: 'Admin', icon: '🏫', hasDropdown: true },
    { key: 'TEACHER', label: 'Teacher', icon: '👩‍🏫' },
    { key: 'PARENT', label: 'Parent', icon: '👨‍👩‍👧' },
    { key: 'STUDENT', label: 'Student', icon: '👨‍🎓' },
  ]

  const selectedAdminSub = ADMIN_SUB_ROLES.find(r => r.key === role)
  const isAdminSubRole = !!selectedAdminSub

  return (
    <div style={{ minHeight: '100vh', background: '#0a1208', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px 0' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 30% 50%, rgba(26,92,56,0.12) 0%, transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 70% 50%, rgba(249,115,22,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 14px', boxShadow: '0 8px 32px rgba(139,92,246,0.4)' }}>🏫</div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#a78bfa', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>SCLEVO SCHOOL ERP</div>
          <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'white', lineHeight: 1.2 }}>School Portal Login</h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', marginTop: '6px', fontSize: '13px' }}>Apne school dashboard mein sign in karein</p>
        </div>

        <div style={{ background: '#111a0e', border: '1px solid rgba(26,92,56,0.25)', borderRadius: '20px', padding: '28px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
          {/* Role Selector */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', background: '#172014', padding: '4px', borderRadius: '12px', marginBottom: '16px' }}>
            {topRoles.map(r => (
              <div key={r.key} style={{ flex: '1 1 auto', position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (r.hasDropdown) {
                      setShowAdminDropdown(!showAdminDropdown)
                    } else {
                      setRole(r.key)
                      setShowAdminDropdown(false)
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 4px',
                    borderRadius: '8px',
                    border: 'none',
                    background: (role === r.key || (r.hasDropdown && isAdminSubRole)) ? 'linear-gradient(135deg, #1a5c38, #0f3d26)' : 'transparent',
                    color: (role === r.key || (r.hasDropdown && isAdminSubRole)) ? 'white' : 'rgba(255,255,255,0.4)',
                    fontSize: '10px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{r.hasDropdown && isAdminSubRole ? selectedAdminSub!.icon : r.icon}</span>
                  {r.hasDropdown && isAdminSubRole ? selectedAdminSub!.label.replace('Admin ', '') : r.label}
                  {r.hasDropdown && <ChevronDown size={10} />}
                </button>

                {/* Admin sub-role dropdown */}
                {r.hasDropdown && showAdminDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, marginTop: '4px', background: '#1a2e18', border: '1px solid rgba(26,92,56,0.4)', borderRadius: '10px', padding: '4px', width: '160px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                    {/* Also show COACHING_ADMIN option */}
                    <button
                      type="button"
                      onClick={() => { setRole('COACHING_ADMIN'); setShowAdminDropdown(false) }}
                      style={{ width: '100%', padding: '8px 10px', background: role === 'COACHING_ADMIN' ? 'rgba(26,92,56,0.5)' : 'transparent', border: 'none', borderRadius: '6px', color: 'white', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}
                    >🏫 School Admin</button>
                    {ADMIN_SUB_ROLES.map(sub => (
                      <button
                        key={sub.key}
                        type="button"
                        onClick={() => { setRole(sub.key); setShowAdminDropdown(false) }}
                        style={{ width: '100%', padding: '8px 10px', background: role === sub.key ? 'rgba(26,92,56,0.5)' : 'transparent', border: 'none', borderRadius: '6px', color: 'white', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}
                      >{sub.icon} {sub.label}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} onClick={() => setShowAdminDropdown(false)}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Email / Mobile No.</label>
              <input
                type="text"
                style={{ width: '100%', padding: '11px 14px', background: '#172014', border: '1px solid rgba(26,92,56,0.3)', borderRadius: '10px', color: 'white', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}
                placeholder="your@email.com or 9876543210"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>Password</label>
                <Link href="/forgot-password" style={{ fontSize: '11px', color: '#2d8a57', fontWeight: '600', textDecoration: 'none' }}>Forgot password?</Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  style={{ width: '100%', padding: '11px 48px 11px 14px', background: '#172014', border: '1px solid rgba(26,92,56,0.3)', borderRadius: '10px', color: 'white', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '4px', top: 0, bottom: 0, width: '42px', background: 'transparent', border: 'none', cursor: 'pointer', color: showPassword ? '#4ade80' : 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px', marginBottom: '14px', fontSize: '13px', color: '#fca5a5' }}>⚠️ {error}</div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '13px', background: loading ? '#1a5c38' : 'linear-gradient(135deg, #1a5c38, #0f3d26)', color: 'white', border: '1px solid rgba(45,138,87,0.4)', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(26,92,56,0.35)' }}>
              {loading ? <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Signing in...</> : '🔑 Sign In to Portal'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
            Don't have an account?
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" style={{ padding: '8px 14px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34d399', borderRadius: '8px', fontSize: '12px', fontWeight: '700', textDecoration: 'none' }}>
              👨‍🎓 Student / Teacher / Parent Sign Up →
            </Link>
            <Link href="/school-signup" style={{ padding: '8px 14px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)', color: '#c4b5fd', borderRadius: '8px', fontSize: '12px', fontWeight: '700', textDecoration: 'none' }}>
              🏫 Register School →
            </Link>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
            📞 Helpline No:{' '}
            <a href="tel:8962678915" style={{ color: '#34d399', fontWeight: '700', textDecoration: 'none' }}>
              8962678915
            </a>
            {' '}| WhatsApp:{' '}
            <a href="https://wa.me/918962678915" target="_blank" rel="noopener noreferrer" style={{ color: '#25d366', fontWeight: '700', textDecoration: 'none' }}>
              8962678915
            </a>
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
      <PricingSection />
    </AuthProvider>
  )
}
