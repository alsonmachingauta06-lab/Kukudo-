"use client";
import {useState} from "react";import {useRouter} from "next/navigation";import {sb} from "@/lib/supabase";
export default function Login(){const r=useRouter();const [e,setE]=useState("");const [p,setP]=useState("");const [up,setUp]=useState(false);const [msg,setMsg]=useState("");
async function go(){if(!sb)return setMsg("Add your Supabase keys to .env.local first.");
const x=up?await sb.auth.signUp({email:e,password:p}):await sb.auth.signInWithPassword({email:e,password:p});
if(x.error)return setMsg(x.error.message);if(up&&!x.data.session)return setMsg("Check your email to confirm, then log in.");r.push("/")}
const I="w-full rounded-xl bg-white/10 p-3 outline-none";
return <main className="space-y-3 p-6"><h1 className="text-2xl font-extrabold">Kukudo 💊🐼</h1><p className="text-white/70">{up?"Create your account":"Log in to save your chats"}</p>
<input className={I} type="email" placeholder="Email" value={e} onChange={x=>setE(x.target.value)}/><input className={I} type="password" placeholder="Password (6+ characters)" value={p} onChange={x=>setP(x.target.value)}/>
<button onClick={go} className="w-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 p-3 font-bold">{up?"Sign up":"Log in"}</button>
<button onClick={()=>setUp(!up)} className="w-full text-sm text-white/70">{up?"Have an account? Log in":"New here? Sign up"}</button>{msg&&<p className="text-sm text-pink-300">{msg}</p>}</main>}
