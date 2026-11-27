import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — fetch published admit cards for the authenticated parent (all children) or student
export async function GET(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  try {
    let studentIds: string[] = []

    if (user!.role === 'STUDENT') {
      const stu = await prisma.student.findUnique({ where: { userId: user!.userId } })
      if (stu) studentIds.push(stu.id)
    } else if (user!.role === 'PARENT') {
      const parent = await prisma.parentProfile.findUnique({
        where: { userId: user!.userId },
        include: { children: { select: { id: true } } }
      })
      if (parent) studentIds = parent.children.map((c: any) => c.id)
    }

    if (studentIds.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const admitCards = await prisma.admitCard.findMany({
      where: {
        tenantId: user!.tenantId,
        studentId: { in: studentIds },
        isPublished: true,
        // Only published, not blocked (unless superAdminApproved)
      },
      include: {
        event: {
          select: {
            examName: true,
            startDate: true,
            endDate: true,
            timeTable: true,
            course: { select: { name: true } },
            batch: { select: { name: true } }
          }
        },
        student: {
          select: {
            fullName: true,
            fatherName: true,
            motherName: true,
            photo: true,
            scholarNo: true,
            studentId: true,
            dob: true,
            gender: true,
            phone: true,
            address: true,
          }
        },
        tenant: {
          select: {
            name: true,
            logo: true,
            address: true,
            phone: true,
            email: true,
            schoolCode: true,
            directorSign: true,
          }
        }
      },
      orderBy: { event: { startDate: 'desc' } }
    })

    // Filter out blocked (non-approved) cards at the application level
    const filtered = admitCards.filter(c => !c.isBlocked || c.superAdminApproved)

    return NextResponse.json({ success: true, data: filtered })
  } catch (err) {
    console.error('Fetch my admit cards error:', err)
    return NextResponse.json({ error: 'Failed to fetch admit cards' }, { status: 500 })
  }
}
