import {authenticate,adminDb,errorResponse,noStore,notifyChatRecipients,sameOrigin} from '../../push/_lib';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(req:Request){
  if(!sameOrigin(req))return errorResponse('Origem inválida.',403);
  const auth=await authenticate(req);
  if(!auth)return errorResponse('Entre no Meu Zé para enviar mensagens.',401);
  let payload:{recipient?:unknown;body?:unknown};
  try{payload=await req.json()}catch{return errorResponse('Dados inválidos.',400)}
  const body=typeof payload.body==='string'?payload.body.trim().slice(0,2000):'';
  const recipient=payload.recipient===null?null:payload.recipient;
  if(!body)return errorResponse('Mensagem vazia.',400);
  if(recipient!==null&&(typeof recipient!=='string'||!/^[0-9a-f-]{36}$/i.test(recipient)))return errorResponse('Destinatário inválido.',400);
  if(recipient===auth.userId)return errorResponse('Destinatário inválido.',400);
  // Members can only read their own membership under RLS. Use service role for
  // optional recipient validation, and otherwise rely on the existing insert policy.
  const admin=adminDb();
  if(recipient&&admin){
    const {data:member,error}=await admin.from('members').select('user_id').eq('user_id',recipient).maybeSingle();
    if(error||!member)return errorResponse('Destinatário não encontrado.',404);
  }
  const {data:inserted,error}=await auth.db.from('chat_messages')
    .insert({sender:auth.userId,recipient,body}).select('id').single();
  if(error||!inserted)return errorResponse('Não foi possível enviar a mensagem.',400);
  // Best effort: a push outage never prevents sending the actual chat message.
  await notifyChatRecipients(auth.userId,recipient,body,inserted.id);
  return Response.json({ok:true,id:inserted.id},{headers:noStore});
}
