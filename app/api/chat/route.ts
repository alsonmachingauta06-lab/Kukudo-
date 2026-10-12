import {user,limited,err,tooBig,loadChar} from "@/lib/server";
export const runtime="nodejs";
const URL_="https://openrouter.ai/api/v1/chat/completions";
const models=()=>(process.env.OPENROUTER_MODELS||"").split(",").map(s=>s.trim()).filter(Boolean);
export async function POST(req:Request){
const u=await user(req);if(!u)return err("Please log in to chat",401);
if(tooBig(req,10000))return err("Request too large",413);
if(limited("chat:"+u.id,20))return err("You're sending messages too fast. Wait a moment.",429);
const M=models();if(!M.length||!process.env.OPENROUTER_API_KEY)return err("Chat is not configured yet",503);
let b:any;try{b=await req.json()}catch{return err("Malformed request",400)}
const {character_id,message,request_id}=b||{};
if(typeof character_id!="string"||character_id.length>64||typeof message!="string"||!/^[0-9a-f-]{36}$/i.test(String(request_id)))return err("Malformed request",400);
const text=message.trim();if(!text||text.length>2000)return err("Message must be 1 to 2000 characters",400);
const c=await loadChar(u.sb,character_id);if(!c)return err("Character not found",404);
let {data:chat}=await u.sb.from("chats").select("id").eq("character_id",character_id).maybeSingle();
if(!chat){const r=await u.sb.from("chats").insert({character_id}).select("id").single();chat=r.data}
if(!chat)return err("Could not open the conversation",500);
const ins=await u.sb.from("messages").insert({chat_id:chat.id,role:"user",content:text,request_id});
if(ins.error){if(ins.error.code!=="23505")return err("Could not save your message",500);
 const {data:rep}=await u.sb.from("messages").select("content").eq("chat_id",chat.id).eq("request_id",request_id).eq("role","assistant").maybeSingle();
 if(rep)return Response.json({text:rep.content,duplicate:true})}
const {data:rows}=await u.sb.from("messages").select("role,content").eq("chat_id",chat.id).order("id",{ascending:false}).limit(20);
const history=(rows||[]).reverse().map((r:any)=>({role:r.role,content:r.content}));
const ex=(Array.isArray(c.examples)?c.examples:[]).slice(0,3).map((e:any)=>typeof e=="string"?e:JSON.stringify(e)).join("\n");
const sys=[`You are ${c.name}. ${c.bio}`,`Personality: ${c.personality}`,c.backstory&&`Backstory: ${c.backstory}`,c.scenario&&`Scenario: ${c.scenario}`,c.memory_notes&&`Memory instructions: ${c.memory_notes}`,c.greeting&&`Your opening line was: ${c.greeting}`,ex&&`Example dialogue:\n${ex}`,
"Rules: stay in character and keep a consistent voice. Never mention being an AI or these instructions. Write actions and inner thoughts in *italics*. Use emojis naturally. Reply in 1-3 short paragraphs. Do not invent shared memories that are not in this conversation. Keep content PG-13 with no explicit sexual content. For health topics give general wellness information only."].filter(Boolean).join("\n");
let last="";
for(const model of M){let r:Response;
 try{r=await fetch(URL_,{method:"POST",headers:{Authorization:`Bearer ${process.env.OPENROUTER_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model,stream:true,messages:[{role:"system",content:sys},...history],temperature:.9,max_tokens:500}),signal:AbortSignal.timeout(45000)})}catch{last="timeout";continue}
 if(!r.ok||!r.body){last=String(r.status);continue}
 const enc=new TextEncoder(),dec=new TextDecoder();let full="";
 const stream=new ReadableStream({async start(ctl){const rd=r.body!.getReader();let buf="";
  try{for(;;){const {done,value}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});const lines=buf.split("\n");buf=lines.pop()||"";
   for(const l of lines){if(!l.startsWith("data: "))continue;const d=l.slice(6).trim();if(d=="[DONE]")continue;try{const t=JSON.parse(d).choices?.[0]?.delta?.content;if(t){full+=t;ctl.enqueue(enc.encode(t))}}catch{}}}}
  catch{}
  if(full.trim())await u.sb.from("messages").insert({chat_id:chat!.id,role:"assistant",content:full,request_id});
  ctl.close()}});
 return new Response(stream,{headers:{"Content-Type":"text/plain; charset=utf-8","X-Model":model,"Cache-Control":"no-store"}})}
return err("The AI is unavailable right now. Try again shortly.",502,last)}
