import {user,limited,err,tooBig} from "@/lib/server";
export const runtime="nodejs";
export async function POST(req:Request){
const u=await user(req);if(!u)return err("Please log in",401);
if(tooBig(req,4000))return err("Request too large",413);
if(limited("img:"+u.id,5))return err("Too many image requests. Wait a minute.",429);
if(!process.env.FAL_KEY)return err("Image generation is not configured",503);
let b:any;try{b=await req.json()}catch{return err("Malformed request",400)}
const prompt=String(b?.prompt||"").trim(),purpose=["avatar","chat","background"].includes(b?.purpose)?b.purpose:"chat",cid=typeof b?.character_id=="string"?b.character_id.slice(0,64):null;
if(prompt.length<3||prompt.length>500)return err("Prompt must be 3 to 500 characters",400);
let url:string|undefined;
try{const r=await fetch("https://fal.run/fal-ai/flux/schnell",{method:"POST",headers:{Authorization:`Key ${process.env.FAL_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({prompt:`realistic portrait photo of ${prompt}, adult, soft lighting, highly detailed`,image_size:"portrait_4_3",num_images:1}),signal:AbortSignal.timeout(60000)});
 if(!r.ok)return err("The image provider returned an error",502);url=(await r.json()).images?.[0]?.url}catch{return err("Image generation timed out",504)}
if(!url)return err("No image returned",502);
let buf:ArrayBuffer,type="image/jpeg";
try{const i=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!i.ok)throw 0;type=i.headers.get("content-type")||type;buf=await i.arrayBuffer()}catch{return err("Could not download the generated image",502)}
const path=`${u.id}/${crypto.randomUUID()}.${type.includes("png")?"png":"jpg"}`;
const up=await u.sb.storage.from("images").upload(path,buf,{contentType:type});if(up.error)return err("Could not store the image",500);
const {data:row}=await u.sb.from("generated_images").insert({character_id:cid,path,purpose,prompt}).select("id").single();
const s=await u.sb.storage.from("images").createSignedUrl(path,3600);
return Response.json({id:row?.id,path,url:s.data?.signedUrl,purpose})}
