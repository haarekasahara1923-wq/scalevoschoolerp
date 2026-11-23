import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import Razorpay from 'razorpay'

const PLAN_AMOUNTS: Record<string, number> = {
  MONTHLY: 599,
  YEARLY: 5000,
  THREE_YEARLY: 12000,
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      schoolName, schoolAddress, schoolPhone, schoolEmail,
      directorName, directorPhone, directorEmail,
      email, password, plan
    } = body

    // Validations
    if (!schoolName || !directorName || !email || !password || !plan) {
      return NextResponse.json({ error: 'All required fields must be filled' }, { status: 400 })
    }

    if (!['MONTHLY', 'YEARLY', 'THREE_YEARLY'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Check if email already exists
    const existingUser = await prisma.user.findFirst({ where: { email: email.toLowerCase() } })
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    // Check if there's already a pending signup with this email
    const existingPending = await prisma.pendingSignup.findFirst({
      where: { adminEmail: email.toLowerCase(), status: 'PENDING' }
    })

    // Setup Razorpay
    const key_id = process.env.RAZORPAY_KEY_ID || ''
    const key_secret = process.env.RAZORPAY_KEY_SECRET || ''

    if (!key_id || !key_secret) {
      return NextResponse.json({ error: 'Payment gateway not configured. Please contact support.' }, { status: 500 })
    }

    const razorpay = new Razorpay({ key_id, key_secret })
    const amount = PLAN_AMOUNTS[plan]

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount * 100, // in paise
      currency: 'INR',
      receipt: `sclevo_signup_${Date.now()}`,
      notes: {
        schoolName,
        adminEmail: email,
        plan,
      }
    })

    const hashedPwd = await hashPassword(password)

    // Expire old pending signups for same email
    if (existingPending) {
      await prisma.pendingSignup.updateMany({
        where: { adminEmail: email.toLowerCase(), status: 'PENDING' },
        data: { status: 'EXPIRED' }
      })
    }

    // Store pending signup (expires in 2 hours)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 2)

    const pendingSignup = await prisma.pendingSignup.create({
      data: {
        schoolName,
        schoolAddress: schoolAddress || null,
        schoolPhone: schoolPhone || null,
        schoolEmail: schoolEmail || null,
        directorName,
        directorPhone: directorPhone || null,
        directorEmail: directorEmail || email,
        adminEmail: email.toLowerCase(),
        hashedPassword: hashedPwd,
        plainPassword: password,
        plan,
        amount,
        razorpayOrderId: order.id,
        expiresAt,
      }
    })

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: 'INR',
      pendingSignupId: pendingSignup.id,
      keyId: key_id,
    })
  } catch (error: any) {
    console.error('Signup create order error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to create payment order' }, { status: 500 })
  }
}
