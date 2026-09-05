import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import config from './config';
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

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later', errors: [] },
});
app.use(globalLimiter);

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
