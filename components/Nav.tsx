"use client";
import Link from "next/link";import {usePathname} from "next/navigation";
const T=[["/","🏠","Home"],["/search","🔍","Search"],["/create","➕","Create"],["/chats","💬","Chats"],["/profile","👤","Profile"]];
export default function Nav(){const p=usePathname()||"/";if(p.startsWith("/chat/")||p.startsWith("/login"))return null;
const on=(h:string)=>h=="/"?p=="/":p.startsWith(h);
return <><div className="h-16"/><nav aria-label="Main" className="fixed bottom-0 left-0 right-0 z-30 mx-auto flex max-w-md border-t border-white/10 bg-[#120d22]/95 backdrop-blur">
{T.map(([h,i,l])=><Link key={h} href={h} aria-current={on(h)?"page":undefined} className={"flex flex-1 flex-col items-center py-2 text-xs "+(on(h)?"font-bold text-violet-300":"text-white/60")}><span className="text-lg">{i}</span>{l}</Link>)}</nav></>}
