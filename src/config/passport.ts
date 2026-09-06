import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '@prisma/client';
import config from './index';
import prisma from './prisma';

// Only register the strategy if credentials are actually configured - lets the rest of the
// app (and its tests) run fine without a real Google Cloud project set up yet.
if (config.google.clientId && config.google.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl as string,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('Google account has no email on file'));
          }

          // Find-or-create: link to an existing account by email, or create a fresh
          // social-login-only user (no password) on first login.
          let user = await prisma.user.findFirst({ where: { email, deletedAt: null } });

          if (!user) {
            user = await prisma.user.create({
              data: {
                name: profile.displayName || email.split('@')[0],
                email,
                googleId: profile.id,
                authProvider: 'GOOGLE',
                role: 'CUSTOMER', // social sign-up always starts as a customer
                isVerified: true,
              },
            });
          } else if (!user.googleId) {
            // Existing email/password account signing in with Google for the first time
            user = await prisma.user.update({
              where: { id: user.id },
              data: { googleId: profile.id },
            });
          }

          // Cast through unknown: passport's types expect Express.User (our JWT-flow shape,
          // { userId, email, role }) here, but this callback deals in real Prisma User rows.
          // The two never actually meet at runtime - the callback route reads this Prisma user
          // directly (not via req.user) to issue our own JWT tokens, and req.user/session is
          // never relied on anywhere else in the app.
          return done(null, user as unknown as Express.User);
        } catch (err) {
          return done(err as Error);
        }
      },
    ),
  );
}

passport.serializeUser((user: Express.User, done) => {
  done(null, (user as unknown as User).id);
});
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    done(null, user as unknown as Express.User);
  } catch (err) {
    done(err as Error);
  }
});

export default passport;
