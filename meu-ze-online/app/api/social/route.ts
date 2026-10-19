import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Database = SupabaseClient;
const send = (error: string, status: number, extra?: Record<string, unknown>) =>
  Response.json({error, ...extra}, {status, headers:{'Cache-Control':'no-store'}});
const str = (v: unknown, n: number) => typeof v === 'string' ? v.trim().slice(0,n) : '';

async function context(req: Request): Promise<{db:Database, userId:string} | null> {
  const bearer = req.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_.-]{20,8192})$/);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!bearer || !url || !key) return null;
  const db = createClient(url,key,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{headers:{Authorization:`Bearer ${bearer[1]}`}}
  });
  const {data:{user},error} = await db.auth.getUser(bearer[1]);
  if (error || !user) return null;
  return {db,userId:user.id};
}

async function isMember(db:Database,userId:string):Promise<boolean>{
  const {data,error} = await db.from('members').select('user_id').eq('user_id',userId).maybeSingle();
  if(error) throw error;
  return Boolean(data);
}

export async function GET(req:Request) {
  try {
    const ctx=await context(req);
    if(!ctx) return send('Entre com sua conta.',401);
    if(!await isMember(ctx.db,ctx.userId))return send('Insira seu código de convite.',403,{needsInvite:true});
    const [profiles,posts,likes,comments]=await Promise.all([
      ctx.db.from('profiles').select('id,name,bio,theme').limit(300),
      ctx.db.from('posts').select('id,author,body,title,emoji,scene,image,media,created').order('created',{ascending:false}).limit(500),
      ctx.db.from('likes').select('post,user').limit(5000),
      ctx.db.from('comments').select('id,post,author,body,created').order('created',{ascending:false}).limit(5000)
    ]);
    for(const query of [profiles,posts,likes,comments]) if(query.error) throw query.error;
    return Response.json({me:ctx.userId,profiles:profiles.data,posts:posts.data,likes:likes.data,comments:comments.data},
      {headers:{'Cache-Control':'no-store'}});
  } catch(e){console.error('GET social failed',e);return send('Falha ao carregar o grupo. Verifique a configuração do banco.',500)}
}

function sanitizeTheme(v:unknown){
  const x=(v && typeof v === 'object' && !Array.isArray(v) ? v : {}) as Record<string,unknown>;
  const color=(s:unknown,fallback:string)=>typeof s==='string'&&/^#[0-9a-fA-F]{6}$/.test(s)?s:fallback;
  const image=(s:unknown,n:number)=>typeof s==='string' && s.length<=n &&
    (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s)||/^https:\/\/[^\s<>"]+$/.test(s))?s:'';
  const chat=(x.chat && typeof x.chat==='object' && !Array.isArray(x.chat) ? x.chat : {}) as Record<string,unknown>;
  const chatTheme={
    bg:color(chat.bg,'#ffffff'),ink:color(chat.ink,'#141414'),
    accent:color(chat.accent,'#1700b7'),sent:color(chat.sent,'#e8e6ff'),
    received:color(chat.received,'#f3f3f3'),
    font:['sans','serif','mono'].includes(String(chat.font))?chat.font:'sans',
    pattern:['plain','dots','grid'].includes(String(chat.pattern))?chat.pattern:'plain',
    wallpaper:image(chat.wallpaper,1000)
  };
  const song=str(x.song,500);
  const pinList=Array.isArray(x.pinned)?x.pinned.filter((id:unknown)=>typeof id==='string'&&/^[0-9a-f-]{36}$/.test(id)).slice(0,20):[];
  return {
    bg:color(x.bg,'#ffffff'),ink:color(x.ink,'#141414'),accent:color(x.accent,'#1700b7'),card:color(x.card,'#ffffff'),
    font:['serif','sans','mono'].includes(String(x.font))?x.font:'serif',
    pattern:['plain','grid','dots'].includes(String(x.pattern))?x.pattern:'plain',
    radius:Number.isFinite(x.radius)?Math.max(0,Math.min(36,Math.round(Number(x.radius)))):0,
    avatar:image(x.avatar,800000),cover:image(x.cover,1400000),wallpaper:image(x.wallpaper,1000),sticker:str(x.sticker,12),
    song:/^https:\/\/[^\s<>"]+$/.test(song)?song:'',songName:str(x.songName,100),
    favorites:str(x.favorites,500),layout:['list','grid'].includes(String(x.layout))?x.layout:'list',pinned:pinList,chat:chatTheme
  };
}

export async function POST(req:Request){
  try{
    const ctx=await context(req);
    if(!ctx)return send('Entre para continuar.',401);
    if(!await isMember(ctx.db,ctx.userId))return send('Você ainda não entrou no grupo.',403,{needsInvite:true});
    const origin=req.headers.get('origin');
    if(origin && origin!==new URL(req.url).origin)return send('Origem inválida.',403);
    const len=Number(req.headers.get('content-length')||0);
    if(len>3500000)return send('Imagem grande demais.',413);
    let x:Record<string,unknown>;
    try{x=await req.json()}catch{return send('Dados inválidos.',400)}
    if(!x || typeof x!=='object')return send('Dados inválidos.',400);
    const {db,userId}=ctx;
    if(x.action==='profile'){
      const theme=JSON.stringify(sanitizeTheme(x.theme));
      if(theme.length>3000000)return send('Imagem grande demais.',400);
      const {error}=await db.from('profiles').upsert({id:userId,name:str(x.name,40)||'Novo Zé',bio:str(x.bio,300),theme},{onConflict:'id'});
      if(error)throw error;
    }else if(x.action==='post'){
      const body=str(x.body,2000);
      if(!body)return send('Escreva alguma coisa.',400);
      const image=str(x.image,1200000);
      if(image&&!/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(image))return send('Imagem inválida.',400);
      const scene=['geral','musica','cinema','aleatorio'].includes(String(x.scene))?x.scene:'geral';
      const media=Array.isArray(x.media)?x.media.slice(0,30).filter((m:unknown)=>{if(!m||typeof m!=='object')return false;const v=m as Record<string,unknown>;return (v.type==='image'||v.type==='video')&&typeof v.url==='string'&&v.url.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/meuze-media/${userId}/`)&&v.url.length<1000}):[];
      const {error}=await db.from('posts').insert({id:crypto.randomUUID(),author:userId,body,media,title:str(x.title,100),emoji:str(x.emoji,12)||'✦',scene,image,created:Date.now()});
      if(error)throw error;
    }else if(x.action==='like'){
      const id=str(x.id,80);
      const {data,error:findError}=await db.from('likes').select('post').eq('post',id).eq('user',userId).maybeSingle();
      if(findError)throw findError;
      const r=data?await db.from('likes').delete().eq('post',id).eq('user',userId):await db.from('likes').insert({post:id,user:userId});
      if(r.error)throw r.error;
    }else if(x.action==='comment'){
      const body=str(x.body,1000);
      if(!body)return send('Escreva sua resposta.',400);
      const {error}=await db.from('comments').insert({id:crypto.randomUUID(),post:str(x.id,80),author:userId,body,created:Date.now()});
      if(error)throw error;
    }else if(x.action==='delete'){
      const {error}=await db.from('posts').delete().eq('id',str(x.id,80)).eq('author',userId);
      if(error)throw error;
    }else return send('Ação inválida.',400);
    return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  }catch(e){console.error('POST social failed',e);return send('Não foi possível salvar. Confira sua conexão e tente novamente.',400)}
}
