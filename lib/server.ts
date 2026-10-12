import {createClient} from "@supabase/supabase-js";
export const err=(m:string,s:number,code?:string)=>Response.json({error:m,code},{status:s});
export async function user(req:Request){const t=(req.headers.get("authorization")||"").replace(/^Bearer /i,"");if(!t)return null;
const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{global:{headers:{Authorization:`Bearer ${t}`}},auth:{persistSession:false,autoRefreshToken:false}});
const {data,error}=await sb.auth.getUser(t);if(error||!data.user)return null;return {sb,id:data.user.id}}
// In-memory limiter: fine for one server, use Redis/Upstash when deployed on many instances.
const hits=new Map<string,number[]>();
export function limited(key:string,max:number,ms=60000){const n=Date.now(),a=(hits.get(key)||[]).filter(x=>n-x<ms);if(a.length>=max){hits.set(key,a);return true}a.push(n);hits.set(key,a);return false}
export const tooBig=(req:Request,max:number)=>Number(req.headers.get("content-length")||0)>max;
export async function loadChar(sb:any,id:string){const {CHARS}=await import("./characters");const c:any=CHARS.find(x=>x.id===id);
if(c)return {name:c.name,bio:c.bio,personality:c.personality,greeting:c.greeting,backstory:"",examples:[],voice_id:c.voice_id};
const {data}=await sb.from("characters").select("*").eq("id",id).maybeSingle();if(!data)return null;
return {name:data.name,bio:data.bio||"",personality:data.personality,greeting:data.greeting||"",backstory:data.backstory||"",examples:data.example_dialogs||[],voice_id:data.voice_id||"",scenario:data.scenario||"",memory_notes:data.memory_notes||""}}
export const IMG_EXT:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
export function sniff(b:Uint8Array):string|null{
 if(b[0]==0xff&&b[1]==0xd8&&b[2]==0xff)return "image/jpeg";
 if(b[0]==0x89&&b[1]==0x50&&b[2]==0x4e&&b[3]==0x47)return "image/png";
 if(b[0]==0x52&&b[1]==0x49&&b[2]==0x46&&b[3]==0x46&&b[8]==0x57&&b[9]==0x45&&b[10]==0x42&&b[11]==0x50)return "image/webp";return null}
export async function putAvatar(sb:any,uid:string,buf:ArrayBuffer,prefix:string){const t=sniff(new Uint8Array(buf));if(!t)return null;
 const path=`${uid}/${prefix}-${crypto.randomUUID()}.${IMG_EXT[t]}`;const {error}=await sb.storage.from("avatars").upload(path,buf,{contentType:t,upsert:false});if(error)return null;
 return {path,url:sb.storage.from("avatars").getPublicUrl(path).data.publicUrl as string}}
// Removes an old avatar only if it lives in this user's own folder.
export async function dropAvatar(sb:any,uid:string,ref?:string|null){if(!ref)return;const p=ref.includes("/avatars/")?ref.split("/avatars/")[1].split("?")[0]:ref;
 if(p.startsWith(uid+"/")&&!p.includes(".."))await sb.storage.from("avatars").remove([p]).catch(()=>{})}
export const CATS=["human","anime","fantasy","scifi","virtual-ai","romance","adventure","gaming","historical","mentor"];
