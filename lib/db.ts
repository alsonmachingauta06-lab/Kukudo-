import {sb} from "./supabase";
import {Char,getAll,follows as lf,toggleFollow as lt,bump as lb} from "./store";
import {CHARS} from "./characters";
export async function uid():Promise<string|null>{if(!sb)return null;const {data}=await sb.auth.getUser();return data.user?.id??null}
function rowToChar(r:any,u:string|null):Char{return {id:r.id,name:r.name,age:20,gender:"",category:r.category||"human",bio:r.bio||"",personality:r.personality||"",greeting:r.greeting||"Hi! 👋",voice_id:r.voice_id||"",stability:.5,chat_count:Number(r.chat_count||0),tags:r.tags||[],look:r.name+", "+(r.bio||""),avatar:r.avatar||"",background:r.background||"",backstory:r.backstory||"",examples:r.example_dialogs||[],starters:r.conversation_starters||[],mine:!!u&&r.creator_id===u,published:r.is_published,custom:r.source!=="builtin"}}
// Own characters only (never the whole catalogue). Use getChar(id) for a single character and /api/catalogue for browsing.
export async function allChars():Promise<Char[]>{const u=await uid();if(!u)return getAll();const {data}=await sb!.from("characters").select("*").eq("creator_id",u).order("created_at",{ascending:false}).limit(200);return [...(data||[]).map((r:any)=>rowToChar(r,u)),...CHARS]}
export async function getChar(id:string):Promise<Char|null>{const u=await uid();if(sb){const {data}=await sb.from("characters").select("*").eq("id",id).maybeSingle();if(data)return rowToChar(data,u)}return CHARS.find(c=>c.id==id)||getAll().find(c=>c.id==id)||null}
export async function followsList():Promise<string[]>{const u=await uid();if(!u)return lf();const {data}=await sb!.from("follows").select("character_id");return (data||[]).map((r:any)=>r.character_id)}
export async function toggleFollowDb(id:string,cur:string[]):Promise<string[]>{const u=await uid();if(!u)return lt(id);
if(cur.includes(id)){const {error}=await sb!.from("follows").delete().eq("character_id",id).eq("user_id",u);if(error)throw new Error("Could not unfollow");return cur.filter(x=>x!==id)}
const {error}=await sb!.from("follows").insert({character_id:id});if(error&&error.code!=="23505")throw new Error("Could not follow");return cur.includes(id)?cur:[...cur,id]}
export async function counts():Promise<Record<string,number>|null>{if(!sb)return null;const {data}=await sb.from("char_stats").select("*");const m:Record<string,number>={};(data||[]).forEach((r:any)=>m[r.character_id]=Number(r.chat_count));return m}
export async function bumpChat(id:string){const u=await uid();if(!u){lb(id);return}await sb!.rpc("bump_chat",{cid:id})}
export async function history(id:string):Promise<{chat:string|null;msgs:any[]}>{const u=await uid();if(!u)return {chat:null,msgs:[]};
let {data:c}=await sb!.from("chats").select("id").eq("character_id",id).maybeSingle();
if(!c){const r=await sb!.from("chats").insert({character_id:id}).select("id").single();c=r.data}
const {data:m}=await sb!.from("messages").select("role,content,image_url").eq("chat_id",c!.id).order("id").limit(200);
const msgs=await Promise.all((m||[]).map(async(x:any)=>{let img=x.image_url||undefined;if(img&&!img.startsWith("http")){const s=await sb!.storage.from("images").createSignedUrl(img,3600);img=s.data?.signedUrl}return {role:x.role,content:x.content,img,path:x.image_url||undefined}}));return {chat:c!.id,msgs}}
export async function saveMsg(chat:string|null,m:{role:string;content:string;img?:string}){if(!chat||!sb)return;await sb.from("messages").insert({chat_id:chat,role:m.role,content:m.content,image_url:m.img||null})}
export async function saveChar(c:Char):Promise<boolean>{const u=await uid();if(!u)return false;
const {error}=await sb!.from("characters").insert({id:c.id,name:c.name,avatar:c.avatar,bio:c.bio,personality:c.personality,greeting:c.greeting,tags:c.tags,voice_id:c.voice_id});return !error}
export async function authHeaders():Promise<Record<string,string>>{const {data}=await sb!.auth.getSession();return {Authorization:"Bearer "+(data.session?.access_token||""),"Content-Type":"application/json"}}
export async function likesList():Promise<string[]>{const u=await uid();if(!u)return [];const {data}=await sb!.from("likes").select("character_id");return (data||[]).map((r:any)=>r.character_id)}
export async function toggleLikeDb(id:string,cur:string[]):Promise<string[]>{const u=await uid();if(!u)throw new Error("Log in to like characters");
if(cur.includes(id)){const {error}=await sb!.from("likes").delete().eq("character_id",id).eq("user_id",u);if(error)throw new Error("Could not remove your like");return cur.filter(x=>x!==id)}
const {error}=await sb!.from("likes").insert({character_id:id});if(error&&error.code!=="23505")throw new Error("Could not like");return cur.includes(id)?cur:[...cur,id]}
export async function stats(){if(!sb)return null;const {data}=await sb.from("char_stats").select("character_id,chat_count,like_count,follow_count");const m:Record<string,{c:number;l:number;f:number}>={};
(data||[]).forEach((r:any)=>{m[r.character_id]={c:Number(r.chat_count||0),l:Number(r.like_count||0),f:Number(r.follow_count||0)}});return m}
