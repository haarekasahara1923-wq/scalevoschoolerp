import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — list all AdmitCardEvents for the tenant (for event picker in the admit cards page)
export async function GET(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  try {
    const url = new URL(req.url)
    const courseId = url.searchParams.get('courseId')
    const batchId = url.searchParams.get('batchId')

    const where: any = { tenantId: user!.tenantId }
    if (courseId) where.courseId = courseId
    if (batchId) where.batchId = batchId

    const events = await prisma.admitCardEvent.findMany({
      where,
      include: {
        course: { select: { name: true } },
        batch: { select: { name: true } },
        _count: { select: { admitCards: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: events })
  } catch (err) {
    console.error('Fetch admit card events error:', err)
    return NextResponse.json({ error: 'Failed to fetch admit card events' }, { status: 500 })
  }
}

// POST — create a new AdmitCardEvent + generate admit cards for all eligible students
// Eligible = ACTIVE status, NOT tcGenerated, NOT blocked (unless superAdminApproved)
export async function POST(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  try {
    const body = await req.json()
    const { courseId, batchId, examName, startDate, endDate } = body

    if (!courseId || !examName || !startDate || !endDate) {
      return NextResponse.json({
        error: 'Required fields missing: Class, Exam Name, Start Date, and End Date are mandatory'
      }, { status: 400 })
    }

    // Resolve batchId — AdmitCardEvent requires a batchId FK
    let resolvedBatchId = batchId && batchId !== 'all' ? batchId : null
    if (!resolvedBatchId) {
      let existingBatch = await prisma.batch.findFirst({
        where: { tenantId: user!.tenantId, courseId, isActive: true }
      })
      if (!existingBatch) {
        existingBatch = await prisma.batch.create({
          data: { tenantId: user!.tenantId, courseId, name: 'Section A', isActive: true }
        })
      }
      resolvedBatchId = existingBatch.id
    }

    // Fetch only ELIGIBLE students:
    // - status = ACTIVE
    // - tcGenerated = false (no TC issued)
    const studentWhere: any = {
      tenantId: user!.tenantId,
      courseId,
      status: 'ACTIVE',
      tcGenerated: false,
    }
    if (batchId && batchId !== 'all') {
      const hasBatchStudents = await prisma.student.count({
        where: { tenantId: user!.tenantId, courseId, batchId, status: 'ACTIVE' }
      })
      if (hasBatchStudents > 0) studentWhere.batchId = batchId
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      select: { id: true }
    })

    if (students.length === 0) {
      return NextResponse.json({
        error: 'No eligible active students found (blocked/TC students are excluded automatically).'
      }, { status: 400 })
    }

    const event = await prisma.admitCardEvent.create({
      data: {
        tenantId: user!.tenantId,
        courseId,
        batchId: resolvedBatchId,
        examName,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdBy: user!.userId,
        timeTable: body.timeTable || [],
        admitCards: {
          create: students.map(s => ({
            tenantId: user!.tenantId,
            studentId: s.id
          }))
        }
      }
    })

    return NextResponse.json({ success: true, data: event }, { status: 201 })
  } catch (err) {
    console.error('Create admit card event error:', err)
    return NextResponse.json({ error: 'Failed to create admit card event' }, { status: 500 })
  }
}
