import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),
  route("/login", "routes/login/route.tsx"),
  route("/unauthorized", "routes/unauthorized/route.tsx"),
] satisfies RouteConfig;
