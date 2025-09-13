import 'next-auth';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      role?: 'admin' | 'vendor' | 'customer' | 'guest';
    } & DefaultSession['user'];
  }

  interface User {
    role?: 'admin' | 'vendor' | 'customer' | 'guest';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: 'admin' | 'vendor' | 'customer' | 'guest';
  }
}