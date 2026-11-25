'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function playNotificationChime() {
  try {
    const audio = new Audio('/sounds/notification.wav')
    audio.volume = 0.9
    audio.play().catch(() => {
      // Fallback to Web Audio API synthesized chime if audio file blocked
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioCtx) return
        const ctx = new AudioCtx()
        const now = ctx.currentTime
        const playTone = (freq: number, start: number, dur: number) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, start)
          gain.gain.setValueAtTime(0.001, start)
          gain.gain.exponentialRampToValueAtTime(0.35, start + 0.01)
          gain.gain.exponentialRampToValueAtTime(0.001, start + dur)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(start)
          osc.stop(start + dur)
        }
        playTone(1046.5, now, 0.16)
        playTone(1318.51, now + 0.15, 0.35)
      } catch {
        // ignore audio errors
      }
    })
  } catch {
    // ignore
  }
}

export function NotificationListener() {
  const { user, token } = useAuth()
  const [banner, setBanner] = useState<{ title: string; body: string } | null>(null)
  const timerRef = useRef<any>(null)

  const showInAppAlert = (title: string, body: string) => {
    playNotificationChime()
    setBanner({ title, body })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setBanner(null), 6000)

    // If running inside Sclevo Android App WebView, also trigger native notification with custom sound
    try {
      const androidBridge = (window as any).AndroidNotify
      if (androidBridge && typeof androidBridge.showNotification === 'function') {
        androidBridge.showNotification(title, body)
      }
    } catch {
      // ignore if not in Android WebView
    }
  }

  // 1. Register Service Worker + Subscribe to Web Push (for background/closed browser notifications)
  useEffect(() => {
    if (!user || !token) return

    const pubKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
      process.env.NEXT_PUBLIC_VAPID_KEY ||
      ''

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(async (reg) => {
          if (!('PushManager' in window) || !pubKey) return
          if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            await Notification.requestPermission().catch(() => {})
          }
          if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') return

          let sub = await reg.pushManager.getSubscription()
          if (!sub) {
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(pubKey),
            })
          }
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(sub),
          }).catch(() => {})
        })
        .catch(() => {})

      const onSwMessage = (event: MessageEvent) => {
        if (event.data?.type === 'PLAY_NOTIFICATION_SOUND') {
          showInAppAlert(
            event.data.title || 'New Message',
            event.data.body || ''
          )
        }
      }
      navigator.serviceWorker.addEventListener('message', onSwMessage)
      return () => {
        navigator.serviceWorker.removeEventListener('message', onSwMessage)
      }
    }
  }, [user, token])

  // 2. Poll /api/notices every 20s for new internal web messages & play custom sound + native Android alert
  useEffect(() => {
    if (!user || !token) return
    const storageKey = `sclevo_last_notice_ts_${user.id}`

    const checkNotices = async (isInitial: boolean) => {
      try {
        const res = await fetch('/api/notices', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const data = await res.json()
        const notices: any[] = data.notices || []
        if (notices.length === 0) return

        const latest = notices[0]
        const latestTs = new Date(latest.createdAt).getTime()
        const savedTsStr = localStorage.getItem(storageKey)

        if (!savedTsStr) {
          localStorage.setItem(storageKey, String(latestTs))
          return
        }

        const savedTs = Number(savedTsStr) || 0
        if (latestTs > savedTs) {
          localStorage.setItem(storageKey, String(latestTs))
          if (!isInitial || Date.now() - latestTs < 120000) {
            showInAppAlert(latest.title || 'New Message', latest.message || '')
          }
        }
      } catch {
        // ignore network hiccups
      }
    }

    checkNotices(true)
    const interval = setInterval(() => checkNotices(false), 20000)
    return () => clearInterval(interval)
  }, [user, token])

  if (!banner) return null

  return (
    <div
      onClick={() => setBanner(null)}
      style={{
        position: 'fixed',
        top: '14px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 28px)',
        maxWidth: '440px',
        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
        border: '1px solid #10b981',
        borderRadius: '14px',
        padding: '12px 14px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: '20px', lineHeight: 1 }}>🔔</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '800', color: '#10b981', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {banner.title}
        </div>
        <div style={{ fontSize: '12px', color: '#e2e8f0', marginTop: '2px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {banner.body}
        </div>
      </div>
      <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 'bold' }}>✕</span>
    </div>
  )
}
