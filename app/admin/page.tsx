"use client";
import {useEffect,useState} from "react";import {sb} from "@/lib/supabase";
export default function Admin(){const [rows,setRows]=useState<any[]|null>(null);const [err,setErr]=useState("");
async function load(){if(!sb)return;const {data,error}=await sb.from("reports").select("*").eq("status","open").order("created_at",{ascending:false}).limit(50);if(error)setErr("Could not load reports (admins only).");setRows(data||[])}
useEffect(()=>{load()},[]);
async function act(r:any,state:string){setErr("");if(r.target_type=="character"){const {error}=await sb!.rpc("moderate_character",{cid:r.target_id,state});if(error)return setErr("Not allowed.")}
 const {error}=await sb!.from("reports").update({status:state=="approved"?"dismissed":"actioned"}).eq("id",r.id);if(error)setErr("Could not update the report.");load()}
return <main className="space-y-2 p-4"><h1 className="text-xl font-bold">Moderation queue</h1>{err&&<p className="text-sm text-pink-300">{err}</p>}{rows?.length===0&&<p className="text-white/60">No open reports.</p>}
{rows?.map(r=><div key={r.id} className="rounded-2xl bg-white/10 p-3 text-sm"><b>{r.target_type}: {r.target_id}</b><div>{r.reason}{r.details?" — "+r.details:""}</div>
<div className="mt-2 flex gap-2"><button onClick={()=>act(r,"approved")} className="rounded-full bg-white/15 px-3 py-1">Keep (dismiss)</button><button onClick={()=>act(r,"removed")} className="rounded-full bg-pink-600 px-3 py-1">Remove</button></div></div>)}</main>}
