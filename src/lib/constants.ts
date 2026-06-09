export const USER_AGENT_PRESETS = [
  {
    label: 'Windows Chrome',
    value:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  {
    label: 'macOS Safari',
    value:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
  },
  {
    label: 'Linux Firefox',
    value: 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0',
  },
  {
    label: 'Android Chrome',
    value:
      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
  },
  {
    label: 'iOS Safari',
    value:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
  },
]

export const buildProxyString = (
  host?: string | null,
  port?: string | null,
  user?: string | null,
  password?: string | null,
) => {
  if (!host || !port) return ''
  let creds = ''
  if (user || password) {
    creds = `${encodeURIComponent(user || '')}:${encodeURIComponent(password || '')}@`
  }
  return `http://${creds}${host}:${port}`
}
