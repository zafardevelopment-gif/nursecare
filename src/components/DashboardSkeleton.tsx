// Shared skeleton loader — fully self-contained, no external CSS dependencies

const SHIMMER = `
  @keyframes _shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`

function Box({ w = '100%', h = 16, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, #e8eef2 25%, #f4f7f9 50%, #e8eef2 75%)',
      backgroundSize: '200% 100%',
      animation: '_shimmer 1.4s ease-in-out infinite',
      flexShrink: 0,
    }} />
  )
}

function KpiCard() {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5edf0', borderRadius: 16, padding: '1.4rem', minWidth: 0 }}>
      <Box w={44} h={44} r={12} />
      <div style={{ marginTop: 12 }}><Box w="55%" h={26} r={6} /></div>
      <div style={{ marginTop: 6 }}><Box w="75%" h={11} r={4} /></div>
    </div>
  )
}

function TableRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '11px 12px', borderBottom: '1px solid #e5edf0' }}>
          <Box h={13} r={4} />
        </td>
      ))}
    </tr>
  )
}

export default function DashboardSkeleton({
  kpis = 4,
  rows = 6,
  cols = 6,
}: {
  kpis?: number
  rows?: number
  cols?: number
}) {
  return (
    <div style={{ padding: '2rem', minHeight: '100vh', background: '#f0f5f8' }}>
      <style>{SHIMMER}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Box w={200} h={22} r={6} />
          <Box w={280} h={13} r={4} />
        </div>
        <Box w={140} h={38} r={9} />
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(kpis, 4)}, 1fr)`, gap: '1.2rem', marginBottom: '1.5rem' }}>
        {Array.from({ length: kpis }).map((_, i) => <KpiCard key={i} />)}
      </div>

      {/* Main table card */}
      <div style={{ background: '#fff', border: '1px solid #e5edf0', borderRadius: 16, overflow: 'hidden', marginBottom: '1.5rem' }}>
        {/* Card header */}
        <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid #e5edf0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box w={180} h={16} r={4} />
          <Box w={80} h={14} r={4} />
        </div>
        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f7f4ef', borderBottom: '1px solid #e5edf0' }}>
                {Array.from({ length: cols }).map((_, i) => (
                  <th key={i} style={{ padding: '8px 12px' }}>
                    <Box h={10} r={3} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, i) => <TableRow key={i} cols={cols} />)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Second card (smaller) */}
      <div style={{ background: '#fff', border: '1px solid #e5edf0', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid #e5edf0' }}>
          <Box w={150} h={16} r={4} />
        </div>
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <Box w="60%" h={13} r={4} />
              <Box w="25%" h={13} r={4} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
