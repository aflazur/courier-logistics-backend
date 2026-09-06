import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import ConnectRedisStore from 'connect-redis';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import config from './config';
import { redisClient } from './config/redis';
import router from './routes';
import globalErrorHandler from './middlewares/globalErrorHandler';
import notFound from './middlewares/notFound';
import './config/passport'; // registers the Google strategy as a side effect

const app: Application = express();

app.use(helmet());
app.use(
  cors({
    origin: true, // reflect request origin; lock this down to your frontend domain in production
    credentials: true,
  }),
);
app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session is only used for the brief Google OAuth handshake (passport needs somewhere to stash
// state between the redirect to Google and the callback) - the API itself stays stateless and
// uses the JWT access/refresh tokens issued at the end of that handshake.
//
// On a serverless platform (Vercel), each request can land on a completely different
// container, so the default in-memory session store would silently break the OAuth handshake
// whenever the redirect and callback hit different instances. If Redis is configured, we use
// it as a shared session store so this works correctly in serverless too; otherwise we fall
// back to the in-memory store, which is fine for local dev (single process) but should not be
// relied on in a real serverless deployment.
if (!redisClient) {
  console.warn(
    'REDIS_URL not set: using in-memory session store. Google OAuth login may fail intermittently on serverless deployments (Vercel) once traffic spans multiple instances.',
  );
}

app.use(
  session({
    store: redisClient
      ? new ConnectRedisStore({ client: redisClient, prefix: 'sess:' })
      : undefined,
    secret: config.session_secret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: config.env === 'production', maxAge: 5 * 60 * 1000 },
  }),
);
app.use(passport.initialize());
app.use(passport.session());

// Deliberately using the default in-memory store here, not a Redis-backed one: this is a
// single-instance deployment (Vercel/Render), so there's no multi-instance state to
// synchronize, and an in-memory store can never fail due to a Redis outage - rate limiting
// should degrade gracefully, not become a second point of failure for the whole API. Redis
// (when configured) is used purely for response caching instead - see config/redis.ts.

// Global rate limiter - prevents API abuse.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later', errors: [] },
});
app.use(globalLimiter);

// Auth endpoints get a tighter limit - these are the ones brute-force/credential-stuffing
// attacks actually target.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many auth attempts, please try again later',
    errors: [],
  },
});
app.use(`/api/${config.apiVersion}/auth`, authLimiter);

app.get('/', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Courier & Logistics Platform API is running', data: null });
});

app.use(`/api/${config.apiVersion}`, router);

app.use(notFound);
app.use(globalErrorHandler);

export default app;
