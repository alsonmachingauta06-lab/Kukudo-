import {createClient} from "@supabase/supabase-js";
import {user,limited,err,CATS} from "@/lib/server";
export const runtime="nodejs";
export async function GET(req:Request){
const ip=(req.headers.get("x-forwarded-for")||"anon").split(",")[0].trim();if(limited("cat:"+ip,60))return err("Too many requests. Slow down a little.",429);
const sp=new URL(req.url).searchParams;
const sort=sp.get("sort")||"popular";if(!["popular","trending","new","following"].includes(sort))return err("Invalid sort",400);
const cat=sp.get("category");if(cat&&!CATS.includes(cat))return err("Invalid category",400);
const creator=sp.get("creator");if(creator&&!/^[0-9a-f-]{36}$/i.test(creator))return err("Invalid creator",400);
let limit=parseInt(sp.get("limit")||"24",10);if(!(limit>=1))limit=24;limit=Math.min(limit,40);
const cur=sp.get("cursor");let c1:string|null=null,c2:string|null=null;
if(cur){const m=(sort=="new"?/^(\d{4}-\d{2}-\d{2}T[\d:.+Z-]+)\|([\w-]{1,64})$/:/^(\d{1,15})\|([\w-]{1,64})$/).exec(cur);if(!m)return err("Invalid cursor",400);c1=m[1];c2=m[2]}
const toks=((sp.get("q")||"").slice(0,60).toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).slice(0,5);const qs=toks.length?toks.map(t=>t+":*").join(" & "):null;
const authed=!!req.headers.get("authorization");let sb:any;
if(authed){const u=await user(req);if(!u)return err("Your session expired. Log in again.",401);sb=u.sb}
else{if(sort=="following")return err("Log in to see characters you follow",401);sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false}})}
const {data,error}=await sb.rpc("catalogue_page",{p_sort:sort=="following"?"popular":sort,p_category:cat,p_q:qs,p_creator:creator,p_following:sort=="following",p_cursor:c1,p_cursor_id:c2,p_limit:limit});
if(error)return err("Could not load characters",500);
const rows=data||[],more=rows.length>limit,items=more?rows.slice(0,limit):rows,last=items[items.length-1];
const next=more&&last?(sort=="new"?last.created_at:String(last.popularity))+"|"+last.id:null;
return Response.json({items,next},{headers:{"Cache-Control":authed?"private, no-store":"public, s-maxage=30, stale-while-revalidate=120"}})}
