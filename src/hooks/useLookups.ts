import { useCallback, useMemo } from 'react'
import type { Organization, TeamMember } from '@/types'
import { useOrganizations, useTeam } from './useProjects'

/**
 * Resolve responsáveis e organizações por id. Centraliza os dois lookups
 * mais usados nas telas de projeto.
 */
export function useLookups() {
  const { data: team } = useTeam()
  const { data: orgs } = useOrganizations()

  const teamMap = useMemo(() => {
    const m = new Map<string, TeamMember>()
    team?.forEach((t) => m.set(t.id, t))
    return m
  }, [team])

  const orgMap = useMemo(() => {
    const m = new Map<string, Organization>()
    orgs?.forEach((o) => m.set(o.id, o))
    return m
  }, [orgs])

  const getMember = useCallback((id?: string) => (id ? teamMap.get(id) : undefined), [teamMap])
  const getOrg = useCallback((id?: string) => (id ? orgMap.get(id) : undefined), [orgMap])

  return { getMember, getOrg, team, orgs }
}
