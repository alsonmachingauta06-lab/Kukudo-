import {user,limited,err,tooBig,IMG_EXT,sniff,putAvatar,dropAvatar} from "@/lib/server";
export const runtime="nodejs";
export async function POST(req:Request){
const u=await user(req);if(!u)return err("Please log in",401);
if(tooBig(req,3*1024*1024))return err("Image must be under 2 MB",413);
if(limited("pfp:"+u.id,5))return err("Too many uploads. Wait a minute.",429);
let f:any;try{f=(await req.formData()).get("file")}catch{return err("Malformed upload",400)}
if(!f||typeof f=="string"||typeof f.arrayBuffer!="function")return err("No image provided",400);
if(f.size>2*1024*1024)return err("Image must be under 2 MB",413);
if(!IMG_EXT[f.type])return err("Use a JPG, PNG or WebP image",415);
const buf=await f.arrayBuffer();const real=sniff(new Uint8Array(buf));if(!real||real!==f.type)return err("File is not a valid image",415);
const put=await putAvatar(u.sb,u.id,buf,"profile");if(!put)return err("Upload failed",500);
const {data:old}=await u.sb.from("profiles").select("avatar_url").eq("id",u.id).maybeSingle();
const {error}=await u.sb.from("profiles").upsert({id:u.id,avatar_url:put.path});
if(error){await dropAvatar(u.sb,u.id,put.path);return err("Could not save your profile",500)}
await dropAvatar(u.sb,u.id,old?.avatar_url);
return Response.json({path:put.path,url:put.url})}
