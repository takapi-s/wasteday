import { createSupabaseServerClient } from "../../lib/supabase.server";
import { redirect } from "react-router";
import type { Route } from "./+types/route";

export async function action(args: Route.ActionArgs) {
  const { request, context } = args;
  const supabase = createSupabaseServerClient(args);
  
  await supabase.auth.signOut();
  
  throw redirect("/login");
}

export async function loader(args: Route.LoaderArgs) {
  const { request, context } = args;
  const supabase = createSupabaseServerClient(args);
  
  await supabase.auth.signOut();
  
  throw redirect("/login");
}
