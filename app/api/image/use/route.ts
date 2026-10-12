import {user,limited,err,tooBig,putAvatar,dropAvatar} from "@/lib/server";
export const runtime="nodejs";
export async function POST(req:Request){
const u=await user(req);if(!u)return err("Please log in",401);
if(tooBig(req,2000))return err("Request too large",413);
if(limited("use:"+u.id,10))return err("Too many requests. Wait a minute.",429);
let b:any;try{b=await req.json()}catch{return err("Malformed request",400)}
const {path,target,character_id}=b||{};
if(typeof path!="string"||!path.startsWith(u.id+"/")||!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png)$/i.test(path))return err("Invalid image",400);
if(!["avatar","background","profile"].includes(target))return err("Invalid target",400);
const {data:row}=await u.sb.from("generated_images").select("id").eq("path",path).maybeSingle();if(!row)return err("Image not found",404);
const dl=await u.sb.storage.from("images").download(path);if(dl.error||!dl.data)return err("Could not read the image",502);
const buf=await dl.data.arrayBuffer();
if(target=="profile"){const put=await putAvatar(u.sb,u.id,buf,"profile");if(!put)return err("Could not store the image",500);
 const {data:old}=await u.sb.from("profiles").select("avatar_url").eq("id",u.id).maybeSingle();
 const {error}=await u.sb.from("profiles").upsert({id:u.id,avatar_url:put.path});if(error){await dropAvatar(u.sb,u.id,put.path);return err("Could not save your profile",500)}
 await dropAvatar(u.sb,u.id,old?.avatar_url);return Response.json({ok:true,url:put.url})}
if(typeof character_id!="string"||character_id.length>64)return err("character_id required",400);
const col=target=="avatar"?"avatar":"background";
const {data:ch}=await u.sb.from("characters").select("id,avatar,background").eq("id",character_id).eq("creator_id",u.id).maybeSingle();
if(!ch)return err("You can only change your own characters",403);
const put=await putAvatar(u.sb,u.id,buf,target=="avatar"?"char":"bg");if(!put)return err("Could not store the image",500);
const {data:rows,error}=await u.sb.from("characters").update({[col]:put.url}).eq("id",character_id).eq("creator_id",u.id).select("id");
if(error||!rows?.length){await dropAvatar(u.sb,u.id,put.path);return err("Could not update the character",500)}
await dropAvatar(u.sb,u.id,(ch as any)[col]);return Response.json({ok:true,url:put.url})}
