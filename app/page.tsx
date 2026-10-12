"use client";
import Link from "next/link";import {useEffect,useState} from "react";
import Catalogue from "@/components/Catalogue";import {uid} from "@/lib/db";import {sb} from "@/lib/supabase";
export default function Home(){const [u,setU]=useState<string|null>(null);useEffect(()=>{uid().then(setU)},[]);
return <main><header className="flex items-center gap-2 p-4"><span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-2xl font-extrabold text-transparent">Kukudo 💊🐼</span><span className="flex-1"/>
{sb&&(u?<button onClick={()=>sb.auth.signOut().then(()=>location.reload())} className="text-sm text-white/70">Log out</button>:<Link href="/login" className="text-sm text-white/70">Log in</Link>)}
<Link href="/create" className="rounded-full bg-violet-600 px-4 py-2 text-sm font-bold">+ Create</Link></header><Catalogue/></main>}
