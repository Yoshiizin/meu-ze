import {authenticate,adminDb,errorResponse,noStore,sameOrigin} from '../_lib';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(req:Request){
  if(!sameOrigin(req))return errorResponse('Origem inválida.',403);
  const auth=await authenticate(req);
  if(!auth)return errorResponse('Entre no Meu Zé para receber notificações.',401);
  const admin=adminDb();
  if(!admin)return errorResponse('Servidor de notificações ainda não configurado.',503);
  let payload:{token?:unknown;enabled?:unknown};
  try{payload=await req.json()}catch{return errorResponse('Dados inválidos.',400)}
  const token=payload.token;
  if(typeof token!=='string'||!/^[A-Za-z0-9:_-]{30,4096}$/.test(token))return errorResponse('Token inválido.',400);
  if(payload.enabled===false){
    const {error}=await admin.from('push_devices').delete().eq('token',token).eq('user_id',auth.userId);
    if(error)return errorResponse('Falha ao desativar notificações.',500);
  }else{
    const {error}=await admin.from('push_devices').upsert({token,user_id:auth.userId,updated_at:new Date().toISOString()},{onConflict:'token'});
    if(error)return errorResponse('Tabela de dispositivos não configurada.',503);
  }
  return Response.json({ok:true},{headers:noStore});
}
