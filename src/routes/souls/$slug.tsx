import { createFileRoute, redirect } from '@tanstack/react-router'
import { fetchSoulMeta } from '../../lib/og'

export const Route = createFileRoute('/souls/$slug')({
  beforeLoad: async ({ params }) => {
    const data = await fetchSoulMeta(params.slug)
    const owner = data?.owner ?? data?.ownerId ?? 'unknown'
    throw redirect({
      to: '/souls/$owner/$slug',
      params: { owner, slug: params.slug },
      replace: true,
    })
  },
})
