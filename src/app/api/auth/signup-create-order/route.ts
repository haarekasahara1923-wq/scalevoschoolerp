import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import Razorpay from 'razorpay'

const PLAN_AMOUNTS: Record<string, number> = {
  MONTHLY: 599,
  YEARLY: 5000,
  THREE_YEARLY: 12000,
}

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

    // Check if email already exists (active user)
    const existingUser = await prisma.user.findFirst({ where: { email: email.toLowerCase(), isActive: true } })
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    // Check if there's a pending (inactive) tenant with this email — reuse it
    const existingInactiveUser = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), isActive: false },
      include: { tenant: { include: { subscriptions: true } } }
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

    let tenantId: string
    let userId: string

    if (existingInactiveUser && existingInactiveUser.tenant) {
      // Reuse the existing pending tenant — update the razorpay order
      tenantId = existingInactiveUser.tenantId!
      userId = existingInactiveUser.id

      // Update the subscription with new order
      const existingSub = existingInactiveUser.tenant.subscriptions[0]
      if (existingSub) {
        await prisma.subscription.update({
          where: { id: existingSub.id },
          data: {
            plan: plan as any,
            amount,
            razorpayOrderId: order.id,
            status: 'PENDING_PAYMENT',
          }
        })
      } else {
        await prisma.subscription.create({
          data: {
            tenantId,
            plan: plan as any,
            status: 'PENDING_PAYMENT',
            amount,
            razorpayOrderId: order.id,
          }
        })
      }

      // Update password hash in case it changed
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPwd, plainPassword: password }
      })

    } else {
      // Generate unique slug
      let baseSlug = generateSlug(schoolName)
      let slug = baseSlug
      let count = 1
      while (await prisma.tenant.findUnique({ where: { slug } })) {
        slug = baseSlug + '-' + (count++)
      }

      const schoolCode = await generateUniqueSchoolCode()

      // Create Tenant (inactive), User (inactive), Subscription (PENDING_PAYMENT) in one transaction
      const result = await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: schoolName,
            slug,
            schoolCode,
            address: schoolAddress || null,
            phone: schoolPhone || null,
            email: schoolEmail || null,
            isActive: false, // Will be activated after payment
            directorName,
            directorPhone: directorPhone || null,
            directorEmail: directorEmail || email,
          }
        })

        const user = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: email.toLowerCase(),
            phone: directorPhone || null,
            password: hashedPwd,
            plainPassword: password,
            name: directorName,
            role: 'SUPER_ADMIN',
            isActive: false, // Will be activated after payment
          }
        })

        await tx.subscription.create({
          data: {
            tenantId: tenant.id,
            plan: plan as any,
            status: 'PENDING_PAYMENT',
            amount,
            razorpayOrderId: order.id,
          }
        })

        return { tenant, user }
      })

      tenantId = result.tenant.id
      userId = result.user.id
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: 'INR',
      tenantId,
      userId,
      keyId: key_id,
    })
  } catch (error: any) {
    console.error('Signup create order error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to create payment order' }, { status: 500 })
  }
}
