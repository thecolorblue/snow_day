import { Guardian, Student } from '@prisma/client';
import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    guardian?: Guardian & {
      students: Student[];
    };
  }
}