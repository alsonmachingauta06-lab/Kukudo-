import "./globals.css";import Nav from "@/components/Nav";
export const metadata={title:"Kukudo 💊🐼"};
export default function L({children}:{children:React.ReactNode}){return <html lang="en"><body className="max-w-md mx-auto min-h-screen">{children}<Nav/></body></html>}
