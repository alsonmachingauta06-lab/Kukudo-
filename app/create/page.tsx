"use client";
import {useRouter} from "next/navigation";import {useEffect,useState} from "react";import {allChars,authHeaders,uid} from "@/lib/db";
const E={name:"",bio:"",personality:"",backstory:"",greeting:"",examples:"",tags:"",voice_id:"",pub:true,category:"human",starters:""};
export default function Create(){const r=useRouter();const [f,setF]=useState(E);const [pic,setPic]=useState("");const [cur,setCur]=useState("");const [eid,setEid]=useState("");const [busy,setBusy]=useState(false);const [msg,setMsg]=useState("");const [authed,setAuthed]=useState(true);
useEffect(()=>{(async()=>{setAuthed(!!(await uid()));const id=new URLSearchParams(location.search).get("edit");if(!id)return;
 const c:any=(await allChars()).find(x=>x.id===id&&x.mine);if(!c){setMsg("You can only edit your own characters.");return}
 setEid(id);setCur(c.avatar||"");setF({name:c.name,bio:c.bio,personality:c.personality,backstory:c.backstory||"",greeting:c.greeting,examples:(c.examples||[]).join("\n"),tags:c.tags.join(", "),voice_id:c.voice_id||"",pub:c.published!==false,category:c.category||"human",starters:(c.starters||[]).join("\n")})})()},[]);
const on=(k:string)=>(e:any)=>setF({...f,[k]:e.target.value});
function file(e:any){const x=e.target.files?.[0];if(!x)return;if(!["image/jpeg","image/png","image/webp"].includes(x.type))return setMsg("Use a JPG, PNG or WebP image.");
 const im=new Image();im.onload=()=>{const k=Math.min(1,720/Math.max(im.width,im.height)),cv=document.createElement("canvas");cv.width=im.width*k;cv.height=im.height*k;cv.getContext("2d")!.drawImage(im,0,0,cv.width,cv.height);setPic(cv.toDataURL("image/jpeg",.8))};im.src=URL.createObjectURL(x)}
async function save(){setMsg("");if(!f.name.trim()||!f.personality.trim())return setMsg("Add a name and a personality.");setBusy(true);
 try{const body:any={name:f.name,bio:f.bio,personality:f.personality,backstory:f.backstory,greeting:f.greeting,example_dialogs:f.examples.split("\n").map(s=>s.trim()).filter(Boolean).slice(0,3),tags:f.tags.split(",").map(s=>s.trim()).filter(Boolean),voice_id:f.voice_id.trim(),is_published:f.pub,category:f.category,conversation_starters:f.starters.split("\n").map(s=>s.trim()).filter(Boolean).slice(0,4)};
 if(pic)body.avatar=pic;if(eid)body.id=eid;
 const res=await fetch("/api/characters",{method:eid?"PATCH":"POST",headers:await authHeaders(),body:JSON.stringify(body)});const j=await res.json();if(!res.ok)throw new Error(j.error||"Could not save");r.push("/chat/"+j.id)}
 catch(e:any){setMsg("⚠️ "+e.message)}setBusy(false)}
const I="w-full rounded-xl bg-white/10 p-3 outline-none";
if(!authed)return <main className="p-6"><p>Log in to create characters.</p><a href="/login" className="text-violet-300">Log in</a></main>;
return <main className="space-y-3 p-4"><h1 className="text-xl font-bold">{eid?"Edit character":"Create character"}</h1>
<label className="block"><span className="rounded-full bg-violet-600 px-4 py-2 text-sm font-bold">Add picture</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={file} className="hidden"/></label>{(pic||cur)&&<img src={pic||cur} alt="" className="h-32 rounded-xl"/>}
<input className={I} placeholder="Name" maxLength={60} value={f.name} onChange={on("name")}/><input className={I} placeholder="Short bio" maxLength={300} value={f.bio} onChange={on("bio")}/>
<textarea className={I} rows={4} placeholder="Personality" maxLength={3000} value={f.personality} onChange={on("personality")}/>
<textarea className={I} rows={3} placeholder="Background story" maxLength={3000} value={f.backstory} onChange={on("backstory")}/>
<input className={I} placeholder="Greeting" maxLength={500} value={f.greeting} onChange={on("greeting")}/>
<textarea className={I} rows={3} placeholder={"Example dialogues, one per line (max 3)\nYou: Hi! / Luna: *grins* Hey you!"} value={f.examples} onChange={on("examples")}/>
<select className={I} value={f.category} onChange={on("category")} aria-label="Category">{["human","anime","fantasy","scifi","virtual-ai","romance","adventure","gaming","historical","mentor"].map(x=><option key={x} value={x} style={{color:"#000"}}>{x}</option>)}</select><textarea className={I} rows={2} placeholder={"Conversation starters, one per line (max 4)"} value={f.starters} onChange={on("starters")}/><input className={I} placeholder="Tags, comma separated (max 8)" value={f.tags} onChange={on("tags")}/><input className={I} placeholder="ElevenLabs voice ID (optional)" value={f.voice_id} onChange={on("voice_id")}/>
<label className="flex items-center gap-3 rounded-xl bg-white/10 p-3"><input type="checkbox" checked={f.pub} onChange={e=>setF({...f,pub:e.target.checked})}/><span>Published (everyone can find it)</span></label>
{msg&&<p className="text-sm text-pink-300">{msg}</p>}
<button onClick={save} disabled={busy} className="w-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 p-3 font-bold disabled:opacity-60">{busy?"Saving…":eid?"Save changes":"Create and chat"}</button></main>}
