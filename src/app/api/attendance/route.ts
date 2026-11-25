import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const { searchParams } = new URL(req.url)
        const batchId = searchParams.get('batchId')
        const courseId = searchParams.get('courseId')
        const date = searchParams.get('date')
        const studentId = searchParams.get('studentId')
        const month = searchParams.get('month') // 1-12
        const year = searchParams.get('year') // e.g. 2026
        const limit = searchParams.get('limit')

        const where: any = { tenantId: user!.tenantId }
        let parentChildren: any[] = []

        if (user!.role === 'PARENT') {
            const parentProfile = await prisma.parentProfile.findUnique({
                where: { userId: user!.userId },
                include: {
                    children: {
                        select: {
                            id: true,
                            fullName: true,
                            studentId: true,
                            scholarNo: true,
                            photo: true,
                            course: { select: { id: true, name: true } },
                            batch: { select: { id: true, name: true } }
                        }
                    }
                }
            })
            parentChildren = parentProfile?.children || []
            const childrenIds = parentChildren.map(c => c.id)

            if (childrenIds.length === 0) {
                return NextResponse.json({
                    success: true,
                    data: [],
                    children: [],
                    stats: { total: 0, present: 0, absent: 0, late: 0, halfDay: 0, leave: 0, percentage: 0 }
                })
            }

            if (studentId) {
                if (!childrenIds.includes(studentId)) {
                    return NextResponse.json({ error: 'Unauthorized: Student not linked to this parent' }, { status: 403 })
                }
                where.studentId = studentId
            } else {
                where.studentId = { in: childrenIds }
            }
        } else if (user!.role === 'STUDENT') {
            const student = await prisma.student.findFirst({
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
            if (!student) {
                return NextResponse.json({
                    success: true,
                    data: [],
                    stats: { total: 0, present: 0, absent: 0, late: 0, halfDay: 0, leave: 0, percentage: 0 }
                })
            }
            where.studentId = student.id
        } else {
            // STAFF / ADMIN
            if (studentId) {
                where.studentId = studentId
            } else if (batchId && batchId !== 'all') {
                where.batchId = batchId
            } else if (courseId) {
                where.student = { courseId }
            }
        }

        if (date) {
            const startDate = new Date(date)
            startDate.setHours(0, 0, 0, 0)
            const endDate = new Date(date)
            endDate.setHours(23, 59, 59, 999)
            where.date = { gte: startDate, lte: endDate }
        } else if (month && year) {
            const m = parseInt(month, 10)
            const y = parseInt(year, 10)
            const startDate = new Date(y, m - 1, 1, 0, 0, 0, 0)
            const endDate = new Date(y, m, 0, 23, 59, 59, 999)
            where.date = { gte: startDate, lte: endDate }
        }

        const attendances = await prisma.attendance.findMany({
            where,
            include: {
                student: {
                    select: {
                        id: true,
                        fullName: true,
                        studentId: true,
                        scholarNo: true,
                        course: { select: { id: true, name: true } },
                        batch: { select: { id: true, name: true } }
                    }
                }
            },
            orderBy: { date: 'desc' },
            ...(limit ? { take: parseInt(limit, 10) } : {})
        })

        const data = attendances.map(a => ({
            ...a,
            studentName: a.student?.fullName || 'Unknown',
        }))

        const total = attendances.length
        const present = attendances.filter(a => a.status === 'PRESENT').length
        const absent = attendances.filter(a => a.status === 'ABSENT').length
        const late = attendances.filter(a => a.status === 'LATE').length
        const halfDay = attendances.filter(a => a.status === 'HALF_DAY').length
        const leave = attendances.filter(a => a.status === 'LEAVE').length
        const percentage = total > 0 ? Math.round(((present + (halfDay * 0.5)) / total) * 100) : 0

        const stats = {
            total,
            present,
            absent,
            late,
            halfDay,
            leave,
            percentage
        }

        return NextResponse.json({
            success: true,
            data,
            children: parentChildren,
            stats
        })
    } catch (err) {
        console.error('Fetch attendance error:', err)
        return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const body = await req.json()
        const records = body.records || [body]

        if (!Array.isArray(records)) {
            return NextResponse.json({ error: 'Invalid record format' }, { status: 400 })
        }

        const results = []
        for (const r of records) {
            const recDate = new Date(r.date)
            const startDate = new Date(recDate)
            startDate.setHours(0, 0, 0, 0)
            const endDate = new Date(recDate)
            endDate.setHours(23, 59, 59, 999)

            const existing = await prisma.attendance.findFirst({
                where: {
                    tenantId: user!.tenantId,
                    studentId: r.studentId,
                    date: { gte: startDate, lte: endDate }
                }
            })

            let saved
            if (existing) {
                saved = await prisma.attendance.update({
                    where: { id: existing.id },
                    data: {
                        status: (r.status || 'PRESENT') as any,
                        batchId: r.batchId || existing.batchId || null,
                        markedBy: user!.userId,
                        notes: r.notes !== undefined ? r.notes : existing.notes
                    }
                })
            } else {
                saved = await prisma.attendance.create({
                    data: {
                        tenantId: user!.tenantId,
                        studentId: r.studentId,
                        batchId: r.batchId || null,
                        date: recDate,
                        status: (r.status || 'PRESENT') as any,
                        markedBy: user!.userId,
                        notes: r.notes || '',
                    }
                })
            }
            results.push(saved)
        }

        // Asynchronously notify parents
        for (const r of records) {
            const student = await prisma.student.findUnique({
                where: { id: r.studentId },
                include: { parentLinks: true }
            })
            if (student && student.parentLinks.length > 0) {
                for (const parent of student.parentLinks) {
                    await prisma.notification.create({
                        data: {
                            tenantId: user!.tenantId,
                            title: `Attendance Marked: ${student.fullName}`,
                            message: `${student.fullName} has been marked ${r.status} on ${new Date(r.date).toLocaleDateString('en-IN')}.`,
                            type: 'ATTENDANCE',
                            targetRole: 'PARENT',
                            targetId: parent.userId,
                        }
                    })
                    // Send push notification
                    try {
                        const subscriptions = await prisma.pushSubscription.findMany({
                            where: { userId: parent.userId }
                        })
                        for (const sub of subscriptions) {
                            await sendWebPush(sub, `Attendance: ${student.fullName}`, `${student.fullName} is marked ${r.status}`)
                        }
                    } catch (e) {
                        console.error('Push notification send error:', e)
                    }
                }
            }
        }

        return NextResponse.json({ success: true, data: results }, { status: 201 })
    } catch (err) {
        console.error('Create attendance error:', err)
        return NextResponse.json({ error: 'Failed to create attendance' }, { status: 500 })
    }
}

// Simple web push sender helper function
async function sendWebPush(sub: any, title: string, body: string) {
    const webpush = require('web-push')
    const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_KEY || ''
    const privateVapidKey = process.env.VAPID_PRIVATE_KEY || ''
    if (!publicVapidKey || !privateVapidKey) return
    
    webpush.setVapidDetails(
        'mailto:info@udba.space',
        publicVapidKey,
        privateVapidKey
    )

    const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
            auth: sub.auth,
            p256dh: sub.p256dh
        }
    }

    await webpush.sendNotification(
        pushSubscription,
        JSON.stringify({ title, body })
    )
}
