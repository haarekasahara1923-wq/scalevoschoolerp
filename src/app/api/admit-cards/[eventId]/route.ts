import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — full details of a single AdmitCardEvent including all admit cards with student info
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  const { error, user } = requireAuth(req)
  if (error) return error
  const { eventId } = await context.params

  try {
    const event = await prisma.admitCardEvent.findFirst({
      where: { id: eventId, tenantId: user!.tenantId },
      include: {
        course: { select: { name: true } },
        batch: { select: { name: true } },
        admitCards: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                fatherName: true,
                motherName: true,
                phone: true,
                photo: true,
                dob: true,
                gender: true,
                scholarNo: true,
                studentId: true,
                status: true,
                tcGenerated: true,
                address: true,
                aadhaarNo: true,
              }
            }
          },
          orderBy: { student: { fullName: 'asc' } }
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: event })
  } catch (err) {
    console.error('Fetch admit card event detail error:', err)
    return NextResponse.json({ error: 'Failed to fetch event details' }, { status: 500 })
  }
}

// PATCH — bulk actions: publish / unpublish / block / unblock / approve
// Body: { action: 'publish'|'unpublish'|'block'|'unblock'|'approve', studentIds?: string[] }
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  const { error, user } = requireAuth(req)
  if (error) return error
  const { eventId } = await context.params

  try {
    const body = await req.json()
    const { action, studentIds } = body

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    // Build the base where clause
    const where: any = {
      eventId,
      tenantId: user!.tenantId,
    }

    // If specific studentIds provided, only act on those
    if (studentIds && studentIds.length > 0) {
      where.studentId = { in: studentIds }
    }

    switch (action) {
      case 'publish': {
        // Only publish non-blocked (or superAdminApproved) and non-TC students
        const eligibleCards = await prisma.admitCard.findMany({
          where: { ...where, isPublished: false },
          include: {
            student: { select: { tcGenerated: true, status: true } }
          }
        })

        const toPublishIds = eligibleCards
          .filter(c => !c.student.tcGenerated && c.student.status === 'ACTIVE' && (!c.isBlocked || c.superAdminApproved))
          .map(c => c.id)

        if (toPublishIds.length === 0) {
          return NextResponse.json({ success: true, message: 'No eligible cards to publish', count: 0 })
        }

        await prisma.admitCard.updateMany({
          where: { id: { in: toPublishIds }, tenantId: user!.tenantId },
          data: { isPublished: true }
        })
        return NextResponse.json({ success: true, message: `Published ${toPublishIds.length} admit cards`, count: toPublishIds.length })
      }

      case 'unpublish':
        await prisma.admitCard.updateMany({
          where: { ...where, isPublished: true },
          data: { isPublished: false }
        })
        return NextResponse.json({ success: true, message: 'Unpublished successfully' })

      case 'block':
        await prisma.admitCard.updateMany({
          where,
          data: { isBlocked: true, isPublished: false, superAdminApproved: false }
        })
        return NextResponse.json({ success: true, message: 'Blocked successfully' })

      case 'unblock':
        await prisma.admitCard.updateMany({
          where,
          data: { isBlocked: false, superAdminApproved: false }
        })
        return NextResponse.json({ success: true, message: 'Unblocked successfully' })

      case 'approve':
        // Super admin override: allow blocked student's card to be published
        if (user!.role !== 'SUPER_ADMIN' && user!.role !== 'COACHING_ADMIN') {
          return NextResponse.json({ error: 'Unauthorized: Only Super Admin can approve' }, { status: 403 })
        }
        await prisma.admitCard.updateMany({
          where,
          data: { superAdminApproved: true }
        })
        return NextResponse.json({ success: true, message: 'Approved for publication' })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (err) {
    console.error('Admit card action error:', err)
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}

// DELETE — delete an AdmitCardEvent (cascades to AdmitCards via schema)
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  const { error, user } = requireAuth(req)
  if (error) return error
  const { eventId } = await context.params

  try {
    await prisma.admitCardEvent.delete({
      where: { id: eventId, tenantId: user!.tenantId }
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete admit card event error:', err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
