import { createFileRoute, redirect } from '@tanstack/react-router'
import { fetchSkillMeta } from '../../lib/og'

export const Route = createFileRoute('/$owner/$slug')({
  beforeLoad: async ({ params }) => {
    const data = await fetchSkillMeta(params.slug)
    const owner = data?.owner ?? data?.ownerId ?? params.owner
    throw redirect({
      to: '/skills/$owner/$slug',
      params: { owner: owner || params.owner, slug: params.slug },
      replace: true,
    })
  },
})
