export default function handler(req, res) {
  res.status(200).json({ status: 'ok', source: 'vercel-api', timestamp: new Date().toISOString() });
}
