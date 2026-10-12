// Usage: node scripts/catalogue.mjs seed|import|export [file]
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in YOUR shell only. Never commit the key or add it to client env vars.
import {createClient} from "@supabase/supabase-js";import fs from "fs";import crypto from "crypto";
const [cmd,file]=process.argv.slice(2);
const CATS=["human","anime","fantasy","scifi","virtual-ai","romance","adventure","gaming","historical","mentor"];
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!["seed","import","export"].includes(cmd)){console.error("Usage: node scripts/catalogue.mjs seed|import|export [file]");process.exit(1)}
if(!url||!key){console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your shell first.");process.exit(1)}
const sb=createClient(url,key,{auth:{persistSession:false}});
const s=(v,max,req)=>{if(v==null||v==="")return req?null:"";if(typeof v!="string"||v.length>max)return null;return v.trim()};
function clean(c,source){const e=[];const name=s(c.name,60,1),personality=s(c.personality,3000,1);if(!name)e.push("name");if(!personality)e.push("personality");
 const bio=s(c.bio,300),greeting=s(c.greeting,500),backstory=s(c.backstory,3000);if(bio===null||greeting===null||backstory===null)e.push("text too long");
 if(!CATS.includes(c.category))e.push("category");const tags=Array.isArray(c.tags)?c.tags.slice(0,8).map(t=>String(t).toLowerCase().slice(0,24)):[];
 const ex=Array.isArray(c.example_dialogs)?c.example_dialogs.slice(0,3).map(x=>String(x).slice(0,400)):[];const st=Array.isArray(c.conversation_starters)?c.conversation_starters.slice(0,4).map(x=>String(x).slice(0,120)):[];
 if(c.voice_id&&!/^[A-Za-z0-9]{10,40}$/.test(c.voice_id))e.push("voice_id");
 if(e.length)throw new Error((c.name||"?")+": invalid "+e.join(", "));
 const id=c.id&&/^[a-z0-9_-]{1,64}$/.test(c.id)?c.id:"imp-"+crypto.createHash("md5").update(name.toLowerCase()+"|"+personality.toLowerCase()).digest("hex").slice(0,16);
 return {id,name,bio,personality,backstory,greeting,example_dialogs:ex,conversation_starters:st,tags,category:c.category,voice_id:c.voice_id||null,source,is_published:true,moderation_state:source=="imported"?"pending":"approved",creator_id:null}}
if(cmd=="export"){let all=[],last="";for(;;){const {data,error}=await sb.from("characters").select("*").gt("id",last).order("id").limit(1000);if(error)throw error;if(!data.length)break;all=all.concat(data);last=data[data.length-1].id}
 fs.writeFileSync(file||"export.json",JSON.stringify(all,null,1));console.log("exported",all.length)}
else{const source=cmd=="seed"?"builtin":"imported";const rows=JSON.parse(fs.readFileSync(file||"seed/starter.json","utf8"));const seen=new Set(),ok=[];let bad=0;
 for(const r of rows){try{const c=clean(r,source);if(!seen.has(c.id)){seen.add(c.id);ok.push(c)}}catch(e){bad++;console.error("skip",e.message)}}
 let written=0,duplicates=0;
 for(let i=0;i<ok.length;i+=200){
  const batch=ok.slice(i,i+200);
  // Never overwrite an existing character just because an import/seed reuses its ID.
  const result=await sb.from("characters").upsert(batch,{onConflict:"id",ignoreDuplicates:true});
  if(!result.error){written+=batch.length;continue}
  // A separate content_hash uniqueness conflict can fail a batch; retry rows individually
  // so one duplicate does not discard unrelated valid rows.
  if(result.error.code!=="23505")throw result.error;
  for(const row of batch){
   const one=await sb.from("characters").upsert([row],{onConflict:"id",ignoreDuplicates:true});
   if(!one.error)written++;
   else if(one.error.code==="23505"){duplicates++;console.error("skip duplicate",row.name||row.id)}
   else throw one.error;
  }
 }
 console.log(`${source}: submitted ${ok.length}, inserted/accepted ${written}, duplicate conflicts ${duplicates}, invalid ${bad}`+(source=="imported"?" (imported rows start as 'pending' until approved)":""))}
