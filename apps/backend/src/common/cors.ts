export function corsOrigins(): string | string[] {
  // In dev, allow all origins so ngrok tunnels work without reconfiguring on every restart.
  // In production set WEB_ORIGIN to lock it down.
  if (process.env.NODE_ENV !== 'production') {
    return '*';
  }
  const origins = ['http://localhost:5173'];
  if (process.env.WEB_ORIGIN) origins.push(process.env.WEB_ORIGIN);
  return origins;
}
