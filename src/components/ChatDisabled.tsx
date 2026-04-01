export default function ChatDisabled() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: 'rgba(224,74,74,0.08)',
        border: '2px solid rgba(224,74,74,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2rem',
        marginBottom: '1.5rem',
      }}>
        💬
      </div>
      <h2 style={{
        fontFamily: 'Georgia, serif',
        fontSize: '1.3rem',
        fontWeight: 700,
        color: 'var(--ink)',
        marginBottom: '0.6rem',
      }}>
        Chat is Currently Disabled
      </h2>
      <p style={{
        fontSize: '0.88rem',
        color: 'var(--muted)',
        maxWidth: 360,
        lineHeight: 1.6,
      }}>
        The messaging feature has been temporarily turned off by the platform administrator.
        Please check back later or contact support for assistance.
      </p>
      <div style={{
        marginTop: '1.5rem',
        background: 'rgba(224,74,74,0.06)',
        border: '1px solid rgba(224,74,74,0.15)',
        borderRadius: 10,
        padding: '10px 20px',
        fontSize: '0.78rem',
        color: '#E04A4A',
        fontWeight: 600,
      }}>
        🔒 Feature disabled by admin
      </div>
    </div>
  )
}
