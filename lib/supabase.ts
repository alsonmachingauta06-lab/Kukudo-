import {createClient} from "@supabase/supabase-js";
export const sb=process.env.NEXT_PUBLIC_SUPABASE_URL?createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!):null;
