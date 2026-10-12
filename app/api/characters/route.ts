import {user,limited,err,tooBig,sniff,putAvatar,dropAvatar,CATS} from "@/lib/server";
export const runtime="nodejs";
function validate(b:any,create:boolean){const o:any={},e:string[]=[];
 const f=(k:string,max:number,req=false)=>{if(b[k]===undefined){if(req&&create)e.push(k+" is required");return}
  if(typeof b[k]!="string"||b[k].length>max||(req&&!b[k].trim()))e.push(k+" is invalid (max "+max+" characters)");else o[k]=b[k].trim()};
 f("name",60,true);f("bio",300);f("personality",3000,true);f("backstory",3000);f("greeting",500);
 if(b.example_dialogs!==undefined){if(!Array.isArray(b.example_dialogs)||b.example_dialogs.length>3||b.example_dialogs.some((x:any)=>typeof x!="string"||x.length>400))e.push("example_dialogs invalid");else o.example_dialogs=b.example_dialogs.map((x:string)=>x.trim()).filter(Boolean)}
 if(b.tags!==undefined){if(!Array.isArray(b.tags)||b.tags.length>8||b.tags.some((x:any)=>typeof x!="string"||!/^[\p{L}\p{N} _-]{1,24}$/u.test(x)))e.push("tags invalid");else o.tags=b.tags.map((x:string)=>x.trim().toLowerCase())}
 if(b.voice_id!==undefined){if(typeof b.voice_id!="string"||(b.voice_id&&!/^[A-Za-z0-9]{10,40}$/.test(b.voice_id)))e.push("voice_id invalid");else o.voice_id=b.voice_id||null}
 if(b.is_published!==undefined){if(typeof b.is_published!="boolean")e.push("is_published invalid");else o.is_published=b.is_published}
 f("scenario",1000);f("memory_notes",1000);
 if(b.category!==undefined){if(!CATS.includes(b.category))e.push("category invalid");else o.category=b.category}
 if(b.conversation_starters!==undefined){if(!Array.isArray(b.conversation_starters)||b.conversation_starters.length>4||b.conversation_starters.some((x:any)=>typeof x!="string"||x.length>120))e.push("conversation_starters invalid");else o.conversation_starters=b.conversation_starters.map((x:string)=>x.trim()).filter(Boolean)}
 return {o,e}}
function decode(s:any){if(s===undefined||s==="")return {buf:null as ArrayBuffer|null};if(typeof s!="string"||s.length>3_000_000)return {error:"avatar too large (max 2 MB)"};
 const m=/^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(s);if(!m)return {error:"avatar must be a JPG, PNG or WebP image"};
 const b=Buffer.from(m[1],"base64");if(b.length>2*1024*1024||!sniff(new Uint8Array(b)))return {error:"avatar is not a valid image"};
 return {buf:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength) as ArrayBuffer}}
async function body(req:Request){if(tooBig(req,3_300_000))return null;try{const b=await req.json();return b&&typeof b=="object"?b:null}catch{return null}}
export async function POST(req:Request){
const u=await user(req);if(!u)return err("Please log in",401);
if(limited("char:"+u.id,10))return err("Too many requests. Wait a minute.",429);
const b=await body(req);if(!b)return err("Malformed or oversized request",400);
const {o,e}=validate(b,true);const av=decode(b.avatar);if("error" in av)e.push(av.error!);
if(e.length)return err(e.join("; "),400);
let url:string|null=null;if("buf" in av&&av.buf){const p=await putAvatar(u.sb,u.id,av.buf,"char");if(!p)return err("Avatar upload failed",500);url=p.url}
const id=crypto.randomUUID();
const {error}=await u.sb.from("characters").insert({id,...o,avatar:url,creator_id:u.id,is_published:o.is_published??false});
if(error){await dropAvatar(u.sb,u.id,url);if((error as any).code=="23505")return err("You already created a character like this",409);if((error as any).code=="P0001")return err("Daily character limit reached. Try again tomorrow.",429);return err("Could not save the character",500)}
return Response.json({id})}
export async function PATCH(req:Request){
const u=await user(req);if(!u)return err("Please log in",401);
if(limited("char:"+u.id,20))return err("Too many requests. Wait a minute.",429);
const b=await body(req);if(!b||typeof b.id!="string"||b.id.length>64)return err("Malformed or oversized request",400);
const {o,e}=validate(b,false);const av=decode(b.avatar);if("error" in av)e.push(av.error!);
if(e.length)return err(e.join("; "),400);
const {data:cur}=await u.sb.from("characters").select("id,avatar").eq("id",b.id).eq("creator_id",u.id).maybeSingle();
if(!cur)return err("Character not found",404);
let url:string|null=null;if("buf" in av&&av.buf){const p=await putAvatar(u.sb,u.id,av.buf,"char");if(!p)return err("Avatar upload failed",500);url=p.url;o.avatar=url}
if(!Object.keys(o).length)return err("Nothing to update",400);
const {data:rows,error}=await u.sb.from("characters").update(o).eq("id",b.id).eq("creator_id",u.id).select("id");
if(error||!rows?.length){await dropAvatar(u.sb,u.id,url);return err("Could not update the character",error?500:403)}
if(url)await dropAvatar(u.sb,u.id,cur.avatar);
return Response.json({id:b.id})}
