// Ambient type augmentation for Express - kept separate from middlewares/auth.ts so the
// module's runtime logic isn't mixed with type declarations, and so any file needing to know
// the shape of `req.user` has one obvious place to look.
//
// We augment `Express.User` (not `Request` directly) because @types/passport already declares
// `req.user?: Express.User`; augmenting Request separately would conflict with that. Our JWT
// bearer-auth middleware (middlewares/auth.ts) is the only thing that ever populates req.user -
// the Google OAuth flow (auth.controller.ts) deliberately avoids touching req.user to sidestep
// this exact clash, and issues tokens via a plain callback argument instead.
declare global {
  namespace Express {
    interface User {
      userId: string;
      email: string;
      role: string;
    }
  }
}

export {};
