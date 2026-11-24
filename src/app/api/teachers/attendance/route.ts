import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

// Helper: resolve teacherId from token if not explicitly provided
async function resolveTeacherId(user: any, teacherId: string | null): Promise<string | null> {
    if (teacherId) return teacherId
    if (!['TEACHER', 'STAFF'].includes(user.role)) return null
    const teacher = await prisma.teacher.findFirst({
        where: {
            tenantId: user.tenantId,
            OR: [
                { email: user.email },
                ...(user.phone ? [{ phone: user.phone }] : []),
            ]
        },
        select: { id: true }
    })
    return teacher?.id || null
}

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    const url = new URL(req.url)
    const dateStr = url.searchParams.get('date')
    const teacherIdParam = url.searchParams.get('teacherId')

    try {
        // Resolve teacherId - for TEACHER/STAFF portal, auto-find from token
        const teacherId = await resolveTeacherId(user!, teacherIdParam)

        let whereClause: any = { tenantId: user!.tenantId }
        
        if (dateStr) {
            const startOfDay = new Date(dateStr)
            startOfDay.setHours(0, 0, 0, 0)
            const endOfDay = new Date(dateStr)
            endOfDay.setHours(23, 59, 59, 999)
            
            whereClause.date = {
                gte: startOfDay,
                lte: endOfDay
            }
        }
        
        if (teacherId) {
            whereClause.teacherId = teacherId
        } else {
            // Admin fetching all: only fetch teacher attendances (where studentId is null)
            whereClause.studentId = null
        }

        const attendances = await prisma.attendance.findMany({
            where: whereClause,
            include: {
                teacher: {
                    select: { id: true, name: true, photo: true }
                }
            },
            orderBy: { date: 'desc' }
        })

        return NextResponse.json({ success: true, data: attendances })
    } catch (err) {
        console.error('Fetch teacher attendance error:', err)
        return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    // Allow TEACHER/STAFF to mark their own attendance, plus admins
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const body = await req.json()
        const { date, status, inTime, outTime, notes } = body
        let { teacherId } = body

        // Auto-resolve teacherId for portal self-service
        if (!teacherId) {
            teacherId = await resolveTeacherId(user!, null)
        }

        if (!teacherId || !date || !status) {
            return NextResponse.json({ error: 'teacherId, date, and status are required' }, { status: 400 })
        }

        const attendanceDate = new Date(date)
        attendanceDate.setHours(0, 0, 0, 0)
        
        const nextDay = new Date(attendanceDate)
        nextDay.setDate(nextDay.getDate() + 1)

        // Find if attendance already exists for this teacher on this day
        const existing = await prisma.attendance.findFirst({
            where: {
                tenantId: user!.tenantId,
                teacherId,
                date: {
                    gte: attendanceDate,
                    lt: nextDay
                }
            }
        })

        let record;
        if (existing) {
            // Update
            record = await prisma.attendance.update({
                where: { id: existing.id },
                data: {
                    status,
                    inTime: inTime !== undefined ? inTime : existing.inTime,
                    outTime: outTime !== undefined ? outTime : existing.outTime,
                    notes: notes !== undefined ? notes : existing.notes,
                    markedBy: (user as any).name || 'System'
                }
            })
        } else {
            // Create
            record = await prisma.attendance.create({
                data: {
                    tenantId: user!.tenantId,
                    teacherId,
                    date: attendanceDate,
                    status,
                    inTime,
                    outTime,
                    notes,
                    markedBy: (user as any).name || 'System'
                }
            })
        }

        return NextResponse.json({ success: true, data: record })
    } catch (err) {
        console.error('Save teacher attendance error:', err)
        return NextResponse.json({ error: 'Failed to save attendance' }, { status: 500 })
    }
}
