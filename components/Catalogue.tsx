"use client";
import Link from "next/link";import {useCallback,useEffect,useRef,useState} from "react";
import {followsList,likesList,toggleFollowDb,toggleLikeDb,uid} from "@/lib/db";import {sb} from "@/lib/supabase";import {fmt} from "@/lib/store";
const CATS=["all","human","anime","fantasy","scifi","virtual-ai","romance","adventure","gaming","historical","mentor"];
const LBL:Record<string,string>={all:"All","virtual-ai":"Virtual AI",scifi:"Sci-Fi"};
const TABS=[["popular","For You"],["trending","Trending"],["new","Newest"],["following","Following"]];
type It={id:string;name:string;bio:string;tags:string[];category:string;avatar:string|null;cover:string|null;chat_count:number;like_count:number;follow_count:number};
const hue=(s:string)=>[...s].reduce((a,c)=>a+c.charCodeAt(0),0)%360;
export default function Catalogue({creator,autoFocus}:{creator?:string;autoFocus?:boolean}){
const [sort,setSort]=useState("popular"),[cat,setCat]=useState("all"),[q,setQ]=useState(""),[dq,setDq]=useState("");
const [items,setItems]=useState<It[]>([]),[next,setNext]=useState<string|null>(null),[loading,setLoading]=useState(true),[err,setErr]=useState("");
const [f,setF]=useState<string[]>([]),[lk,setLk]=useState<string[]>([]),[pend,setPend]=useState(""),[u,setU]=useState<string|null>(null);
const sentinel=useRef<HTMLDivElement>(null),gen=useRef(0);
useEffect(()=>{const t=setTimeout(()=>setDq(q.trim()),350);return()=>clearTimeout(t)},[q]);
useEffect(()=>{(async()=>{setU(await uid());setF(await followsList());setLk(await likesList())})()},[]);
const load=useCallback(async(cursor:string|null)=>{const my=++gen.current;setLoading(true);setErr("");
 try{const p=new URLSearchParams({sort,limit:"24"});if(cat!="all")p.set("category",cat);if(dq)p.set("q",dq);if(creator)p.set("creator",creator);if(cursor)p.set("cursor",cursor);
  const h:Record<string,string>={};if(sb){const {data}=await sb.auth.getSession();if(data.session)h.Authorization="Bearer "+data.session.access_token}
  const r=await fetch("/api/catalogue?"+p,{headers:h});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not load characters");
  if(my!==gen.current)return;setItems(x=>cursor?[...x,...j.items.filter((n:It)=>!x.some(y=>y.id===n.id))]:j.items);setNext(j.next)}
 catch(e:any){if(my===gen.current)setErr(e.message||"Could not load characters")}
 if(my===gen.current)setLoading(false)},[sort,cat,dq,creator]);
useEffect(()=>{setItems([]);setNext(null);load(null)},[load]);
useEffect(()=>{const el=sentinel.current;if(!el)return;const o=new IntersectionObserver(e=>{if(e[0].isIntersecting&&next&&!loading)load(next)},{rootMargin:"500px"});o.observe(el);return()=>o.disconnect()},[next,loading,load]);
async function tog(kind:"f"|"l",id:string){if(pend)return;setPend(kind+id);setErr("");
 try{const was=(kind=="f"?f:lk).includes(id);const n=kind=="f"?await toggleFollowDb(id,f):await toggleLikeDb(id,lk);const now=n.includes(id);kind=="f"?setF(n):setLk(n);
  if(now!==was)setItems(x=>x.map(i=>i.id==id?{...i,[kind=="f"?"follow_count":"like_count"]:Math.max(0,Number(i[kind=="f"?"follow_count":"like_count"])+(now?1:-1))}:i))}
 catch(e:any){setErr(e.message||"Something went wrong")}setPend("")}
return <div>
<div className="px-4"><input value={q} autoFocus={autoFocus} onChange={e=>setQ(e.target.value)} placeholder="Search names, tags, personalities" aria-label="Search characters" className="w-full rounded-full bg-white/10 px-4 py-3 outline-none"/></div>
{!creator&&<div className="flex gap-2 overflow-x-auto px-4 pt-3" role="tablist">{TABS.map(([k,l])=><button key={k} role="tab" aria-selected={sort==k} onClick={()=>setSort(k)} className={"shrink-0 rounded-full px-4 py-2 text-sm "+(sort==k?"bg-violet-600 font-bold":"bg-white/10")}>{l}</button>)}</div>}
<div className="flex gap-2 overflow-x-auto px-4 py-3">{CATS.map(c=><button key={c} aria-pressed={cat==c} onClick={()=>setCat(c)} className={"shrink-0 rounded-full border px-3 py-1 text-xs "+(cat==c?"border-pink-400 text-pink-300":"border-white/15 text-white/70")}>{LBL[c]||c[0].toUpperCase()+c.slice(1)}</button>)}</div>
{sort=="following"&&!u&&<p className="px-4 text-sm text-white/70">Log in to see characters you follow.</p>}
{err&&<div className="mx-4 mb-2 rounded-xl bg-pink-500/15 p-3 text-sm text-pink-200">{err} <button onClick={()=>load(null)} className="ml-2 underline">Retry</button></div>}
<div className="grid grid-cols-2 gap-3 px-4">
{items.map((c,i)=><div key={c.id} className="relative h-60 overflow-hidden rounded-2xl" style={{background:`linear-gradient(160deg,hsl(${hue(c.id)},65%,42%),hsl(${(hue(c.id)+60)%360},55%,16%))`}}>
 <Link href={"/character/"+c.id} className="absolute inset-0" aria-label={"Open "+c.name}>{c.avatar&&<img src={c.avatar} alt="" loading={i<4?"eager":"lazy"} className="h-full w-full object-cover"/>}<div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent"/></Link>
 <button onClick={()=>tog("l",c.id)} disabled={!!pend} aria-label="Like" className="absolute left-2 top-2 rounded-full bg-black/55 px-3 py-1 text-xs">{pend=="l"+c.id?"…":lk.includes(c.id)?"❤️":"🤍"} {fmt(Number(c.like_count))}</button>
 <button onClick={()=>tog("f",c.id)} disabled={!!pend} className="absolute right-2 top-2 rounded-full bg-black/55 px-3 py-1 text-xs">{pend=="f"+c.id?"…":f.includes(c.id)?"Following":"Follow"}</button>
 <div className="pointer-events-none absolute bottom-0 p-3"><b>{c.name}</b><p className="line-clamp-2 text-xs text-white/80">{c.bio}</p>
  <div className="mt-1 flex flex-wrap gap-1">{(c.tags||[]).slice(0,2).map(t=><span key={t} className="rounded-full bg-white/15 px-2 text-[10px]">{t}</span>)}</div>
  <span className="text-xs text-white/70">💬 {fmt(Number(c.chat_count))}</span></div></div>)}
{loading&&Array.from({length:items.length?2:6}).map((_,i)=><div key={"s"+i} className="h-60 animate-pulse rounded-2xl bg-white/10"/>)}</div>
{!loading&&!err&&!items.length&&<p className="p-8 text-center text-white/60">No characters found. Try another search or category.</p>}
<div ref={sentinel} className="h-8"/></div>}
