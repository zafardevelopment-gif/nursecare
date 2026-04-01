'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export default function NursesPagination({
  total,
  pageSize,
  currentPage,
}: {
  total: number
  pageSize: number
  currentPage: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    router.replace(`${pathname}?${params.toString()}`)
  }

  function setSize(size: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('pageSize', String(size))
    params.delete('page')
    router.replace(`${pathname}?${params.toString()}`)
  }

  if (total === 0) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
      acc.push(p)
      return acc
    }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', padding: '1rem 1.2rem', borderTop: '1px solid var(--border)', background: 'var(--cream)', borderRadius: '0 0 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--muted)' }}>
        Show
        <select
          value={pageSize}
          onChange={e => setSize(Number(e.target.value))}
          style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', fontSize: '0.82rem', background: '#fff' }}
        >
          {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        per page · <strong>{total}</strong> total
      </div>

      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        <PBtn disabled={currentPage === 1} onClick={() => goTo(1)}>«</PBtn>
        <PBtn disabled={currentPage === 1} onClick={() => goTo(currentPage - 1)}>‹</PBtn>
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`d${i}`} style={{ padding: '0 4px', color: '#9CA3AF', lineHeight: '32px' }}>…</span>
            : <PBtn key={p} active={p === currentPage} onClick={() => goTo(p as number)}>{p}</PBtn>
        )}
        <PBtn disabled={currentPage === totalPages} onClick={() => goTo(currentPage + 1)}>›</PBtn>
        <PBtn disabled={currentPage === totalPages} onClick={() => goTo(totalPages)}>»</PBtn>
      </div>
    </div>
  )
}

function PBtn({ children, onClick, disabled, active }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 32, height: 32,
      border: `1px solid ${active ? '#0E7B8C' : 'var(--border)'}`,
      background: active ? '#0E7B8C' : '#fff',
      color: active ? '#fff' : disabled ? '#D1D5DB' : 'var(--ink)',
      borderRadius: 6, fontSize: '0.82rem',
      fontWeight: active ? 700 : 400,
      cursor: disabled ? 'default' : 'pointer',
    }}>
      {children}
    </button>
  )
}
