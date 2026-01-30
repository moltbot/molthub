import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/admin')({
  beforeLoad: () => {
    throw redirect({
      to: '/moderation',
      search: { skill: undefined, tab: undefined },
      replace: true,
    })
  },
})
