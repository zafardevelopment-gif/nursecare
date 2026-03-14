import Link from 'next/link'

interface MenuItem {
  icon: string
  label: string
  href: string
  badge?: number | string
}

interface SidebarMenuProps {
  items: MenuItem[]
  activePath: string
}

export default function SidebarMenu({ items, activePath }: SidebarMenuProps) {
  return (
    <nav style={{ padding: '0.8rem', flex: 1 }}>
      {items.map((item) => {
        const isActive = activePath === item.href || activePath.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              marginBottom: 2,
              textDecoration: 'none',
              background: isActive ? 'rgba(14,123,140,0.25)' : 'transparent',
              border: isActive ? '1px solid rgba(14,123,140,0.3)' : '1px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: '1.05rem', width: 22, textAlign: 'center' }}>{item.icon}</span>
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 500,
              color: isActive ? '#0ABFCC' : 'rgba(255,255,255,0.6)',
              flex: 1,
            }}>
              {item.label}
            </span>
            {item.badge !== undefined && item.badge !== 0 && (
              <span style={{
                background: '#F5842A',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 50,
                minWidth: 20,
                textAlign: 'center',
              }}>
                {item.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
