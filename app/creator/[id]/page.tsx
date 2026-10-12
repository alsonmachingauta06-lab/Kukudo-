"use client";
import {useParams} from "next/navigation";import {useEffect,useState} from "react";import Link from "next/link";
import Catalogue from "@/components/Catalogue";import {sb} from "@/lib/supabase";
export default function Creator(){const {id}=useParams<{id:string}>();const [p,setP]=useState<any>(null);
useEffect(()=>{(async()=>{if(!sb)return;const {data}=await sb.from("profiles").select("name,avatar_url").eq("id",id).maybeSingle();setP(data)})()},[id]);
const av=p?.avatar_url&&sb?sb.storage.from("avatars").getPublicUrl(p.avatar_url).data.publicUrl:"";
return <main><div className="flex items-center gap-3 p-4"><Link href="/" className="text-xl">‹</Link>{av?<img src={av} alt="" className="h-14 w-14 rounded-full object-cover"/>:<div className="grid h-14 w-14 place-items-center rounded-full bg-violet-600">{(p?.name||"?")[0]}</div>}
<div><b>{p?.name||"Creator"}</b><div className="text-xs text-white/60">Published characters</div></div></div><Catalogue creator={id}/></main>}
