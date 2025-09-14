import { withAuth } from 'next-auth/middleware';
import { NextRequest } from 'next/server';

export default withAuth(
  // `withAuth` augments your `Request` with the user's token.

  {
    pages: {
      signIn: '/signin',
    },
    callbacks: {
      authorized: ({ token, req }) => {
        const isOnAdmin = req.nextUrl.pathname.startsWith('/admin');
        const isLoggedIn = !!token;

        if (isOnAdmin) {
          return isLoggedIn && token?.role === 'admin';
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\.png$).*)'],
};
