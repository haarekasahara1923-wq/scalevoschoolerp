import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

// Returns the logged-in teacher's Teacher record (auto-resolved from token)
export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    if (!['TEACHER', 'STAFF'].includes(user!.role)) {
        return NextResponse.json({ error: 'Only teachers/staff can access this endpoint' }, { status: 403 })
    }

    try {
        const teacher = await prisma.teacher.findFirst({
            where: {
                tenantId: user!.tenantId,
                OR: [
                    { email: user!.email },
                    ...(user!.phone ? [{ phone: user!.phone }] : []),
                ]
            }
        })

        if (!teacher) {
            return NextResponse.json({ error: 'Teacher profile not found. Please contact admin.' }, { status: 404 })
        }

        return NextResponse.json({ success: true, data: teacher })
    } catch (err) {
        console.error('Fetch teacher me error:', err)
        return NextResponse.json({ error: 'Failed to fetch teacher profile' }, { status: 500 })
    }
}
