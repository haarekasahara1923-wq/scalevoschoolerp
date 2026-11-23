import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken } from '@/lib/auth'
import crypto from 'crypto'

const PLAN_MONTHS: Record<string, number> = {
  MONTHLY: 1,
  YEARLY: 12,
  THREE_YEARLY: 36,
}

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, tenantId } = await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !tenantId) {
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

    // Find the tenant and subscription
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: true,
        users: { where: { role: 'SUPER_ADMIN' }, take: 1 }
      }
    })

    if (!tenant) {
      return NextResponse.json({ error: 'School registration not found. Please contact support.' }, { status: 404 })
    }

    if (tenant.isActive) {
      // Already activated — just return tokens (idempotent)
      const user = tenant.users[0]
      if (!user) return NextResponse.json({ error: 'Admin user not found' }, { status: 404 })

      const payload = {
        userId: user.id,
        tenantId: tenant.id,
        role: 'SUPER_ADMIN',
        email: user.email,
      }

      return NextResponse.json({
        success: true,
        message: 'School already activated. Welcome to Sclevo School ERP!',
        accessToken: signAccessToken(payload),
        refreshToken: signRefreshToken(payload),
        user: { id: user.id, name: user.name, email: user.email, role: 'SUPER_ADMIN', tenantId: tenant.id },
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, schoolCode: tenant.schoolCode },
      })
    }

    const subscription = tenant.subscriptions[0]

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found. Please contact support.' }, { status: 404 })
    }

    // Verify order ID matches
    if (subscription.razorpayOrderId !== razorpay_order_id) {
      return NextResponse.json({ error: 'Order ID mismatch. Payment may be from a different session.' }, { status: 400 })
    }

    const months = PLAN_MONTHS[subscription.plan] || 1
    const now = new Date()
    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + months)

    // Activate tenant, user, subscription in one transaction
    const result = await prisma.$transaction(async (tx) => {
      // Activate tenant
      const updatedTenant = await tx.tenant.update({
        where: { id: tenantId },
        data: { isActive: true }
      })

      // Activate all users of this tenant
      await tx.user.updateMany({
        where: { tenantId },
        data: { isActive: true }
      })

      // Update subscription to ACTIVE
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          razorpayPaymentId: razorpay_payment_id,
          paidAt: now,
        }
      })

      return updatedTenant
    })

    // Get the super admin user
    const user = tenant.users[0]
    if (!user) return NextResponse.json({ error: 'Admin user not found' }, { status: 404 })

    // Generate JWT tokens
    const payload = {
      userId: user.id,
      tenantId: result.id,
      role: 'SUPER_ADMIN',
      email: user.email,
    }

    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    return NextResponse.json({
      success: true,
      message: 'School registered successfully! Welcome to Sclevo School ERP.',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'SUPER_ADMIN',
        tenantId: result.id,
      },
      tenant: {
        id: result.id,
        name: result.name,
        slug: result.slug,
        schoolCode: result.schoolCode,
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('Signup verify payment error:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
