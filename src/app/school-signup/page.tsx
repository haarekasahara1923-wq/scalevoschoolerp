'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Check } from 'lucide-react'

declare global {
  interface Window {
    Razorpay: any
  }
}

const PLANS = [
  {
    key: 'MONTHLY',
    label: 'Monthly',
    price: 599,
    display: '₹599',
    period: 'per month',
    icon: '📅',
    color: '#6366f1',
    duration: '1 Month',
  },
  {
    key: 'YEARLY',
    label: 'Yearly',
    price: 5000,
    display: '₹5,000',
    period: 'per year',
    icon: '🗓️',
    color: '#8b5cf6',
    popular: true,
    duration: '12 Months',
  },
  {
    key: 'THREE_YEARLY',
    label: '3-Year Plan',
    price: 12000,
    display: '₹12,000',
    period: 'for 3 years',
    icon: '🏆',
    color: '#7c3aed',
    duration: '36 Months',
    badge: 'Best Value',
  },
]

export default function SchoolSignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1=School Info, 2=Admin Credentials, 3=Plan Selection
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)

  // Auto-select plan from ?plan= query param (coming from login page)
  useEffect(() => {
    const planParam = searchParams.get('plan')
    if (planParam) {
      const validKeys = PLANS.map(p => p.key)
      if (validKeys.includes(planParam)) {
        setSelectedPlan(planParam)
      }
    }
  }, [searchParams])

  const [form, setForm] = useState({
    schoolName: '',
    schoolAddress: '',
    schoolPhone: '',
    schoolEmail: '',
    directorName: '',
    directorPhone: '',
    directorEmail: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  // Step 1 → 2
  const handleNext1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.schoolName.trim()) { setError('School name is required'); return }
    if (!form.directorName.trim()) { setError('Director name is required'); return }
    if (!form.directorPhone.trim()) { setError('Contact number is required'); return }
    if (!form.schoolAddress.trim()) { setError('School address is required'); return }
    setError('')
    setStep(2)
  }

  // Step 2 → 3
  const handleNext2 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email) { setError('Admin email is required'); return }
    if (!form.password || form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    setError('')
    setStep(3)
  }

  // Step 3 — Plan selected → Razorpay
  const handlePlanPayment = async () => {
    if (!selectedPlan) { setError('Please select a plan'); return }
    setError('')
    setPaymentLoading(true)

    try {
      // Ensure Razorpay script is loaded
      if (typeof window === 'undefined' || !(window as any).Razorpay) {
        const loaded = await new Promise<boolean>((resolve) => {
          const s = document.createElement('script')
          s.src = 'https://checkout.razorpay.com/v1/checkout.js'
          s.async = true
          s.onload = () => resolve(true)
          s.onerror = () => resolve(false)
          document.body.appendChild(s)
        })
        if (!loaded) {
          setError('Failed to load payment gateway. Please check your internet connection and try again.')
          setPaymentLoading(false)
          return
        }
      }

      // Create pending signup + Razorpay order
      const res = await fetch('/api/auth/signup-create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName: form.schoolName,
          schoolAddress: form.schoolAddress,
          schoolPhone: form.schoolPhone,
          schoolEmail: form.schoolEmail,
          directorName: form.directorName,
          directorPhone: form.directorPhone,
          directorEmail: form.directorEmail || form.email,
          email: form.email,
          password: form.password,
          plan: selectedPlan,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to create payment order')
        setPaymentLoading(false)
        return
      }

      const plan = PLANS.find(p => p.key === selectedPlan)!
      const keyId = data.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
      const cleanPhone = (form.directorPhone || '').replace(/[^0-9]/g, '').slice(-10)

      const options = {
        key: keyId,
        amount: data.amount,
        currency: 'INR',
        name: 'Sclevo School ERP',
        description: `${plan.label} Subscription - ${plan.display}`,
        order_id: data.orderId,
        handler: async function (response: any) {
          // Verify payment & create school account
          setLoading(true)
          setPaymentLoading(false)
          try {
            const verifyRes = await fetch('/api/auth/signup-verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                tenantId: data.tenantId,
              }),
            })

            const verifyData = await verifyRes.json()

            if (!verifyRes.ok || !verifyData.success) {
              setError(verifyData.error || 'Payment verification failed')
              setLoading(false)
              return
            }

            // Store tokens and redirect
            localStorage.setItem('scalevo_token', verifyData.accessToken)
            localStorage.setItem('scalevo_user', JSON.stringify(verifyData.user))
            localStorage.setItem('scalevo_tenant', JSON.stringify(verifyData.tenant))
            localStorage.setItem('scalevo_refresh', verifyData.refreshToken)

            router.push('/dashboard')
          } catch {
            setError('Payment verification failed. Please contact support.')
            setLoading(false)
          }
        },
        prefill: {
          name: form.directorName,
          email: form.email,
          contact: cleanPhone,
        },
        theme: { color: '#8b5cf6' },
        modal: {
          escape: false,
          backdropclose: false,
          ondismiss: () => {
            setPaymentLoading(false)
          }
        }
      }

      const rzp = new (window as any).Razorpay(options)

      rzp.on('payment.failed', function (response: any) {
        console.error('Razorpay payment failed:', response.error)
        setPaymentLoading(false)
        const reason = response.error?.description || response.error?.reason || 'Payment failed or rejected by gateway'
        setError(`Payment Failed: ${reason}`)
      })

      rzp.open()
    } catch (err: any) {
      console.error('Payment initialization error:', err)
      setError(err?.message || 'Failed to initiate payment. Please try again.')
      setPaymentLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(139,92,246,0.3)',
    borderRadius: '10px',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '6px',
  }

  const steps = ['School Info', 'Admin Login', 'Choose Plan']

  return (
    <div style={{ minHeight: '100vh', background: '#080614', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Inter', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); * { box-sizing: border-box; }`}</style>

      {/* Background gradients */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '15%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '15%', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: step === 3 ? '860px' : '520px', position: 'relative', transition: 'max-width 0.3s ease' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 14px', boxShadow: '0 8px 32px rgba(139,92,246,0.4)' }}>🏫</div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#a78bfa', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>SCLEVO SCHOOL ERP</div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'white', lineHeight: 1.2, marginBottom: '8px' }}>Register Your School</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Apne school ka digital portal setup karein</p>
        </div>

        {/* Step indicator */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '30px', padding: '8px 18px' }}>
            <span style={{ fontSize: '13px', color: '#34d399', fontWeight: '600' }}>
              👨‍🎓 Student, Teacher, ya Parent hain?{' '}
              <Link href="/register" style={{ color: 'white', fontWeight: '800', textDecoration: 'underline' }}>
                Yahan Sign Up karein →
              </Link>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0px', marginBottom: '24px', alignItems: 'center', justifyContent: 'center' }}>
          {steps.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: step > i + 1 ? 'linear-gradient(135deg, #10b981, #059669)' : step === i + 1 ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'rgba(255,255,255,0.08)',
                  border: `2px solid ${step >= i + 1 ? (step > i + 1 ? '#10b981' : '#8b5cf6') : 'rgba(255,255,255,0.15)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '700', color: step >= i + 1 ? 'white' : 'rgba(255,255,255,0.3)',
                  flexShrink: 0,
                }}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: '12px', color: step >= i + 1 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                  {s}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: '32px', height: '1px', background: step > i + 1 ? '#10b981' : 'rgba(255,255,255,0.1)', margin: '0 8px' }} />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        {step !== 3 ? (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '20px', padding: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>

            {/* STEP 1 — School Info */}
            {step === 1 && (
              <form onSubmit={handleNext1}>
                <div style={{ padding: '10px 14px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>
                  🏫 <strong style={{ color: '#c4b5fd' }}>Step 1:</strong> Tell us about your school
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>School / Institution Name *</label>
                  <input type="text" required value={form.schoolName} onChange={e => set('schoolName', e.target.value)} placeholder="e.g., Sunrise International Academy" style={inputStyle} />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Director / Principal Name *</label>
                  <input type="text" required value={form.directorName} onChange={e => set('directorName', e.target.value)} placeholder="Full name of school director" style={inputStyle} />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Contact Number *</label>
                  <input type="tel" required value={form.directorPhone} onChange={e => set('directorPhone', e.target.value)} placeholder="Director's mobile number" style={inputStyle} />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>School Address *</label>
                  <textarea required value={form.schoolAddress} onChange={e => set('schoolAddress', e.target.value)} placeholder="Full address of the school including city, state" rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  <div>
                    <label style={labelStyle}>School Phone (Optional)</label>
                    <input type="tel" value={form.schoolPhone} onChange={e => set('schoolPhone', e.target.value)} placeholder="School landline" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>School Email (Optional)</label>
                    <input type="email" value={form.schoolEmail} onChange={e => set('schoolEmail', e.target.value)} placeholder="school@example.com" style={inputStyle} />
                  </div>
                </div>

                {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px', marginBottom: '14px', fontSize: '13px', color: '#fca5a5' }}>⚠️ {error}</div>}

                <button type="submit" style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 20px rgba(139,92,246,0.35)' }}>
                  Continue to Login Setup →
                </button>
              </form>
            )}

            {/* STEP 2 — Admin Credentials */}
            {step === 2 && (
              <form onSubmit={handleNext2}>
                <div style={{ padding: '10px 14px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>
                  🔐 <strong style={{ color: '#c4b5fd' }}>Step 2:</strong> Set up your admin login credentials
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Admin Email *</label>
                  <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="your@email.com" style={inputStyle} />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? 'text' : 'password'} required value={form.password} onChange={e => set('password', e.target.value)} placeholder="Minimum 6 characters" style={{ ...inputStyle, paddingRight: '48px' }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '4px', top: 0, bottom: 0, width: '42px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>Confirm Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showConfirm ? 'text' : 'password'} required value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} placeholder="Re-enter your password" style={{ ...inputStyle, paddingRight: '48px' }} />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: '4px', top: 0, bottom: 0, width: '42px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px', marginBottom: '14px', fontSize: '13px', color: '#fca5a5' }}>⚠️ {error}</div>}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => { setStep(1); setError('') }} style={{ flex: 1, padding: '13px', background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                    ← Back
                  </button>
                  <button type="submit" style={{ flex: 2, padding: '13px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 20px rgba(139,92,246,0.35)' }}>
                    Continue to Plan Selection →
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* STEP 3 — Plan Selection */
          <div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '20px', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', marginBottom: '20px' }}>
              <div style={{ padding: '10px 14px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '10px', marginBottom: '24px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>
                💳 <strong style={{ color: '#c4b5fd' }}>Step 3:</strong> Choose your subscription plan — payment se pehle school register nahi hoga
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {PLANS.map(plan => (
                  <div
                    key={plan.key}
                    onClick={() => setSelectedPlan(plan.key)}
                    style={{
                      border: `2px solid ${selectedPlan === plan.key ? plan.color : 'rgba(139,92,246,0.15)'}`,
                      borderRadius: '16px',
                      padding: '24px',
                      cursor: 'pointer',
                      position: 'relative',
                      background: selectedPlan === plan.key ? `${plan.color}12` : 'rgba(255,255,255,0.02)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {plan.popular && (
                      <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', borderRadius: '20px', padding: '4px 14px', fontSize: '11px', fontWeight: '800', color: 'white', whiteSpace: 'nowrap' }}>
                        ⭐ Most Popular
                      </div>
                    )}
                    {plan.badge && !plan.popular && (
                      <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '20px', padding: '4px 14px', fontSize: '11px', fontWeight: '800', color: 'white', whiteSpace: 'nowrap' }}>
                        🏆 {plan.badge}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '24px', marginBottom: '4px' }}>{plan.icon}</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px' }}>{plan.label}</div>
                      </div>
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        border: `2px solid ${selectedPlan === plan.key ? plan.color : 'rgba(255,255,255,0.2)'}`,
                        background: selectedPlan === plan.key ? plan.color : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {selectedPlan === plan.key && <Check size={14} color="white" strokeWidth={3} />}
                      </div>
                    </div>

                    <div style={{ fontSize: '36px', fontWeight: '900', color: 'white', lineHeight: 1, marginBottom: '4px' }}>{plan.display}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>{plan.period}</div>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: `${plan.color}15`, border: `1px solid ${plan.color}30`, borderRadius: '6px', padding: '4px 10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: plan.color }}>✓ {plan.duration}</span>
                    </div>
                  </div>
                ))}
              </div>

              {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px', marginBottom: '14px', fontSize: '13px', color: '#fca5a5' }}>⚠️ {error}</div>}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => { setStep(2); setError('') }} style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handlePlanPayment}
                  disabled={!selectedPlan || paymentLoading || loading}
                  style={{
                    flex: 2, padding: '14px',
                    background: !selectedPlan ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700',
                    cursor: !selectedPlan || paymentLoading || loading ? 'not-allowed' : 'pointer',
                    boxShadow: selectedPlan ? '0 4px 20px rgba(139,92,246,0.35)' : 'none',
                    opacity: !selectedPlan ? 0.6 : 1,
                  }}
                >
                  {paymentLoading || loading
                    ? '🔄 Processing...'
                    : selectedPlan
                      ? `💳 Pay ${PLANS.find(p => p.key === selectedPlan)?.display} & Register →`
                      : '💳 Select a Plan to Continue'}
                </button>
              </div>

              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.7', textAlign: 'center' }}>
                🔒 Secure payment via Razorpay. Payment successful hone pe aapka school portal turant activate ho jayega.
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
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

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            Already registered?{' '}
            <Link href="/login" style={{ color: '#a78bfa', fontWeight: '700', textDecoration: 'none' }}>Sign in here →</Link>
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>
            Developed by Scalevo and copyright reserved to Scalevo
          </p>
        </div>
      </div>
    </div>
  )
}
