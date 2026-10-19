import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import {createSign} from 'node:crypto';

export const noStore={'Cache-Control':'no-store'};
export const errorResponse=(message:string,status:number)=>Response.json({error:message},{status,headers:noStore});
const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'';
const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';
const service=process.env.SUPABASE_SERVICE_ROLE_KEY||'';

export function adminDb():SupabaseClient|null{
  if(!url||!service)return null;
  return createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function authenticate(req:Request){
  const bearer=req.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_.-]{20,8192})$/);
  if(!bearer||!url||!anon)return null;
  const db=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:'Bearer '+bearer[1]}}});
  const {data:{user},error}=await db.auth.getUser(bearer[1]);
  if(error||!user)return null;
  const {data:member,error:membershipError}=await db.from('members').select('user_id').eq('user_id',user.id).maybeSingle();
  if(membershipError||!member)return null;
  return {db,userId:user.id};
}
export function sameOrigin(req:Request){
  const origin=req.headers.get('origin');
  return !origin||origin===new URL(req.url).origin;
}

type ServiceAccount={project_id:string;client_email:string;private_key:string};
let cachedAuth:{token:string;expires:number}|null=null;
async function firebaseAccessToken(account:ServiceAccount):Promise<string>{
  if(cachedAuth&&Date.now()<cachedAuth.expires-120000)return cachedAuth.token;
  const now=Math.floor(Date.now()/1000);
  const base64=(value:object)=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned=base64({alg:'RS256',typ:'JWT'})+'.'+base64({
    iss:account.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',
    aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600
  });
  const signer=createSign('RSA-SHA256');signer.update(unsigned);signer.end();
  const jwt=unsigned+'.'+signer.sign(account.private_key,'base64url');
  const res=await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt}),
    cache:'no-store'
  });
  if(!res.ok)throw Error('Firebase authentication failed: '+res.status);
  const body=await res.json() as {access_token:string;expires_in:number};
  cachedAuth={token:body.access_token,expires:Date.now()+body.expires_in*1000};
  return body.access_token;
}
function configuredAccount():ServiceAccount|null{
  try{
    const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if(!raw)return null;
    const account=JSON.parse(raw) as ServiceAccount;
    return account.project_id&&account.client_email&&account.private_key?account:null;
  }catch{return null}
}
function messagePreview(body:string){
  if(body.startsWith('::meuze-media-v1::')){
    try{
      const media=JSON.parse(body.slice('::meuze-media-v1::'.length)) as {type:string;caption?:string};
      return (media.type==='sticker'?'🧩 Figurinha':media.type==='video'?'🎬 Vídeo':'📷 Foto')+(media.caption?' · '+media.caption.slice(0,65):'');
    }catch{return '📎 Mídia'}
  }
  if(/^https:\/\//.test(body)&&body.length>150)return '📎 Mídia';
  return body.replace(/https:\/\/[^\s]+/g,'[mídia]').slice(0,110);
}
export async function notifyChatRecipients(sender:string,recipient:string|null,body:string,messageId:string){
  const account=configuredAccount(),admin=adminDb();
  if(!account||!admin)return; // Missing Firebase setup must never break chat.
  try{
    const [members,profile]=await Promise.all([
      recipient?Promise.resolve({data:[{user_id:recipient}],error:null}):
        admin.from('members').select('user_id').neq('user_id',sender).limit(300),
      admin.from('profiles').select('name').eq('id',sender).maybeSingle()
    ]);
    if(members.error||!members.data?.length)return;
    const ids=members.data.map(x=>x.user_id).filter(id=>id!==sender);
    if(!ids.length)return;
    const {data:devices,error}=await admin.from('push_devices').select('token,user_id').in('user_id',ids).limit(500);
    if(error||!devices?.length)return;
    const title=recipient?'Meu Zé · '+(profile.data?.name||'Mensagem nova'):'Meu Zé · Grupo da galera';
    const preview=messagePreview(body);
    const access=await firebaseAccessToken(account);
    const endpoint='https://fcm.googleapis.com/v1/projects/'+encodeURIComponent(account.project_id)+'/messages:send';
    await Promise.all(devices.map(async device=>{
      try{
        const thread=recipient?sender:'general';
        const res=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+access,'Content-Type':'application/json'},
          body:JSON.stringify({message:{token:device.token,data:{title,body:preview,thread,userId:device.user_id,messageId},android:{priority:'HIGH'}}})
        });
        if(!res.ok){
          const response=await res.text();
          if(res.status===404||response.includes('UNREGISTERED')){
            await admin.from('push_devices').delete().eq('token',device.token);
          }else console.error('FCM delivery error',res.status);
        }
      }catch(e){console.error('FCM device send failed',e)}
    }));
  }catch(e){console.error('Push dispatch failed',e)}
}
