import { loadShiftSchedule } from './actions'
import AvailabilityClient from './AvailabilityClient'

export const dynamic = 'force-dynamic'

export default async function AvailabilityPage() {
  const saved = await loadShiftSchedule()
  return <AvailabilityClient saved={saved} />
}
