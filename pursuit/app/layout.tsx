import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={title:"assembl creative · a shared canvas for you and your agents",description:"Generate sites, pitch decks and motion videos from one brief. Compare directions, refine with agents and keep every decision in view.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en-NZ"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600&display=swap" rel="stylesheet"/></head><body>{children}</body></html>;}
