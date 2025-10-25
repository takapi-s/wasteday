import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home/route.tsx"),
  route("/login", "routes/login/route.tsx"),
  route("/signup", "routes/signup/route.tsx"),
  route("/logout", "routes/logout/route.tsx"),
  route("/unauthorized", "routes/unauthorized/route.tsx"),
  route("/tenant", "routes/tenant/route.tsx"),
  // API routes
  route("/api/auth/register", "routes/api/auth/register.ts"),
  route("/api/auth/login", "routes/api/auth/login.ts"),
  route("/api/auth/verify", "routes/api/auth/verify.ts"),
  route("/api/users/me", "routes/api/users/me.ts"),
] satisfies RouteConfig;
