import type { NextAuthConfig } from "next-auth";
import { UserRole } from "@/config/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image?: string | null;
      role: UserRole;
      branchId: string | null;
      departmentId: string | null;
      employeeId: string | null;
      firstName: string;
      lastName: string;
      avatar: string;
      mustChangePassword: boolean;
    };
  }

  interface User {
    role: UserRole;
    branchId: string | null;
    departmentId: string | null;
    employeeId: string | null;
    firstName: string;
    lastName: string;
    avatar: string;
    mustChangePassword: boolean;
  }
}

export const authConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.branchId = user.branchId;
        token.departmentId = user.departmentId;
        token.employeeId = user.employeeId;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.avatar = user.avatar;
        token.mustChangePassword = user.mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.branchId = (token.branchId as string | null) ?? null;
        session.user.departmentId = (token.departmentId as string | null) ?? null;
        session.user.employeeId = (token.employeeId as string | null) ?? null;
        session.user.firstName = (token.firstName as string) ?? "";
        session.user.lastName = (token.lastName as string) ?? "";
        session.user.avatar = (token.avatar as string) ?? "";
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
      }
      return session;
    },
    async authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;
      const isAuth = Boolean(session?.user);

      const isPublic =
        pathname === "/" ||
        pathname.startsWith("/login") ||
        pathname.startsWith("/forgot-password") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon.ico");

      if (isPublic) return true;
      return isAuth;
    },
  },
} satisfies NextAuthConfig;
