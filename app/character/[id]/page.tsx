"use client";
import {useParams,useRouter} from "next/navigation";import {useEffect,useState} from "react";import Link from "next/link";
import {sb} from "@/lib/supabase";import {uid,followsList,likesList,toggleFollowDb,toggleLikeDb,stats} from "@/lib/db";import {CHARS} from "@/lib/characters";import {fmt} from "@/lib/store";
const REASONS=["spam","sexual_content","harassment","impersonation","illegal","other"];
export default function Detail(){const {id}=useParams<{id:string}>();const r=useRouter();
const [c,setC]=useState<any>(null);const [miss,setMiss]=useState(false);const [u,setU]=useState<string|null>(null);const [fw,setFw]=useState(false);const [lk,setLk]=useState(false);const [n,setN]=useState({c:0,l:0,f:0});const [msg,setMsg]=useState("");const [rep,setRep]=useState(false);const [reason,setReason]=useState("spam");const [det,setDet]=useState("");
useEffect(()=>{(async()=>{setU(await uid());let row:any=null;if(sb){const {data}=await sb.from("characters").select("id,name,bio,greeting,tags,category,avatar,background,example_dialogs,conversation_starters,creator_id,source").eq("id",id).maybeSingle();row=data}
 if(!row){const b=CHARS.find(x=>x.id==id);if(b)row={id:b.id,name:b.name,bio:b.bio,greeting:b.greeting,tags:b.tags,category:b.category,avatar:b.avatar,example_dialogs:[b.greeting],conversation_starters:[],creator_id:null,source:"builtin"}}
 if(!row){setMiss(true);return}setC(row);setFw((await followsList()).includes(id));setLk((await likesList()).includes(id));const s=await stats();if(s?.[id])setN(s[id])})()},[id]);
async function tg(k:"f"|"l"){setMsg("");try{if(k=="f"){const x=await toggleFollowDb(id,fw?[id]:[]);setFw(x.includes(id))}else{const x=await toggleLikeDb(id,lk?[id]:[]);setLk(x.includes(id))}const s=await stats();if(s?.[id])setN(s[id])}catch(e:any){setMsg("⚠️ "+e.message)}}
async function share(){const url=location.origin+"/character/"+id;try{if(navigator.share)await navigator.share({title:c.name,url});else{await navigator.clipboard.writeText(url);setMsg("Link copied ✓")}}catch{}}
async function report(){if(!u)return setMsg("Log in to report.");const {error}=await sb!.from("reports").insert({target_type:"character",target_id:id,reason,details:det.trim().slice(0,500)||null});setMsg(error?(error.code=="23505"?"You already reported this character.":"⚠️ Could not send the report."):"Thanks, we'll review it.");if(!error)setRep(false)}
async function block(){if(!u)return setMsg("Log in to block creators.");if(!c.creator_id)return;if(!confirm("Hide all characters from this creator?"))return;const {error}=await sb!.from("user_blocks").insert({creator_id:c.creator_id});setMsg(error?"⚠️ Could not block.":"Creator blocked ✓")}
if(miss)return <main className="p-6"><p>This character isn't available.</p><Link href="/" className="text-violet-300">Back home</Link></main>;
if(!c)return <main className="p-6"><div className="h-64 animate-pulse rounded-2xl bg-white/10"/></main>;
const bg=c.background||c.avatar;const ex:string[]=Array.isArray(c.example_dialogs)?c.example_dialogs:[];const st:string[]=Array.isArray(c.conversation_starters)?c.conversation_starters:[];
return <main className="pb-6"><div className="relative h-72" style={{background:"linear-gradient(160deg,#7c3aed,#1c1533)"}}>{bg&&<img src={bg} alt="" className="h-full w-full object-cover"/>}<div className="absolute inset-0 bg-gradient-to-t from-[#0e0a1a] to-transparent"/>
<button onClick={()=>r.back()} className="absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xl" aria-label="Back">‹</button>
<div className="absolute bottom-3 left-4 right-4"><h1 className="text-2xl font-extrabold">{c.name}</h1><div className="text-xs text-white/70">{c.category} · {c.source=="builtin"?"Kukudo original":c.source=="imported"?"Imported":"Community"} · 💬 {fmt(n.c)} · 👥 {fmt(n.f)}</div></div></div>
<div className="space-y-4 px-4">
<div className="flex gap-2"><Link href={"/chat/"+id} className="flex-1 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 py-3 text-center font-bold">Chat</Link>
<button onClick={()=>tg("l")} className="rounded-full bg-white/10 px-4" aria-label="Like">{lk?"❤️":"🤍"} {fmt(n.l)}</button><button onClick={()=>tg("f")} className="rounded-full bg-white/10 px-4">{fw?"Following":"Follow"}</button><button onClick={share} className="rounded-full bg-white/10 px-4" aria-label="Share">🔗</button></div>
{msg&&<p className="text-sm text-pink-300">{msg}</p>}
<p className="text-white/85">{c.bio}</p>
<div className="flex flex-wrap gap-2">{(c.tags||[]).map((t:string)=><span key={t} className="rounded-full bg-white/10 px-3 py-1 text-xs">{t}</span>)}</div>
{c.greeting&&<section><h2 className="mb-1 font-bold">Greeting</h2><p className="rounded-2xl bg-white/10 p-3 text-sm">{c.greeting}</p></section>}
{!!ex.length&&<section><h2 className="mb-1 font-bold">Sample dialogue</h2>{ex.map((e,i)=><p key={i} className="mb-2 rounded-2xl bg-white/10 p-3 text-sm">{e}</p>)}</section>}
{!!st.length&&<section><h2 className="mb-1 font-bold">Conversation starters</h2><div className="flex flex-wrap gap-2">{st.map(s=><span key={s} className="rounded-full border border-white/15 px-3 py-1 text-xs">{s}</span>)}</div></section>}
{c.creator_id&&<Link href={"/creator/"+c.creator_id} className="block text-sm text-violet-300">View creator's characters</Link>}
<p className="text-xs text-white/50">Fictional character. Replies are written by AI and are not statements by any real person.</p>
<div className="flex gap-4 text-sm text-white/60"><button onClick={()=>setRep(!rep)} className="underline">Report</button>{c.creator_id&&c.creator_id!==u&&<button onClick={block} className="underline">Block creator</button>}</div>
{rep&&<div className="space-y-2 rounded-2xl bg-white/10 p-3"><select value={reason} onChange={e=>setReason(e.target.value)} className="w-full rounded-xl bg-[#1c1533] p-2">{REASONS.map(x=><option key={x} value={x}>{x.replace("_"," ")}</option>)}</select>
<textarea value={det} onChange={e=>setDet(e.target.value)} maxLength={500} rows={2} placeholder="Details (optional)" className="w-full rounded-xl bg-[#1c1533] p-2"/><button onClick={report} className="rounded-full bg-pink-600 px-4 py-2 text-sm font-bold">Send report</button></div>}
</div></main>}
