import NextAuth from 'next-auth';
import { authConfig } from './src/lib/auth.config';
 
export default NextAuth(authConfig).auth;
 

// Protect everything except these paths
export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: ['/((?!api|_next/static|_next/image|.*\.png$).*)'],
};
