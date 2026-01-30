import type { ReactNode } from 'react'
import type { PublicSoul } from '../lib/publicUser'
import { ResourceCard } from './ResourceCard'

type SoulCardProps = {
  soul: PublicSoul
  summaryFallback: string
  meta: ReactNode
  ownerHandle?: string | null
}

export function SoulCard({ soul, summaryFallback, meta, ownerHandle }: SoulCardProps) {
  return (
    <ResourceCard
      type="soul"
      resource={soul}
      ownerHandle={ownerHandle}
      summaryFallback={summaryFallback}
      meta={meta}
    />
  )
}
