import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import { RedisStore, RedisReply } from 'rate-limit-redis';
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

// Session is only used for the brief Google OAuth handshake (passport needs somewhere to
// stash state between the redirect to Google and the callback) - the API itself stays
// stateless and uses the JWT access/refresh tokens issued at the end of that handshake.
app.use(
  session({
    secret: config.session_secret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: config.env === 'production', maxAge: 5 * 60 * 1000 },
  }),
);
app.use(passport.initialize());
app.use(passport.session());

// Shared by both limiters below - only defined when Redis is actually configured, so rate
// limits are shared correctly across multiple server instances; falls back to in-memory
// per-instance limiting otherwise (fine for a single-instance deployment).
const redisStore = redisClient
  ? new RedisStore({
      sendCommand: (...args: string[]): Promise<RedisReply> =>
        // Safe: this closure only runs when redisStore is used below, which only happens
        // when we're inside this same truthy branch (redisClient is a module-level import
        // binding that TS can't narrow across the closure boundary, but it can't become null
        // between this check and the store being used).
        redisClient!.call(args[0], ...args.slice(1)) as Promise<RedisReply>,
    })
  : undefined;

// Global rate limiter - prevents API abuse.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore,
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
  store: redisStore,
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
