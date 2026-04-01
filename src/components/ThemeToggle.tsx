'use client'

import { useTheme } from './ThemeProvider'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '10px 12px',
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        cursor: 'pointer',
        color: 'rgba(255,255,255,0.6)',
        fontSize: '0.85rem',
        fontFamily: 'inherit',
        transition: 'all 0.15s',
      }}
    >
      {/* Toggle track */}
      <div style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: isDark ? '#0ABFCC' : 'rgba(255,255,255,0.15)',
        position: 'relative',
        flexShrink: 0,
        transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute',
          top: 3,
          left: isDark ? 18 : 3,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 9,
        }}>
          {isDark ? '🌙' : '☀️'}
        </div>
      </div>
      <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
    </button>
  )
}
