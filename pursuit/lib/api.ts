import { isOwner } from "@/lib/owner";
import { getChatGPTUser } from "@/app/chatgpt-auth";
export async function identity(request:Request, mutate=false){
  const user=await getChatGPTUser();
  if(!user) return {error:Response.json({error:"Sign in with ChatGPT to save or use the agent."},{status:401}),user:null};
  if(!isOwner(user)) return {error:Response.json({error:"This internal workspace is restricted to its owner."},{status:403}),user:null};
  const origin=request.headers.get("origin");
  if(mutate && origin && origin!==new URL(request.url).origin) return {error:Response.json({error:"This request must come from this workspace."},{status:403}),user:null};
  return {user,error:null};
}
