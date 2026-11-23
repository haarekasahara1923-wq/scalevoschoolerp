import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken } from '@/lib/auth'
import crypto from 'crypto'

const PLAN_MONTHS: Record<string, number> = {
  MONTHLY: 1,
  YEARLY: 12,
  THREE_YEARLY: 36,
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

async function generateUniqueSchoolCode(): Promise<string> {
  const year = new Date().getFullYear()
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  let exists = false
  do {
    const rand = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    code = 'SCL-' + year + '-' + rand
    exists = !!(await prisma.tenant.findUnique({ where: { schoolCode: code } }))
  } while (exists)
  return code
}

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, pendingSignupId } = await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !pendingSignupId) {
      return NextResponse.json({ error: 'Missing payment verification data' }, { status: 400 })
    }

    // Verify Razorpay signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(sign)
      .digest('hex')

    if (razorpay_signature !== expectedSign) {
      return NextResponse.json({ error: 'Payment signature verification failed' }, { status: 400 })
    }

    // Find pending signup
    const pending = await prisma.pendingSignup.findUnique({ where: { id: pendingSignupId } })

    if (!pending) {
      return NextResponse.json({ error: 'Signup session not found' }, { status: 404 })
    }

    if (pending.status !== 'PENDING') {
      return NextResponse.json({ error: 'This signup link has already been used or expired' }, { status: 400 })
    }

    if (pending.razorpayOrderId !== razorpay_order_id) {
      return NextResponse.json({ error: 'Order ID mismatch' }, { status: 400 })
    }

    // Check if email already taken (double-check)
    const existingUser = await prisma.user.findFirst({ where: { email: pending.adminEmail } })
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    // Generate slug
    let baseSlug = generateSlug(pending.schoolName)
    let slug = baseSlug
    let count = 1
    while (await prisma.tenant.findUnique({ where: { slug } })) {
      slug = baseSlug + '-' + (count++)
    }

    const schoolCode = await generateUniqueSchoolCode()
    const months = PLAN_MONTHS[pending.plan] || 1

    // Create tenant, user, subscription in transaction
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date()
      const periodEnd = new Date()
      periodEnd.setMonth(periodEnd.getMonth() + months)

      const tenant = await tx.tenant.create({
        data: {
          name: pending.schoolName,
          slug,
          schoolCode,
          address: pending.schoolAddress || null,
          phone: pending.schoolPhone || null,
          email: pending.schoolEmail || null,
          isActive: true,
          directorName: pending.directorName,
          directorPhone: pending.directorPhone || null,
          directorEmail: pending.directorEmail || pending.adminEmail,
        }
      })

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: pending.adminEmail,
          phone: pending.directorPhone || null,
          password: pending.hashedPassword,
          plainPassword: pending.plainPassword,
          name: pending.directorName,
          role: 'SUPER_ADMIN',
          isActive: true,
        }
      })

      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: pending.plan as any,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          amount: pending.amount,
          paidAt: now,
        }
      })

      // Mark pending signup as completed
      await tx.pendingSignup.update({
        where: { id: pendingSignupId },
        data: { status: 'COMPLETED' }
      })

      return { tenant, user }
    })

    // Generate JWT tokens
    const payload = {
      userId: result.user.id,
      tenantId: result.tenant.id,
      role: 'SUPER_ADMIN',
      email: pending.adminEmail,
    }

    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    return NextResponse.json({
      success: true,
      message: 'School registered successfully! Welcome to Sclevo School ERP.',
      accessToken,
      refreshToken,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: 'SUPER_ADMIN',
        tenantId: result.tenant.id,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        schoolCode: result.tenant.schoolCode,
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('Signup verify payment error:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
