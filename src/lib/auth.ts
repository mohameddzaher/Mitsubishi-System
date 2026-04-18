import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import * as argon2 from "argon2";
import { connectDB } from "./db";
import { User } from "@/models";
import { UserRole } from "@/config/roles";
import { authConfig } from "./auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        await connectDB();

        const user = await User.findOne({
          email: email.toLowerCase(),
          status: { $in: ["active", "pending"] },
          deletedAt: null,
        }).lean();

        if (!user) return null;

        const ok = await argon2.verify(user.passwordHash, password);
        if (!ok) return null;

        await User.updateOne(
          { _id: user._id },
          { $set: { lastLoginAt: new Date(), lastActivityAt: new Date() } },
        );

        return {
          id: String(user._id),
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          image: user.avatar ?? null,
          role: user.role as UserRole,
          branchId: user.branchId ? String(user.branchId) : null,
          departmentId: user.departmentId ? String(user.departmentId) : null,
          employeeId: user.employeeId ?? null,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar ?? "",
          mustChangePassword: Boolean(user.mustChangePassword),
        };
      },
    }),
  ],
});

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
