import posthog from 'posthog-js'

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY

if (key) {
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? '/ingest',
    ui_host: 'https://eu.posthog.com',
    defaults: '2026-01-30',
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: true,
    opt_out_capturing_by_default: true,
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: { password: true },
    },
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
    loaded: (ph) => {
      ph.register({
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
      })

      if (
        process.env.NODE_ENV !== 'production' &&
        process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production'
      ) {
        ph.opt_out_capturing()
        return
      }

      const consent = localStorage.getItem('cookie-consent')
      if (consent === 'accepted') {
        ph.opt_in_capturing()
      }
    },
  })
}
