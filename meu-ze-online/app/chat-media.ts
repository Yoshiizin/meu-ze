import * as tus from 'tus-js-client';
import {getSupabase} from '../lib/supabase';

export type ChatAttachment={type:'image'|'video'|'sticker';url:string;caption?:string};
const prefix='::meuze-media-v1::';
const mimeExtensions:Record<string,string>={
  'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif',
  'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'
};
const baseUrl=(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,'');
const mediaPrefix=baseUrl+'/storage/v1/object/public/meuze-media/';

export function parseChatAttachment(body:string):ChatAttachment|null{
  if(!baseUrl)return null;
  try{
    const readable=body.match(/^(📷 Foto|🎬 Vídeo|🧩 Figurinha): (https:\/\/[^\s]+)$/);
    const obj:Partial<ChatAttachment>=readable
      ? {type:readable[1]==='📷 Foto'?'image':readable[1]==='🎬 Vídeo'?'video':'sticker',url:readable[2]}
      : body.startsWith(prefix)?JSON.parse(body.slice(prefix.length)) as Partial<ChatAttachment>:{};

    if(!obj||!['image','video','sticker'].includes(String(obj.type)))return null;
    if(typeof obj.url!=='string'||obj.url.length>1000||!obj.url.startsWith(mediaPrefix))return null;
    const rest=obj.url.slice(mediaPrefix.length);
    if(!/^[a-zA-Z0-9_\-/]+\.(jpg|png|webp|gif|mp4|webm|mov)$/.test(rest))return null;
    if(obj.type==='sticker'&&!/\.(png|webp|gif)$/.test(rest))return null;
    if(obj.type==='video'&&!/\.(mp4|webm|mov)$/.test(rest))return null;
    if(obj.type==='image'&&!/\.(jpg|png|webp|gif)$/.test(rest))return null;
    return {type:obj.type as ChatAttachment['type'],url:obj.url,caption:typeof obj.caption==='string'?obj.caption.slice(0,400):''};
  }catch{return null}
}

export function encodeChatAttachment(attachment:ChatAttachment):string{
  // Readable in older deployments that only support plain-text chat.
  if(!attachment.caption)return (attachment.type==='image'?'📷 Foto':attachment.type==='video'?'🎬 Vídeo':'🧩 Figurinha')+': '+attachment.url;
  return prefix+JSON.stringify({type:attachment.type,url:attachment.url,caption:attachment.caption.slice(0,400)});
}

export async function uploadChatFile(file:File,userId:string,onProgress:(percent:number)=>void):Promise<string>{
  const sb=getSupabase();
  if(!sb)throw Error('Armazenamento indisponível.');
  const ext=mimeExtensions[file.type];
  if(!ext)throw Error('Use JPG, PNG, WEBP, GIF, MP4, WEBM ou MOV.');
  if(!file.size)throw Error('O arquivo está vazio.');
  const {data:{session},error:authError}=await sb.auth.getSession();
  if(authError||!session)throw Error('Sessão expirada. Entre novamente.');
  if(!baseUrl)throw Error('Armazenamento não configurado.');
  const objectName=userId+'/'+crypto.randomUUID()+'.'+ext;
  const token=session.access_token;
  await new Promise<void>((resolve,reject)=>{
    const upload=new tus.Upload(file,{
      endpoint:baseUrl+'/storage/v1/upload/resumable',
      headers:{authorization:'Bearer '+token,'x-upsert':'false'},
      uploadDataDuringCreation:true,
      removeFingerprintOnSuccess:true,
      chunkSize:6*1024*1024,
      retryDelays:[0,3000,5000,10000,20000],
      metadata:{bucketName:'meuze-media',objectName,contentType:file.type,cacheControl:'3600'},
      onError:(error)=>reject(error),
      onProgress:(uploaded,total)=>onProgress(total?Math.round(uploaded/total*100):0),
      onSuccess:()=>resolve()
    });
    upload.start();
  });
  return sb.storage.from('meuze-media').getPublicUrl(objectName).data.publicUrl;
}
