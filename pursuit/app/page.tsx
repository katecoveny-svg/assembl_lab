import Creative from "./creative/studio";
import {requireChatGPTUser} from "./chatgpt-auth";
import {isOwner} from "@/lib/owner";
import {notFound} from "next/navigation";
export const dynamic="force-dynamic";
export default async function Page(){const user=await requireChatGPTUser("/");if(!isOwner(user))notFound();return <Creative standalone/>;}
