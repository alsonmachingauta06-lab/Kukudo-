import {user,limited,err,tooBig,loadChar} from "@/lib/server";
export const runtime="nodejs";
export async function POST(req:Request){
const u=await user(req);if(!u)return err("Please log in",401);
if(tooBig(req,5000))return err("Request too large",413);
if(limited("tts:"+u.id,10))return err("Too many voice requests. Wait a minute.",429);
if(!process.env.ELEVENLABS_API_KEY)return err("Voice is not configured",503,"no_key");
let b:any;try{b=await req.json()}catch{return err("Malformed request",400)}
const text=String(b?.text||"").trim(),cid=String(b?.character_id||"");if(!text||text.length>2000||!cid)return err("Malformed request",400);
const c=await loadChar(u.sb,cid);if(!c)return err("Character not found",404);
if(!c.voice_id)return err("This character has no voice set",422,"no_voice");
const {data:chat}=await u.sb.from("chats").select("id").eq("character_id",cid).maybeSingle();
const {data:m}=chat?await u.sb.from("messages").select("id").eq("chat_id",chat.id).eq("role","assistant").eq("content",text).limit(1):{data:null};
if(!m?.length)return err("Voice can only be generated for this character's own replies",403);
const r=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(c.voice_id)}`,{method:"POST",headers:{"xi-api-key":process.env.ELEVENLABS_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({text:text.replace(/\*[^*]*\*/g,"").slice(0,800),model_id:"eleven_multilingual_v2",voice_settings:{stability:.5,similarity_boost:.75}}),signal:AbortSignal.timeout(30000)}).catch(()=>null);
if(!r)return err("Voice provider timed out",504);
if(r.status==401||r.status==402||r.status==429)return err("Voice quota or key problem",r.status==429?429:502,"quota");
if(!r.ok||!r.body)return err("Voice provider error",502);
return new Response(r.body,{headers:{"Content-Type":"audio/mpeg","X-Voice-Source":"elevenlabs","Cache-Control":"no-store"}})}
