import { loadAvailability } from './actions'
import AvailabilityClient from './AvailabilityClient'

export default async function AvailabilityPage() {
  const saved = await loadAvailability()
  return <AvailabilityClient saved={saved} />
}
