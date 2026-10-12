"use client";
import {useEffect,useState} from "react";import Link from "next/link";
import {sb} from "@/lib/supabase";import {authHeaders} from "@/lib/db";
import {KUKUDO_OWNER,isKukudoOwnerEmail} from "@/lib/owner";import VerifiedBadge from "@/components/VerifiedBadge";
export default function Profile(){const [email,setEmail]=useState("");const [url,setUrl]=useState("");const [msg,setMsg]=useState("");const [busy,setBusy]=useState(false);const [authed,setAuthed]=useState(true);
async function load(){if(!sb){setAuthed(false);return}const {data:{user}}=await sb.auth.getUser();if(!user){setAuthed(false);return}setEmail(user.email||"");
 const {data}=await sb.from("profiles").select("avatar_url").eq("id",user.id).maybeSingle();setUrl(data?.avatar_url?sb.storage.from("avatars").getPublicUrl(data.avatar_url).data.publicUrl:"")}
useEffect(()=>{load()},[]);
async function up(e:any){const f=e.target.files?.[0];if(!f)return;setMsg("");
 if(!["image/jpeg","image/png","image/webp"].includes(f.type))return setMsg("Use a JPG, PNG or WebP image.");
 if(f.size>2*1024*1024)return setMsg("Image must be under 2 MB.");
 setBusy(true);const fd=new FormData();fd.append("file",f);const h=await authHeaders();delete h["Content-Type"];
 try{const r=await fetch("/api/profile/avatar",{method:"POST",headers:h,body:fd});const j=await r.json();if(!r.ok)throw new Error(j.error);setMsg("Profile picture updated ✓");await load()}
 catch(x:any){setMsg("⚠️ "+(x.message||"Upload failed"))}setBusy(false);e.target.value=""}
const owner=isKukudoOwnerEmail(email);
return <main className="space-y-5 p-5 pb-8"><Link href="/" className="text-white/70">‹ Back</Link><h1 className="text-xl font-bold">Your profile</h1>
{authed&&<section className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">{url?<img src={url} alt="Your profile picture" className="h-20 w-20 rounded-full object-cover"/>:<div className="grid h-20 w-20 place-items-center rounded-full bg-violet-600 text-3xl">{(email[0]||"?").toUpperCase()}</div>}
<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2 font-semibold">{owner?KUKUDO_OWNER.name:(email||"Your account")}{owner&&<VerifiedBadge/>}</div><div className="break-all text-sm text-white/60">{email}</div>{owner&&<div className="mt-1 text-xs text-sky-300">Official Kukudo owner account</div>}<label className="mt-3 inline-block cursor-pointer"><span className="rounded-full bg-violet-600 px-4 py-2 text-sm font-bold">{busy?"Uploading…":url?"Replace picture":"Add picture"}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={up} disabled={busy} className="hidden"/></label></div></section>}
{!authed&&<section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="mb-3 text-sm text-white/70">Log in to edit your profile. You can still contact the Kukudo owner below.</p><Link href="/login" className="inline-block rounded-full bg-violet-600 px-4 py-2 text-sm font-bold">Log in</Link></section>}
{msg&&<p className="text-sm text-pink-300">{msg}</p>}
<section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div><h2 className="flex items-center gap-2 text-lg font-bold">Alson Machingauta <VerifiedBadge/></h2><p className="text-sm text-white/60">Kukudo owner · Official contact links</p></div>
<div className="space-y-3"><div className="text-sm font-semibold">📧 Gmail accounts</div>{KUKUDO_OWNER.emails.map(e=><a key={e} href={`mailto:${e}`} className="block break-all text-sm text-sky-300 underline decoration-white/20 underline-offset-4">{e}</a>)}
<div className="pt-1 text-sm font-semibold">📱 WhatsApp contact</div>{KUKUDO_OWNER.phones.map(n=><a key={n} href={`https://wa.me/${n}`} target="_blank" rel="noreferrer" className="block text-sm text-sky-300 underline decoration-white/20 underline-offset-4">+{n}</a>)}
<div className="pt-1 text-sm font-semibold">🌐 Join the community</div><a href={KUKUDO_OWNER.channelUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl bg-[#1c9b68]/15 px-3 py-3 text-sm font-semibold text-emerald-300">Follow the WhatsApp Channel <span>↗</span></a><a href={KUKUDO_OWNER.groupUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl bg-[#1c9b68]/15 px-3 py-3 text-sm font-semibold text-emerald-300">Join the WhatsApp Group <span>↗</span></a></div>
<p className="text-xs leading-relaxed text-white/45">The blue badge identifies the Kukudo owner account within this app; it does not represent verification by Google or WhatsApp.</p></section>
</main>}
