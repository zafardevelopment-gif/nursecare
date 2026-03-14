interface UserAvatarProps {
  name: string
  avatarUrl?: string | null
  size?: number
  online?: boolean
}

export default function UserAvatar({ name, avatarUrl, size = 44, online }: UserAvatarProps) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          style={{
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.27),
            objectFit: 'cover',
          }}
        />
      ) : (
        <div style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.27),
          background: 'linear-gradient(135deg, #0E7B8C, #0ABFCC)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: Math.round(size * 0.36),
          fontWeight: 700,
          letterSpacing: '0.5px',
        }}>
          {initials}
        </div>
      )}
      {online !== undefined && (
        <div style={{
          position: 'absolute',
          bottom: 1,
          right: 1,
          width: Math.round(size * 0.25),
          height: Math.round(size * 0.25),
          borderRadius: '50%',
          background: online ? '#27A869' : '#8A9BAA',
          border: '2px solid #05111A',
        }} />
      )}
    </div>
  )
}
