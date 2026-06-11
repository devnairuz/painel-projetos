import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

interface ComingSoonPageProps {
  title: string
  subtitle: string
  icon: LucideIcon
  description: string
}

/**
 * Página de módulo ainda não implementado. Empty state honesto — o menu já
 * reflete o produto final sem fingir que há funcionalidade.
 */
export function ComingSoonPage({ title, subtitle, icon, description }: ComingSoonPageProps) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <EmptyState icon={icon} title="Módulo em construção" description={description} />
      </Card>
    </>
  )
}
