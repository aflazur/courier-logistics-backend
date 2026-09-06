// Vercel entry point: every request is rewritten here (see vercel.json), and Vercel's Node
// runtime accepts an Express app directly as a request handler - no separate app.listen()
// call needed (that only happens in src/server.ts, for local dev / non-serverless hosts).
import app from '../src/app';

export default app;