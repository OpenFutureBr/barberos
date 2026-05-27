import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      username: string
      isFirstLogin: boolean
      allowedResources: string[] // slugs where canView=true; ["*"] = admin (all)
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    username: string
    isFirstLogin: boolean
    allowedResources: string[]
  }
}
