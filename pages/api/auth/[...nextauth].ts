import NextAuth from "next-auth";
import { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    // Add your auth providers here
  ],
};

export default NextAuth(authOptions);