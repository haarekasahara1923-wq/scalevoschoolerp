import { prisma } from '@/lib/prisma'

const getVapidKeys = () => {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_VAPID_KEY ||
    ''
  const privateKey = process.env.VAPID_PRIVATE_KEY || ''
  return { publicKey, privateKey }
}

export async function sendPushToUserIds(
  tenantId: string,
  userIds: string[],
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  const { publicKey, privateKey } = getVapidKeys()
  if (!publicKey || !privateKey || userIds.length === 0) return

  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)))
  if (uniqueUserIds.length === 0) return

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      tenantId,
      userId: { in: uniqueUserIds },
    },
  })

  if (subscriptions.length === 0) return

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const webpush = require('web-push')
  webpush.setVapidDetails('mailto:support@scalevo.in', publicKey, privateKey)

  const messagePayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/portal',
    tag: payload.tag || 'sclevo-message',
    sound: '/sounds/notification.wav',
  })

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { auth: sub.auth, p256dh: sub.p256dh },
          },
          messagePayload
        )
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        }
      }
    })
  )
}

export async function sendPushForNotice(
  tenantId: string,
  opts: {
    title: string
    message: string
    targetRole?: string | null
    targetId?: string | null
    explicitUserIds?: string[]
  }
) {
  try {
    const { title, message, targetRole, targetId, explicitUserIds } = opts
    const userIds: string[] = [...(explicitUserIds || [])]

    if (targetId && targetRole === 'PARENT') {
      // targetId could be studentId, batchId, courseId, or parent userId
      const student = await prisma.student.findFirst({
        where: { id: targetId, tenantId },
        include: { parentLinks: true },
      })

      if (student) {
        for (const p of student.parentLinks) {
          if (p.userId) userIds.push(p.userId)
        }
        const phones = [student.parentPhone, student.phone].filter(Boolean) as string[]
        if (phones.length > 0) {
          const matchingParents = await prisma.user.findMany({
            where: {
              tenantId,
              role: 'PARENT',
              isActive: true,
              OR: [{ phone: { in: phones } }, { email: { in: phones } }],
            },
            select: { id: true },
          })
          userIds.push(...matchingParents.map((u) => u.id))
        }
      } else {
        // Check if targetId is a batchId or courseId
        const studentsInGroup = await prisma.student.findMany({
          where: {
            tenantId,
            OR: [{ batchId: targetId }, { courseId: targetId }],
          },
          include: { parentLinks: true },
        })
        const groupPhones: string[] = []
        for (const st of studentsInGroup) {
          for (const p of st.parentLinks) {
            if (p.userId) userIds.push(p.userId)
          }
          if (st.parentPhone) groupPhones.push(st.parentPhone)
          if (st.phone) groupPhones.push(st.phone)
        }
        if (groupPhones.length > 0) {
          const matchingParents = await prisma.user.findMany({
            where: {
              tenantId,
              role: 'PARENT',
              isActive: true,
              OR: [{ phone: { in: groupPhones } }, { email: { in: groupPhones } }],
            },
            select: { id: true },
          })
          userIds.push(...matchingParents.map((u) => u.id))
        }
        // Also check if targetId itself is a User id
        userIds.push(targetId)
      }
    } else if (!targetId) {
      // Broadcast to targetRole or all users in tenant
      const roleFilter =
        targetRole && targetRole !== 'ALL'
          ? { role: targetRole as any }
          : {}
      const users = await prisma.user.findMany({
        where: { tenantId, isActive: true, ...roleFilter },
        select: { id: true },
      })
      userIds.push(...users.map((u) => u.id))
    }

    await sendPushToUserIds(tenantId, userIds, {
      title,
      body: message.length > 140 ? `${message.slice(0, 137)}...` : message,
      url: targetRole === 'PARENT' ? '/portal/parent' : '/portal',
      tag: `notice-${Date.now()}`,
    })
  } catch (err) {
    console.error('sendPushForNotice error:', err)
  }
}
