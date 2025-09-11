import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from '@/lib/prisma';

const isDevelopment = process.env.NODE_ENV === 'development';

const providers: any[] = [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
  }),
];

// Add development authentication provider only in development mode
if (isDevelopment) {
  providers.push(
    CredentialsProvider({
      id: 'dev-auth',
      name: 'Development Auth',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'test@example.com'
        },
        name: {
          label: 'Name',
          type: 'text',
          placeholder: 'Test User'
        }
      },
      async authorize(credentials) {
        // Only allow in development
        if (!isDevelopment) {
          return null;
        }

        // Simple validation - just check if email is provided
        if (credentials?.email) {
          return {
            id: 'dev-user',
            email: credentials.email,
            name: credentials.name || 'Test User',
          };
        }
        return null;
      },
    })
  );
}

const handler = NextAuth({
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (user.email) {
        try {
          // Check if Guardian already exists
          const existingGuardian = await prisma.guardian.findUnique({
            where: { email: user.email },
          });

          // Create Guardian if it doesn't exist
          if (!existingGuardian) {
            await prisma.guardian.create({
              data: {
                email: user.email,
              },
            });
          }
        } catch (error) {
          console.error('Error creating Guardian:', error);
          // Continue with sign in even if Guardian creation fails
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user?.email) {
        try {
          // Fetch Guardian data to include in session
          const guardian = await prisma.guardian.findUnique({
            where: { email: session.user.email },
            include: {
              students: true,
            },
          });

          if (guardian) {
            session.guardian = guardian;
          }
        } catch (error) {
          console.error('Error fetching Guardian for session:', error);
        }
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };