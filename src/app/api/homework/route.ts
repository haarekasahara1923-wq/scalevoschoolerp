import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/app/api/middleware'

export async function GET(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  const { searchParams } = new URL(req.url)
  const batchId = searchParams.get('batchId')
  const courseId = searchParams.get('courseId')

  const where: any = { tenantId: user!.tenantId }
  if (batchId) {
    where.batchId = batchId
  } else if (courseId) {
    where.batch = { courseId }
  }

  let student: any = null

  if (user!.role === 'STUDENT') {
    student = await prisma.student.findFirst({
      where: {
        tenantId: user!.tenantId,
        OR: [
          { userId: user!.userId },
          { email: user!.email },
          { phone: user!.email },
          ...(user!.phone ? [{ phone: user!.phone }] : [])
        ]
      }
    })

    if (student) {
      if (!student.userId) {
        await prisma.student.update({
          where: { id: student.id },
          data: { userId: user!.userId }
        }).catch(() => {})
      }
      if (student.batchId) {
        where.batchId = student.batchId
      } else if (student.courseId) {
        where.batch = { courseId: student.courseId }
      }
    }
  } else if (user!.role === 'PARENT') {
    // For parents: fetch all children linked to them and get their batchIds or courseIds
    const parentProfile = await prisma.parentProfile.findUnique({
      where: { userId: user!.userId },
      include: {
        children: { select: { id: true, batchId: true, courseId: true, fullName: true } }
      }
    })
    const children = parentProfile?.children || []
    const childrenBatchIds = children.map((c: any) => c.batchId).filter(Boolean)
    const childrenCourseIds = children.map((c: any) => c.courseId).filter(Boolean)

    if (childrenBatchIds.length > 0 || childrenCourseIds.length > 0) {
      where.OR = [
        ...(childrenBatchIds.length > 0 ? [{ batchId: { in: childrenBatchIds } }] : []),
        ...(childrenCourseIds.length > 0 ? [{ batch: { courseId: { in: childrenCourseIds } } }] : [])
      ]
    } else {
      return NextResponse.json({ success: true, homeworks: [], studentId: null, children: [] })
    }

    const homeworks = await prisma.homework.findMany({
      where,
      include: {
        batch: { select: { id: true, name: true, course: { select: { id: true, name: true } } } },
        _count: { select: { submissions: true } },
        submissions: {
          where: { studentId: { in: children.map((c: any) => c.id) } },
          include: { student: { select: { id: true, fullName: true, studentId: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, homeworks, studentId: null, children })
  }

  const homeworks = await prisma.homework.findMany({
    where,
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          course: { select: { id: true, name: true } }
        }
      },
      _count: { select: { submissions: true } },
      submissions: user!.role === 'STUDENT' ? (student ? {
        where: { studentId: student.id },
        select: { id: true, content: true, attachmentUrl: true, grade: true, feedback: true, status: true, submittedAt: true }
      } : false) : {
        include: {
          student: { select: { id: true, fullName: true, studentId: true, phone: true } }
        },
        orderBy: { submittedAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, homeworks, studentId: student?.id || null })
}

export async function POST(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  const body = await req.json()
  const { batchId, courseId, title, description, subject, dueDate, attachmentUrl } = body

  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  let resolvedBatchId = batchId
  if (!resolvedBatchId && courseId) {
    let batch = await prisma.batch.findFirst({
      where: { tenantId: user!.tenantId, courseId }
    })
    if (!batch) {
      batch = await prisma.batch.create({
        data: {
          tenantId: user!.tenantId,
          courseId,
          name: 'Section A',
        }
      })
    }
    resolvedBatchId = batch.id
  }

  if (!resolvedBatchId) {
    return NextResponse.json({ error: 'Class or Section is required' }, { status: 400 })
  }

  const homework = await prisma.homework.create({
    data: {
      tenantId: user!.tenantId,
      batchId: resolvedBatchId,
      teacherId: user!.userId,
      title,
      description: description || '',
      subject: subject || '',
      dueDate: dueDate ? new Date(dueDate) : null,
      attachmentUrl: attachmentUrl || null,
    },
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          course: { select: { id: true, name: true } }
        }
      }
    }
  })

  // Notify students in the batch or class
  const studentWhere: any = { tenantId: user!.tenantId }
  if (batchId) {
    studentWhere.batchId = batchId
  } else if (courseId) {
    studentWhere.courseId = courseId
  } else {
    studentWhere.batchId = resolvedBatchId
  }

  const students = await prisma.student.findMany({
    where: studentWhere,
    select: { id: true, userId: true, fullName: true },
  })

  const studentsWithAccount = students.filter(s => s.userId)
  if (studentsWithAccount.length > 0) {
    await prisma.notification.createMany({
      data: studentsWithAccount.map(s => ({
        tenantId: user!.tenantId,
        title: `📚 New Homework: ${title}`,
        message: `${subject ? subject + ' • ' : ''}${description || title}`,
        type: 'HOMEWORK',
        targetRole: 'STUDENT',
        targetId: s.userId!,
      })),
    })
  }

  return NextResponse.json({ success: true, homework }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.homework.delete({ where: { id, tenantId: user!.tenantId } })
  return NextResponse.json({ success: true })
}
