"use client";
import Link from "next/link";import {useEffect,useState} from "react";import {sb} from "@/lib/supabase";import {uid} from "@/lib/db";import {CHARS} from "@/lib/characters";
type C={id:string;character_id:string;title:string|null;updated_at:string;name?:string;avatar?:string|null};
export default function Chats(){const [rows,setRows]=useState<C[]|null>(null);const [authed,setAuthed]=useState(true);const [err,setErr]=useState("");
async function load(){if(!sb)return setRows([]);if(!(await uid())){setAuthed(false);return}
 const {data,error}=await sb.from("chats").select("id,character_id,title,updated_at").order("updated_at",{ascending:false}).limit(50);if(error)return setErr("Could not load your chats.");
 const ids=Array.from(new Set((data||[]).map((c:any)=>c.character_id)));const {data:cs}=ids.length?await sb.from("characters").select("id,name,avatar").in("id",ids):{data:[]};
 const m:any={};(cs||[]).forEach((c:any)=>m[c.id]=c);CHARS.forEach(c=>{if(!m[c.id])m[c.id]={name:c.name,avatar:c.avatar}});
 setRows((data||[]).map((c:any)=>({...c,name:m[c.character_id]?.name||"Unknown character",avatar:m[c.character_id]?.avatar})))}
useEffect(()=>{load()},[]);
async function rename(c:C){const t=prompt("Conversation name",c.title||c.name||"");if(t===null)return;const {error}=await sb!.from("chats").update({title:t.trim().slice(0,80)||null}).eq("id",c.id);if(error)setErr("Could not rename.");load()}
async function del(c:C){if(!confirm("Delete this conversation and all its messages?"))return;const {error}=await sb!.from("chats").delete().eq("id",c.id);if(error)setErr("Could not delete.");load()}
if(!authed)return <main className="p-6"><h1 className="mb-2 text-xl font-bold">Chats</h1><p>Log in to see your conversations.</p><Link href="/login" className="text-violet-300">Log in</Link></main>;
return <main className="space-y-2 p-4"><h1 className="text-xl font-bold">Chats</h1>{err&&<p className="text-sm text-pink-300">{err}</p>}
{rows===null&&<div className="h-16 animate-pulse rounded-2xl bg-white/10"/>}
{rows?.length===0&&<p className="py-8 text-center text-white/60">No conversations yet. Open a character and say hi.</p>}
{rows?.map(c=><div key={c.id} className="flex items-center gap-3 rounded-2xl bg-white/10 p-3"><Link href={"/chat/"+c.character_id} className="flex flex-1 items-center gap-3">{c.avatar?<img src={c.avatar} alt="" className="h-12 w-12 rounded-full object-cover"/>:<div className="grid h-12 w-12 place-items-center rounded-full bg-violet-600">{c.name?.[0]}</div>}
<div><b>{c.title||c.name}</b><div className="text-xs text-white/60">{c.title?c.name+" · ":""}{new Date(c.updated_at).toLocaleString()}</div></div></Link>
<button onClick={()=>rename(c)} aria-label="Rename" className="text-lg">✏️</button><button onClick={()=>del(c)} aria-label="Delete" className="text-lg">🗑️</button></div>)}</main>}
