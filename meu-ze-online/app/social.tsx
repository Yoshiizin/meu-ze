'use client';
import {useState,useEffect,useRef,type CSSProperties,type TouchEvent as ReactTouchEvent} from 'react';
import {getSupabase, configured} from '../lib/supabase';
import RetroChat from './retro-chat';
import ChatSoundSettings from './chat-sound-settings';
import {readNotificationPreferences,saveNotificationPreferences,playNotificationSound,threadId,resolvedSound,type NotificationPreferences} from './chat-notifications';
import {parseChatAttachment} from './chat-media';
import {unlockChatAudio} from './chat-sounds';
import ProfilePlayer from './profile-player';
import MediaCropper from './media-cropper';
import {uploadSiteFile} from './chat-media';
import type {User} from '@supabase/supabase-js';
import {Home,Users,Search,Plus,Heart,MessageCircle,ArrowUpRight,ArrowLeft,Palette,X,Image as ImageIcon,Pin,Music,Check,Trash2,Lock,SlidersHorizontal,Bookmark,Send,Video,Bell,RefreshCw} from 'lucide-react';
type Theme={wallpaper?:string;bg:string;ink:string;accent:string;card:string;font:string;pattern:string;radius:number;avatar:string;cover:string;song:string;songName:string;favorites:string;sticker:string;layout:string;pinned:string[]};
type Profile={id:string;name:string;bio:string;theme:string};
type Post={media?:{url:string;type:string}[];id:string;author:string;body:string;title:string;emoji:string;scene:string;image:string;created:number};
const base:Theme={bg:'#ffffff',ink:'#141414',accent:'#1700b7',card:'#ffffff',font:'serif',pattern:'plain',radius:0,avatar:'',cover:'',song:'',songName:'Minha trilha sonora',favorites:'café sem pressa\nconversa de madrugada\nmúsica que arrepia',sticker:'✳',layout:'list',pinned:[]};
const themes=[['Zé original','#ffffff','#141414','#1700b7','#ffffff'],['Morango','#ffe6eb','#692641','#ff8bac','#fff4f6'],['Meia-noite','#171c29','#e4e4f8','#a8a4ff','#252b3c'],['Maré','#e2f0ff','#24466a','#9ecaff','#f3f9ff'],['Terracota','#eedacb','#5e352b','#f4a574','#fff2e6'],['Floresta','#dce8d3','#243c2b','#a1c77c','#f0f5e9']];
const scenes=[['geral','✳','Toda a galera'],['musica','♫','No repeat'],['cinema','◉','Cineclube'],['aleatorio','✧','Papo aleatório']];
const demos:Profile[]=[{id:'demo-lia',name:'Lia',bio:'colecionando pequenas coisas boas ☁',theme:JSON.stringify({...base,bg:'#e66622',ink:'#72270f',accent:'#f5be76',card:'#e66622',sticker:'✿',font:'serif'})},{id:'demo-bento',name:'Bento',bio:'um disco, um café e zero pressa.',theme:JSON.stringify({...base,bg:'#4a7f9b',ink:'#f3dc58',accent:'#f3dc58',card:'#4a7f9b',sticker:'☾'})},{id:'demo-nina',name:'Nina',bio:'a vida acontece fora do feed também.',theme:JSON.stringify({...base,bg:'#e2f0ff',ink:'#24466a',accent:'#9ecaff',card:'#f3f9ff',sticker:'✷'})}];
const demoPosts:Post[]=[{id:'demo-1',author:'demo-lia',title:'O luxo de não fazer nada',body:'Sentar na praça, comprar um picolé e ficar inventando a história das pessoas que passam. Recomendo muito esse rolê de milhões (que custa R$ 5).',emoji:'🍊',scene:'aleatorio',image:'',created:Date.now()-900000},{id:'demo-2',author:'demo-bento',title:'Um disco pra ouvir de ponta a ponta',body:'Clube da Esquina num domingo à tarde. Sem pular faixa. Quem vem pra sessão de escuta?',emoji:'💿',scene:'musica',image:'',created:Date.now()-3600000},{id:'demo-3',author:'demo-nina',title:'O próximo rolê podia ser assim',body:'Cada um leva uma comida, a gente escolhe um filme ruim e comenta como se fosse especialista. Fechado?',emoji:'🎞️',scene:'cinema',image:'',created:Date.now()-7200000}];
const parse=(p?:Profile):Theme=>{try{return {...base,...JSON.parse(p?.theme||'{}')}}catch{return base}};
const safeImage=(s:string)=>/^data:image\/(png|jpeg|webp|gif);base64,/.test(s)||/^https:\/\//.test(s)?s:'';
const fonts:Record<string,string>={sans:'Arial, sans-serif',serif:'Georgia, serif',mono:'Courier New, monospace'};
export default function Social(){
const [data,setData]=useState<{me:string;profiles:Profile[];posts:Post[];likes:{post:string;user:string}[];comments:{id:string;post:string;author:string;body:string}[]}>({me:'',profiles:[],posts:[],likes:[],comments:[]});
const initialSessionResolved=useRef(false);
const chatSeenRef=useRef<Set<string>|null>(null);
const chatLoadBusyRef=useRef(false);
const chatUserRef=useRef('');
const currentChatRef=useRef<{view:string;to:string|null}>({view:'welcome',to:null});
const [incomingNotice,setIncomingNotice]=useState<{thread:string;title:string;preview:string}|null>(null);
const [globalSoundPanel,setGlobalSoundPanel]=useState(false);
const [notificationPrefs,setNotificationPrefs]=useState<NotificationPreferences>(()=>readNotificationPreferences(''));
const [view,setView]=useState('welcome'),[profileId,setProfileId]=useState(''),[scene,setScene]=useState('geral'),[search,setSearch]=useState(''),[modal,setModal]=useState(''),[toast,setToast]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[demo,setDemo]=useState(false),[connection,setConnection]=useState('');
const [account,setAccount]=useState<User|null>(null),[needsInvite,setNeedsInvite]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[inviteCode,setInviteCode]=useState(''),[authMode,setAuthMode]=useState<'signin'|'signup'|'forgot'|'reset'>('signin'),[authBusy,setAuthBusy]=useState(false);
const [chatTo,setChatTo]=useState<string|null>(null),[chatText,setChatText]=useState(''),[messages,setMessages]=useState<{id:string;sender:string;recipient:string|null;body:string;created_at:string}[]>([]),[chatReady,setChatReady]=useState(false),[postMedia,setPostMedia]=useState<{url:string;type:string}[]>([]),[uploadBusy,setUploadBusy]=useState(false),[uploadProgress,setUploadProgress]=useState(0);
const [cropTarget,setCropTarget]=useState<{file:File;kind:'avatar'|'cover'}|null>(null);
// Pull-to-refresh is handled inside the site, so existing Android APKs receive it automatically.
const pullStartRef=useRef<number|null>(null);
const pullDistanceRef=useRef(0);
const pullRefreshingRef=useRef(false);
const [pullDistance,setPullDistance]=useState(0);
const [pullRefreshing,setPullRefreshing]=useState(false);
function resetPull(){
  pullStartRef.current=null;
  pullDistanceRef.current=0;
  setPullDistance(0);
}
function onFeedTouchStart(event:ReactTouchEvent<HTMLDivElement>){
  resetPull();
  if(view!=='feed'||modal||!data.me||pullRefreshingRef.current||event.touches.length!==1)return;
  if(window.scrollY>2||(document.scrollingElement?.scrollTop||0)>2)return;
  // Do not intercept gestures from independently scrolling widgets.
  for(let element=event.target instanceof Element?event.target:null;element&&element!==document.body;element=element.parentElement){
    if(element.scrollTop>2)return;
  }
  pullStartRef.current=event.touches[0].clientY;
}
function onFeedTouchMove(event:ReactTouchEvent<HTMLDivElement>){
  if(pullStartRef.current===null||event.touches.length!==1)return;
  if(window.scrollY>2||(document.scrollingElement?.scrollTop||0)>2){resetPull();return}
  const delta=event.touches[0].clientY-pullStartRef.current;
  const distance=delta>0?Math.min(100,delta*0.55):0;
  pullDistanceRef.current=distance;
  setPullDistance(distance);
}
async function refreshByPull(){
  if(pullRefreshingRef.current)return;
  pullRefreshingRef.current=true;
  setPullRefreshing(true);
  const started=Date.now();
  try{
    await refresh(); // Fetches the latest posts without reloading the page or logging out.
  }finally{
    await new Promise(resolve=>setTimeout(resolve,Math.max(0,450-(Date.now()-started))));
    pullRefreshingRef.current=false;
    setPullRefreshing(false);
  }
}
function onFeedTouchEnd(){
  const shouldRefresh=pullDistanceRef.current>=64;
  resetPull();
  if(shouldRefresh)void refreshByPull();
}
useEffect(()=>{if(view!=='feed')resetPull()},[view]);
useEffect(()=>{currentChatRef.current={view,to:chatTo}},[view,chatTo]);
useEffect(()=>{if(!incomingNotice)return;const timer=setTimeout(()=>setIncomingNotice(null),7000);return()=>clearTimeout(timer)},[incomingNotice]);
useEffect(()=>{
  setNotificationPrefs(readNotificationPreferences(data.me));
  const onChange=(event:Event)=>{if((event as CustomEvent<string>).detail===data.me)setNotificationPrefs(readNotificationPreferences(data.me))};
  const onStorage=(event:StorageEvent)=>{if(event.key==='meuze-notifications-v1-'+data.me)setNotificationPrefs(readNotificationPreferences(data.me))};
  window.addEventListener('meuze-notification-settings-changed',onChange);
  window.addEventListener('storage',onStorage);
  return()=>{window.removeEventListener('meuze-notification-settings-changed',onChange);window.removeEventListener('storage',onStorage)};
},[data.me]);
function updateNotificationPrefs(next:NotificationPreferences){
  setNotificationPrefs(next);
  saveNotificationPreferences(data.me,next);
}
const [draft,setDraft]=useState<Theme>(base),[name,setName]=useState('Novo Zé'),[bio,setBio]=useState('um cantinho da internet com a minha cara.'),[body,setBody]=useState(''),[title,setTitle]=useState(''),[emoji,setEmoji]=useState('✦'),[commentId,setCommentId]=useState(''),[reply,setReply]=useState('');
async function refresh(){
  const sb=getSupabase();
  if(!sb){setConnection('Configure o Supabase para ativar as contas.');setLoaded(true);return}
  try{
    const {data:{session}}=await sb.auth.getSession();
    setAccount(session?.user||null);
    // On a hard refresh, wait for Supabase to restore the saved session.
    // Returning members should land on the feed, not the public welcome screen.
    if(!initialSessionResolved.current){
      initialSessionResolved.current=true;
      if(session)setView('feed');
    }
    if(!session){setNeedsInvite(false);setData({me:'',profiles:[],posts:[],likes:[],comments:[]});setLoaded(true);return}
    const r=await fetch('/api/social',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
    const d=await r.json();
    if(r.status===403&&d.needsInvite){setNeedsInvite(true);setData({me:session.user.id,profiles:[],posts:[],likes:[],comments:[]});setConnection('');return}
    if(!r.ok){setConnection(d.error||'Não foi possível carregar. Tente novamente.');return}
    setNeedsInvite(false);setData(d);setConnection('');
  }catch{setConnection('Sem conexão. Tente novamente.')}finally{setLoaded(true)}
}
useEffect(()=>{
  const sb=getSupabase();
  if(!sb){setConnection('Configure o Supabase para ativar as contas.');setLoaded(true);return}
  void refresh();
  const {data:{subscription}}=sb.auth.onAuthStateChange((event,session)=>{
    setAccount(session?.user||null);
    if(event==='PASSWORD_RECOVERY'){setAuthMode('reset');setView('login')}
    // Espera o callback de autenticação terminar antes de consultar a sessão.
    queueMicrotask(()=>{void refresh()});
  });
  const t=setInterval(()=>{void refresh()},30000);
  return()=>{subscription.unsubscribe();clearInterval(t)};
},[]);
async function authenticate(){
  const sb=getSupabase();if(!sb)return notify('Falta configurar o Supabase.');
  if(!email.trim()||(!password&&authMode!=='forgot'))return notify('Preencha seus dados.');
  setAuthBusy(true);
  try{
    if(authMode==='forgot'){
      const {error}=await sb.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin});
      if(error)throw error;
      notify('Enviamos um link de recuperação para seu e-mail.');setAuthMode('signin');return;
    }
    if(authMode==='reset'){
      if(password.length<8)return notify('Escolha uma senha com pelo menos 8 caracteres.');
      const {error}=await sb.auth.updateUser({password});if(error)throw error;
      setAuthMode('signin');setView('feed');notify('Senha atualizada com sucesso.');await refresh();return;
    }
    if(password.length<8)return notify('A senha precisa ter pelo menos 8 caracteres.');
    if(authMode==='signup'){
      const {data,error}=await sb.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:window.location.origin}});
      if(error)throw error;
      if(!data.session){notify('Confira seu e-mail e clique no link de confirmação.');setAuthMode('signin');return}
    }else{
      const {error}=await sb.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;
    }
    setPassword('');setView('feed');await refresh();
  }catch(e){notify(e instanceof Error?e.message:'Não foi possível acessar a conta.')}
  finally{setAuthBusy(false)}
}
async function acceptInvite(){
  const sb=getSupabase();if(!sb)return;
  if(!inviteCode.trim())return notify('Peça o código para quem criou o Meu Zé.');
  setAuthBusy(true);
  try{
    const {data,error}=await sb.rpc('join_meu_ze',{invite_code:inviteCode.trim()});
    if(error)throw error;
    if(!data)throw Error('Código de convite incorreto ou desativado.');
    setInviteCode('');await refresh();setView('feed');notify('Você entrou no Meu Zé! ✳');
  }catch(e){notify(e instanceof Error?e.message:'Não foi possível usar o convite.')}
  finally{setAuthBusy(false)}
}
async function logout(){
  await getSupabase()?.auth.signOut();
  setAccount(null);setNeedsInvite(false);setDemo(false);setPassword('');
  setData({me:'',profiles:[],posts:[],likes:[],comments:[]});setMessages([]);setIncomingNotice(null);setGlobalSoundPanel(false);setView('welcome');setAuthMode('signin');
}
useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(''),4000);return()=>clearTimeout(t)}},[toast]);
const allProfiles=demo?[...data.profiles,...demos]:data.profiles,allPosts=demo?[...data.posts,...demoPosts]:data.posts;
const mine=data.profiles.find(p=>p.id===data.me);
const owner=allProfiles.find(p=>p.id===profileId);
const shownTheme=modal==='customize'?draft:view==='profile'?parse(owner):parse(mine);
const css={'--wallpaper':safeImage(shownTheme.wallpaper||'')?`url("${safeImage(shownTheme.wallpaper||'')}")`:'none','--bg':shownTheme.bg,'--ink':shownTheme.ink,'--accent':shownTheme.accent,'--card':shownTheme.card,'--round':shownTheme.radius+'px',fontFamily:fonts[shownTheme.font]||fonts.sans} as CSSProperties;
const notify=(s:string)=>setToast(s);
async function act(x:Record<string,unknown>){if(busy)return false;if(!data.me){notify('Entre com sua conta para salvar.');return false}setBusy(true);try{const {data:{session}}=await getSupabase()!.auth.getSession();if(!session)throw Error('Sessão expirada. Entre novamente.');const r=await fetch('/api/social',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(x)});const d=await r.json();if(!r.ok)throw Error(d.error||'Falha ao salvar.');await refresh();return true}catch(e){notify(e instanceof Error?e.message:'Falha ao salvar.');return false}finally{setBusy(false)}}
async function loadChat(){
  const sb=getSupabase(),user=data.me;
  if(!sb||!user||chatLoadBusyRef.current)return;
  chatLoadBusyRef.current=true;
  try{
    const {data:rows,error}=await sb.from('chat_messages').select('id,sender,recipient,body,created_at').order('created_at',{ascending:false}).limit(300);
    if(error||chatUserRef.current!==user)return;
    const ordered=(rows||[]).reverse() as {id:string;sender:string;recipient:string|null;body:string;created_at:string}[];
    const seen=chatSeenRef.current;
    if(seen){
      const incoming=ordered.filter(m=>!seen.has(m.id)&&m.sender!==user&&(m.recipient===null||m.recipient===user));
      for(const m of ordered)seen.add(m.id);
      if(seen.size>650)chatSeenRef.current=new Set(ordered.map(m=>m.id));
      if(incoming.length){
        const prefs=readNotificationPreferences(user);
        // Play at most one chime per poll, even if several messages arrived.
        const audible=[...incoming].reverse().find(m=>resolvedSound(prefs,threadId(m.sender,m.recipient,user)).tone!=='off');
        if(audible)playNotificationSound(prefs,threadId(audible.sender,audible.recipient,user));
        const latest=incoming[incoming.length-1];
        const thread=threadId(latest.sender,latest.recipient,user);
        const profile=data.profiles.find(p=>p.id===latest.sender);
        const title=latest.recipient===null?'Grupo da galera ✳':profile?.name||'Mensagem privada';
        const media=parseChatAttachment(latest.body);
        const preview=media?(media.type==='video'?'🎬 Enviou um vídeo':media.type==='sticker'?'🧩 Enviou uma figurinha':'📷 Enviou uma foto'):latest.body.slice(0,105);
        if(currentChatRef.current.view!=='chat'||(currentChatRef.current.to||'general')!==thread){
          setIncomingNotice({thread,title,preview});
        }
        if(prefs.desktop&&typeof window!=='undefined'&&'Notification' in window&&Notification.permission==='granted'&&document.hidden){
          try{
            const notification=new Notification('Meu Zé · '+title,{body:preview,tag:'meuze-chat-'+thread,icon:'/icon-192.png'});
            notification.onclick=()=>{window.focus();setChatTo(thread==='general'?null:thread);setView('chat');setIncomingNotice(null);notification.close()};
          }catch{}
        }
      }
    }else{
      // The first fetch after login/reload is a baseline, not a new-message alert.
      chatSeenRef.current=new Set(ordered.map(m=>m.id));
    }
    setMessages(ordered);setChatReady(true);
  }finally{chatLoadBusyRef.current=false}
}
useEffect(()=>{
  chatUserRef.current=data.me;
  chatSeenRef.current=null;
  setChatReady(false);
  if(!data.me){setMessages([]);setIncomingNotice(null);return}
  void loadChat();
  const timer=setInterval(()=>void loadChat(),5000);
  return()=>clearInterval(timer);
},[data.me]);
async function sendChat(payload?:string):Promise<boolean>{const sb=getSupabase();const content=(payload??chatText).trim();if(!sb||!content||!data.me)return false;const {error}=await sb.from('chat_messages').insert({sender:data.me,recipient:chatTo,body:content.slice(0,2000)});if(error){notify('Não foi possível enviar a mensagem. Tente novamente.');return false}if(payload===undefined)setChatText('');await loadChat();return true}
async function uploadMedia(file:File,kind:'image'|'video'|'audio'){
  if(!data.me)return null;
  const allowed=kind==='image'?['image/jpeg','image/png','image/webp','image/gif']:kind==='video'?['video/mp4','video/webm','video/quicktime']:['audio/mpeg','audio/mp4','audio/ogg'];
  if(!allowed.includes(file.type)){notify('Formato não aceito.');return null}
  if(!file.size){notify('Arquivo vazio.');return null}
  setUploadBusy(true);setUploadProgress(0);
  try{return await uploadSiteFile(file,data.me,setUploadProgress)}
  catch(e){notify(e instanceof Error?'Falha no upload: '+e.message:'Falha no upload. Confira o Storage do Supabase.');return null}
  finally{setUploadBusy(false);setUploadProgress(0)}
}
function openChat(id:string|null){setChatTo(id);setView('chat');void loadChat()}
function openProfile(id:string){setProfileId(id);setView('profile');setSearch('')}
function customize(){setDraft(parse(mine));setName(mine?.name||'Novo Zé');setBio(mine?.bio||'um cantinho da internet com a minha cara.');setModal('customize')}
function avatar(p?:Profile,large=false){const t=parse(p);return <span className={'avatar '+(large?'large':'')} style={{background:t.accent,color:t.ink}}>{safeImage(t.avatar)?<img src={safeImage(t.avatar)} alt=""/>:p?.name?.slice(0,1)||'Z'}</span>}
async function confirmCrop(file:File){
  if(!cropTarget)return false;
  const kind=cropTarget.kind;
  const url=await uploadMedia(file,'image');
  if(!url)return false;
  setDraft(d=>({...d,[kind]:url}));
  setCropTarget(null);
  return true;
}
const nav=[['feed',Home,'Meu feed'],['friends',Users,'A galera'],['chat',MessageCircle,'Chat'],['scenes',Music,'Nossos cantos'],['saved',Bookmark,'Meus favoritos']] as const;
let list=allPosts.filter(p=>(scene==='geral'||p.scene===scene)&&(p.title+' '+p.body+' '+allProfiles.find(a=>a.id===p.author)?.name).toLowerCase().includes(search.toLowerCase()));
if(view==='profile')list=allPosts.filter(p=>p.author===profileId).sort((a,b)=>Number(parse(owner).pinned.includes(b.id))-Number(parse(owner).pinned.includes(a.id)));
if(view==='saved')list=allPosts.filter(p=>data.likes.some(l=>l.post===p.id&&l.user===data.me));
function postCard(p:Post){const a=allProfiles.find(a=>a.id===p.author),liked=data.likes.some(l=>l.post===p.id&&l.user===data.me);return <article className="post" key={p.id}><div className="posthead"><button className="person" onClick={()=>openProfile(p.author)}>{avatar(a)}<span><strong>{a?.name||'Zé'}</strong><small>RECOMENDA · {p.id.startsWith('demo')?'perfil de exemplo':new Date(p.created).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</small></span></button><span className="tag">{scenes.find(s=>s[0]===p.scene)?.[2]}</span></div><div className="posttext"><span className="postemoji">{p.emoji}</span><div>{parse(a).pinned.includes(p.id)&&<small>⌖ fixado no perfil</small>}<h2>{p.title}</h2><p>{p.body}</p></div></div>{safeImage(p.image)&&<img className="postimage" src={safeImage(p.image)} alt="Imagem da publicação"/>}{(p.media||[]).map((m,i)=>m.type==='video'?<video key={i} className="postimage" controls playsInline preload="metadata" src={m.url}/>:<img key={i} className="postimage" loading="lazy" src={m.url} alt={`Foto ${i+1}`}/>)}{p.id==='demo-2'&&<div className="record"><span>♫</span><div>CLUBE DA ESQUINA<small>Milton Nascimento & Lô Borges • 1972</small></div><span className="vinyl">●</span></div>}<footer><button aria-label="Curtir" className={liked?'liked':''} onClick={()=>p.id.startsWith('demo')?notify('Publicação de exemplo. Crie a sua para interagir.'):act({action:'like',id:p.id})}><Heart size={18} fill={liked?'currentColor':'none'}/>{data.likes.filter(l=>l.post===p.id).length||'curtir'}</button><button onClick={()=>{setCommentId(p.id);setModal('comments')}}><MessageCircle size={18}/>{data.comments.filter(c=>c.post===p.id).length||'conversar'}</button>{p.author===data.me&&<><button aria-label="Fixar no perfil" onClick={()=>{const t=parse(mine);act({action:'profile',name:mine?.name,bio:mine?.bio,theme:{...t,pinned:t.pinned.includes(p.id)?t.pinned.filter(id=>id!==p.id):[...t.pinned,p.id]}})}}><Pin size={17}/></button><button aria-label="Excluir publicação" onClick={()=>{if(confirm('Excluir esta publicação?'))act({action:'delete',id:p.id})}}><Trash2 size={17}/></button></>}<button className="end" aria-label="Ver perfil" onClick={()=>openProfile(p.author)}><ArrowUpRight size={19}/></button></footer></article>}
if(!loaded)return <div className="authscreen"><div className="authcard"><h1>meu zé ✳</h1><p>Atualizando o feed…</p></div></div>;
if(view==='welcome')return <div className="piwelcome"><header><b>Meu Zé</b><nav><button onClick={()=>setView(account?'feed':'login')}>FEED</button><button onClick={()=>setView(account?'friends':'login')}>A GALERA</button><button className="yellow" onClick={()=>setView(account?'feed':'login')}>ENTRAR</button></nav></header><div className="pihero"><section><i>Um pouco do gosto dos seus amigos</i><h1>Guarde seus<br/>favoritos.</h1><p>Entre no Meu Zé e lembre como era bom estar na internet.</p><ul><li>Descobertas de pessoas que você conhece de verdade</li><li>Músicas, filmes, lugares e piadas que só a galera entende</li><li>Um perfil que você pode personalizar de cima a baixo</li></ul><p className="piitalic">Sem algoritmo, sem anúncios. Só você, seus amigos e um monte de coisa boa pra compartilhar.</p><h2>O gosto é seu.</h2><button className="yellow bigjoin" onClick={()=>setView(account?'feed':'login')}>ENTRAR NO MEU ZÉ →</button><p className="pismall">Seu círculo é privado. {data.me?'Você está conectado.':'Explore a prévia com perfis de exemplo.'}</p></section><div className="piphones" aria-label="Exemplos dos perfis personalizáveis"><div className="miniframe f1">🌻</div><div className="miniframe f2">🎧</div><div className="miniframe f3">🍊</div><div className="miniframe f4">🪩</div><div className="phone phoneone" onClick={()=>{setDemo(true);openProfile('demo-bento')}} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'){setDemo(true);openProfile('demo-bento')}}}><small>10:22　　● ▰</small><div className="phonecover">☁　✷　☁</div><div className="phoneprofile"><span className="squarephoto">☻</span><b>BENTO</b></div><small>@bento</small><p>um disco, um café e zero pressa.</p><p>♫ Clube da Esquina</p><button>VER PERFIL</button><div className="phonetabs">POSTS　 INFO　 FOTOS</div><article><small>★ FIXADOS</small><h3>💿 NO MEU REPEAT</h3><p>Tem música que vira lugar.</p></article></div><div className="phone phonetwo"><div className="phonelogo">Meu Zé</div><small>☻ @LIA　 RECOMENDA</small><h3>🍊 O LUXO DE NÃO FAZER NADA</h3><p>Sentar na praça, comprar um picolé e ficar inventando a história das pessoas que passam.</p><p>Um lugar pra guardar os pequenos favoritos da vida. A música que alguém te mostrou, a conversa de madrugada, aquele café na esquina.</p><p>É disso que a nossa internet é feita.</p><button onClick={()=>{setDemo(true);openProfile('demo-lia')}}>VISITAR</button><div className="phonefooter">♡　↗　♧　☆</div></div></div></div><section className="pibelow"><h2>Um lugar só seu.</h2><p>Cor, fonte, foto, música. Um perfil com a sua cara, visto do mesmo jeito por todos os seus amigos.</p><button onClick={()=>{setView('profile');setProfileId(data.me);customize()}}>PERSONALIZAR MEU PERFIL →</button></section></div>;
if(!account || needsInvite || authMode==='reset')return <div className="authscreen"><section className="authcard">
  <button className="authback" onClick={()=>setView('welcome')}>← Voltar ao início</button>
  <div className="authmark">✳</div><h1>meu zé<span>.</span></h1>
  <p className="authlead">{!configured?'Vamos ligar seu cantinho à internet.':needsInvite?'Só entra quem é da galera.':authMode==='signup'?'Uma conta só sua, do seu jeito.':authMode==='forgot'?'Recupere sua conta.':authMode==='reset'?'Crie sua nova senha.':'A internet é nossa.'}</p>
  {!configured?<><p>Configure as variáveis de ambiente do Supabase e execute o SQL do projeto.</p><p className="muted">Veja INSTRUCOES-PUBLICAR.md dentro do ZIP.</p></>:
  needsInvite?<><p className="authhint">Conta conectada: <strong>{account?.email}</strong>. Peça o código de convite ao dono do grupo.</p>
    <label>CÓDIGO DE CONVITE<input autoComplete="off" value={inviteCode} placeholder="Código enviado pelo seu amigo" onChange={e=>setInviteCode(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void acceptInvite()}}/></label>
    <button className="authsubmit" disabled={authBusy||!inviteCode.trim()} onClick={acceptInvite}>{authBusy?'Entrando…':'ENTRAR NO GRUPO →'}</button>
    <button className="authswap" onClick={logout}>Sair desta conta</button></>:
  <form onSubmit={e=>{e.preventDefault();void authenticate()}}>
    {authMode!=='reset'&&<label>SEU E-MAIL<input type="email" autoComplete="email" value={email} placeholder="voce@email.com" onChange={e=>setEmail(e.target.value)} required/></label>}
    {authMode!=='forgot'&&<label>{authMode==='reset'?'NOVA SENHA':'SENHA'}<input type="password" minLength={8} autoComplete={authMode==='signup'||authMode==='reset'?'new-password':'current-password'} value={password} placeholder="No mínimo 8 caracteres" onChange={e=>setPassword(e.target.value)} required/></label>}
    <button className="authsubmit" type="submit" disabled={authBusy}>{authBusy?'Carregando…':authMode==='signup'?'CRIAR MINHA CONTA →':authMode==='forgot'?'RECUPERAR SENHA →':authMode==='reset'?'SALVAR NOVA SENHA →':'ENTRAR NO MEU ZÉ →'}</button>
    {authMode!=='reset'&&<div className="authlinks"><button type="button" onClick={()=>setAuthMode(authMode==='signup'?'signin':'signup')}>{authMode==='signup'?'Já tenho uma conta':'Criar uma conta'}</button><button type="button" onClick={()=>setAuthMode(authMode==='forgot'?'signin':'forgot')}>{authMode==='forgot'?'Voltar ao login':'Esqueci a senha'}</button></div>}
  </form>}
  {connection&&!needsInvite&&<p className="authhint">{connection}</p>}
  {toast&&<p className="authnotice" role="status">{toast}</p>}
  <p className="authfoot">Sem algoritmo. Só os seus amigos. ✳</p>
</section></div>;
return <div className={'app pattern-'+shownTheme.pattern} style={css}><aside className="sidebar"><a className="logo" href="/" aria-label="Meu Zé início">meu zé<span>✳</span></a><p className="tagline">a internet é nossa.</p><div className="groupbadge"><Lock size={12}/> nosso círculo privado</div><nav>{nav.map(([id,Icon,label])=><button key={id} className={view===id?'active':''} onClick={()=>{setView(id);setScene('geral')}}><Icon size={21}/>{label}{id==='feed'&&<span>✦</span>}</button>)}</nav><button className="primary newpost" onClick={()=>setModal('post')}><Plus size={19}/> Solta um Zé</button><div className="sidebottom"><button className="signout" onClick={logout}>Sair da conta ↗</button><div className="doodle">✳<span>gente de verdade.<br/>gosto duvidoso.<br/>amizade boa.</span></div><button className="person" onClick={()=>openProfile(data.me)}>{avatar(mine)}<span><strong>{mine?.name||'Meu perfil'}</strong><small>seu pequeno universo ↗</small></span></button></div></aside>
<div className="mainwrap" onPointerDown={unlockChatAudio} onKeyDown={unlockChatAudio} onTouchStart={onFeedTouchStart} onTouchMove={onFeedTouchMove} onTouchEnd={onFeedTouchEnd} onTouchCancel={resetPull}>
{view==='feed'&&(pullDistance>8||pullRefreshing)&&<div className={'ze-feed-pull'+(pullRefreshing?' ze-feed-pull-loading':'')} role="status" aria-live="polite"><RefreshCw size={17}/><span>{pullRefreshing?'Atualizando o feed…':pullDistance>=64?'Solte para atualizar':'Puxe para atualizar'}</span></div>}<header className="topbar"><span className="mobilelogo">meu zé ✳</span><span className="desktoplabel">UM CANTINHO SÓ NOSSO</span><div><button type="button" title="Configurar notificações" aria-label="Configurar notificações" aria-expanded={globalSoundPanel} onClick={()=>setGlobalSoundPanel(v=>!v)}><Bell size={20}/></button><button className="toplogout" onClick={logout} title="Sair da conta">Sair</button><button aria-label="Buscar" onClick={()=>document.getElementById('search')?.focus()}><Search size={20}/></button><button aria-label="Personalizar" onClick={customize}><Palette size={21}/></button><button onClick={()=>openProfile(data.me)}>{avatar(mine)}</button></div></header><div className="columns"><main>
{connection&&<div className="notice">{connection} {!data.me&&<button onClick={()=>setView('login')}>Entrar ↗</button>}<button onClick={refresh}>Tentar novamente</button></div>}
{view==='chat'?<RetroChat me={data.me} mine={mine} profiles={allProfiles} messages={messages} chatReady={chatReady} chatTo={chatTo} setChatTo={setChatTo} chatText={chatText} setChatText={setChatText} sendChat={sendChat} avatar={avatar} act={act} uploadMedia={uploadMedia} openProfile={openProfile} notify={notify}/>:view==='profile'?<><button className="back" onClick={()=>setView('feed')}><ArrowLeft size={17}/> voltar para a galera</button><section className="profilecard"><div className="cover" style={safeImage(shownTheme.cover)?{backgroundImage:'url('+safeImage(shownTheme.cover)+')'}:{}}><span>{shownTheme.sticker}</span></div><div className="profileinfo">{avatar(owner,true)}{profileId!==data.me&&<button className="outline editprofile" onClick={()=>openChat(profileId)}><MessageCircle size={15}/> Enviar mensagem</button>}{profileId===data.me&&<button className="outline editprofile" onClick={customize}><SlidersHorizontal size={15}/> Personalizar</button>}<h1>{owner?.name||'Seu nome aqui'}</h1><p>{owner?.bio||'Tudo que você gosta, do seu jeito.'}</p><small>{list.length} publicações · {profileId===data.me?'seu universo':'você está vendo o tema deste perfil'}</small></div>{shownTheme.song&&/^https:\/\//.test(shownTheme.song)&&<ProfilePlayer key={profileId+'-'+shownTheme.song} src={shownTheme.song} title={shownTheme.songName}/>} <div className="favorites"><small>PEQUENAS OBSESSÕES</small>{shownTheme.favorites.split('\n').filter(Boolean).map((f,i)=><span key={i}>{f}</span>)}</div></section><h3 className="sectiontitle">PUBLICAÇÕES <span>FAVORITOS ★</span></h3></>:view==='friends'?<><div className="heading"><small>BOA COMPANHIA</small><h1>A nossa galera<span>☺</span></h1><p>Cada pessoa, um pequeno universo.</p></div><div className="notice"><Lock size={16}/> O grupo permanece privado. Para liberar amigos, é preciso adicionar os e-mails deles ao acesso do site.</div><div className="friendgrid">{allProfiles.map(p=><button className="friendcard" key={p.id} onClick={()=>openProfile(p.id)} style={{background:parse(p).bg,color:parse(p).ink}}><div className="friendart">{parse(p).sticker}</div>{avatar(p,true)}<h2>{p.name}</h2><p>{p.bio}</p><span>visitar esse universo ↗</span></button>)}</div>{!allProfiles.length&&<div className="empty">A galera começa com você. <button onClick={customize}>Criar meu perfil</button></div>}</>:view==='scenes'?<><div className="heading"><small>AS NOSSAS CONVERSAS</small><h1>Nossos cantos<span>✧</span></h1><p>Um lugar pra cada obsessão coletiva.</p></div><div className="scenegrid">{scenes.map(([id,icon,label])=><button key={id} onClick={()=>{setScene(id);setView('feed')}}><span>{icon}</span><h2>{label}</h2><small>{allPosts.filter(p=>id==='geral'||p.scene===id).length} publicações</small><ArrowUpRight/></button>)}</div></>:<><section className="welcome"><div><span className="eyebrow">MENOS ALGORITMO. MAIS AMIGO.</span><h1>{view==='saved'?'Coisas que ficaram.':'E aí, meu zé.'}</h1><p>{view==='saved'?'Tudo que você curtiu, guardadinho aqui.':'O que tá fazendo a sua cabeça hoje?'}</p></div><span className="sunflower">✳<i>☺</i></span></section>{view==='feed'&&<><button className="composer" onClick={()=>setModal('post')}>{avatar(mine)}<span>Um pensamento, um achado, qualquer coisa...</span><span className="composeplus"><Plus size={22}/></span></button><div className="filterrow">{scenes.map(([id,icon,label])=><button key={id} className={scene===id?'selected':''} onClick={()=>setScene(id)}>{icon} {label}</button>)}</div><div className="feedtitle"><h3>{scene==='geral'?'Fresco da galera':scenes.find(s=>s[0]===scene)?.[2]}</h3><span>ordem cronológica ↓</span></div></>}</>}
{!['friends','scenes','chat'].includes(view)&&<><div className="searchbox"><Search size={16}/><input id="search" placeholder="Procurar um achado ou uma pessoa" value={search} onChange={e=>setSearch(e.target.value)}/></div>{demo&&<div className="demobar">Modo inspiração · perfis e posts fictícios <button onClick={()=>setDemo(false)}>sair ×</button></div>}<div className={shownTheme.layout==='grid'&&view==='profile'?'postsgrid':''}>{list.map(postCard)}</div>{!list.length&&<div className="empty"><span>✳</span><h2>{loaded?'Toda boa história começa com um oi.':'Chegando no nosso cantinho…'}</h2><p>{search?'Nenhum achado por aqui. Tente outra busca.':'O círculo está começando. Seja o primeiro a compartilhar alguma coisa.'}</p><button className="primary" onClick={()=>setModal('post')}>Fazer a primeira publicação</button><button className="textbutton" onClick={()=>{setDemo(true);setView('feed')}}>Ver como fica com a galera ↗</button></div>}</>}
</main><aside className="rightbar"><section className="manifesto"><span className="tiny">BEM-VINDO AO NOSSO LADO DA INTERNET</span><h2>Seu gosto.<br/>Sua galera.<br/><em>Seu zé.</em></h2><p>Sem plateia. Sem personagem.<br/>Só as coisas que a gente gosta.</p><span className="star">✷</span></section><section className="rightsection"><div className="row"><h3>Universos da galera</h3><button onClick={()=>setView('friends')}><ArrowUpRight size={18}/></button></div>{allProfiles.slice(0,4).map(p=><button className="person friendrow" key={p.id} onClick={()=>openProfile(p.id)}>{avatar(p)}<span><strong>{p.name}</strong><small>{p.bio.slice(0,33)}</small></span><span>↗</span></button>)}{!allProfiles.length&&<p>O primeiro universo pode ser o seu.</p>}<button className="outline full" onClick={customize}><Palette size={16}/> Deixar com a minha cara</button></section><section className="question"><small>PUXA UMA CADEIRA</small><h3>Que música você queria ouvir pela primeira vez de novo?</h3><button onClick={()=>{setTitle('Uma música pra ouvir de novo');setScene('musica');setEmoji('🎧');setModal('post')}}>Conta pra gente <ArrowUpRight size={16}/></button></section><p className="footnote">feito de gente, não de algoritmo.<br/>meu zé © 2026 <span>✳</span></p></aside></div></div>
<nav className="mobilenav"><button onClick={()=>setView('feed')} aria-label="Início"><Home/></button><button onClick={()=>{setView('feed');setTimeout(()=>document.getElementById('search')?.focus(),50)}} aria-label="Buscar"><Search/></button><button className="mobileadd" onClick={()=>setModal('post')} aria-label="Publicar"><Plus/></button><button onClick={()=>openChat(null)} aria-label="Chat"><MessageCircle/></button><button onClick={()=>openProfile(data.me)} aria-label="Perfil">{avatar(mine)}</button></nav>
{cropTarget&&<MediaCropper file={cropTarget.file} kind={cropTarget.kind} onCancel={()=>setCropTarget(null)} onConfirm={confirmCrop}/>}
{modal&&uploadBusy&&<div className="zeupload-status" role="status"><strong>✳ Enviando mídia… {uploadProgress}%</strong><progress value={uploadProgress} max={100}/><small>Não feche a página até terminar.</small></div>}
{modal&&<div className="overlay" onClick={()=>setModal('')}><section className={'modal '+(modal==='customize'?'editor':'')} role="dialog" aria-modal="true" aria-label={modal==='customize'?'Personalizar perfil':'Conversa'} onClick={e=>e.stopPropagation()}><div className="modalhead"><h2>{modal==='customize'?'Seu universo, suas regras.':modal==='post'?'Solta um Zé.':'Puxa uma conversa.'}</h2><button aria-label="Fechar" onClick={()=>setModal('')}><X/></button></div>
{modal==='customize'?<><p className="muted">A prévia muda ao vivo. Quem visitar seu perfil vai ver exatamente o seu tema.</p><div className="editorpreview" style={{background:draft.card,color:draft.ink,borderRadius:draft.radius}}><span style={{color:draft.accent,fontSize:45}}>{draft.sticker}</span><div><h2>{name}</h2><p>{bio}</p></div></div><h3>Comece por um clima</h3><div className="presets">{themes.map(([n,b,i,a,c])=><button key={n} onClick={()=>setDraft({...draft,bg:b,ink:i,accent:a,card:c})} style={{background:b,color:i}}><span style={{background:a}}>✳</span>{n}</button>)}</div><div className="formgrid"><label>Seu nome<input maxLength={40} value={name} onChange={e=>setName(e.target.value)}/></label><label>Seu símbolo<input maxLength={8} value={draft.sticker} onChange={e=>setDraft({...draft,sticker:e.target.value})}/></label></div><label>Bio<textarea maxLength={300} value={bio} onChange={e=>setBio(e.target.value)}/></label><label>Imagem ou GIF de fundo<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={async e=>{const f=e.target.files?.[0];if(f){const url=await uploadMedia(f,'image');if(url)setDraft(d=>({...d,wallpaper:url}))}}}/><button className="textbutton" onClick={()=>setDraft(d=>({...d,wallpaper:''}))}>Remover fundo</button></label><h3>Cores sem limites</h3><div className="colorgrid">{([['bg','Fundo'],['ink','Texto'],['accent','Destaque'],['card','Cartões']] as const).map(([k,n])=><label key={k}><input type="color" value={draft[k]} onChange={e=>setDraft({...draft,[k]:e.target.value})}/>{n}</label>)}</div><div className="formgrid"><label>Tipografia<select value={draft.font} onChange={e=>setDraft({...draft,font:e.target.value})}><option value="sans">Sem serifa</option><option value="serif">Editorial</option><option value="mono">Máquina de escrever</option></select></label><label>Textura<select value={draft.pattern} onChange={e=>setDraft({...draft,pattern:e.target.value})}><option value="dots">Pontinhos</option><option value="grid">Quadriculado</option><option value="plain">Liso</option></select></label><label>Formato<select value={draft.layout} onChange={e=>setDraft({...draft,layout:e.target.value})}><option value="list">Lista</option><option value="grid">Mosaico</option></select></label><label>Cantos: {draft.radius}px<input type="range" min="0" max="36" value={draft.radius} onChange={e=>setDraft({...draft,radius:Number(e.target.value)})}/></label></div><div className="formgrid"><label>Foto do perfil · ajustar enquadramento<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)setCropTarget({file:f,kind:'avatar'})}}/>{safeImage(draft.avatar)&&<img className="zeprofile-mini-avatar" src={draft.avatar} alt="Prévia da foto de perfil"/>}<button type="button" className="textbutton" onClick={()=>setDraft(d=>({...d,avatar:''}))}>Remover foto</button></label><label>Banner · ajustar enquadramento<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)setCropTarget({file:f,kind:'cover'})}}/>{safeImage(draft.cover)&&<img className="zeprofile-mini-banner" src={draft.cover} alt="Prévia do banner"/>}<button type="button" className="textbutton" onClick={()=>setDraft(d=>({...d,cover:''}))}>Remover capa</button></label></div><label>Pequenas obsessões · uma por linha<textarea value={draft.favorites} maxLength={500} onChange={e=>setDraft({...draft,favorites:e.target.value})}/></label><div className="formgrid"><label>Nome da música<input value={draft.songName} maxLength={100} onChange={e=>setDraft({...draft,songName:e.target.value})}/></label><label>Link da música (HTTPS)<input placeholder="https://open.spotify.com/…" value={draft.song} maxLength={500} onChange={e=>setDraft({...draft,song:e.target.value})}/></label></div><label>Ou enviar sua música (MP3, M4A, OGG)<input type="file" accept="audio/mpeg,audio/mp4,audio/ogg" onChange={async e=>{const f=e.target.files?.[0];if(f){const url=await uploadMedia(f,'audio');if(url)setDraft(d=>({...d,song:url,songName:f.name}))}}}/></label><p className="muted">Música hospedada no Meu Zé toca pelo player do perfil. O navegador pode exigir um toque para iniciar.</p><button className="primary full" disabled={busy||uploadBusy} onClick={async()=>{if(await act({action:'profile',name,bio,theme:draft})){setModal('');openProfile(data.me);notify('Seu universo está salvo ✳')}}}><Check size={18}/>{busy?'Salvando…':'Salvar meu universo'}</button></>:modal==='post'?<><div className="formgrid"><label>Emoji<input maxLength={12} value={emoji} onChange={e=>setEmoji(e.target.value)}/></label><label>Qual canto?<select value={scene} onChange={e=>setScene(e.target.value)}>{scenes.map(([id,,n])=><option key={id} value={id}>{n}</option>)}</select></label></div><label>Título (se quiser)<input maxLength={100} placeholder="Uma coisa que vale compartilhar" value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Conta aí<textarea rows={6} maxLength={2000} value={body} placeholder="Pode ser um achado, um desabafo ou aquela piada interna." onChange={e=>setBody(e.target.value)}/></label><small>{body.length}/2000</small><label className="upload"><ImageIcon size={18}/> Adicionar foto<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={async e=>{const f=e.target.files?.[0];e.target.value='';if(f){const url=await uploadMedia(f,'image');if(url)setPostMedia(old=>[...old,{url,type:'image'}])}}}/></label><label className="upload"><ImageIcon size={18}/><Video size={18}/> Adicionar fotos e vídeos<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={async e=>{const files=Array.from(e.target.files||[]);for(const f of files){const kind=f.type.startsWith('video/')?'video':'image';const url=await uploadMedia(f,kind);if(url)setPostMedia(old=>[...old,{url,type:kind}])}e.target.value=''}}/></label><div className="zemediapreview">{postMedia.map((m,i)=><div key={i}>{m.type==='video'?<video src={m.url} controls/>:<img src={m.url} alt="Prévia"/>}<button onClick={()=>setPostMedia(old=>old.filter((_,j)=>i!==j))}>Remover ×</button></div>)}</div><button className="primary full" disabled={busy||uploadBusy||(!body.trim()&&!postMedia.length)} onClick={async()=>{if(await act({action:'post',title,body:body.trim()||'📷',emoji,scene,image:'',media:postMedia})){setModal('');setBody('');setTitle('');setPostMedia([]);setView('feed');notify('Zé publicado!')}}}>{busy?'Publicando…':'Publicar pra galera'}<ArrowUpRight size={18}/></button></>:<><div className="replies">{data.comments.filter(c=>c.post===commentId).map(c=><div key={c.id}><strong>{allProfiles.find(p=>p.id===c.author)?.name||'Zé'}</strong><p>{c.body}</p></div>)}{!data.comments.some(c=>c.post===commentId)&&<p>A conversa começa com você.</p>}</div><textarea maxLength={1000} value={reply} onChange={e=>setReply(e.target.value)} placeholder="Manda a sua resposta…"/><button className="primary full" disabled={busy||!reply.trim()} onClick={async()=>{if(commentId.startsWith('demo'))return notify('Esse post é só um exemplo.');if(await act({action:'comment',id:commentId,body:reply}))setReply('')}}>Responder</button></>}
</section></div>}{globalSoundPanel&&<div className="ze-global-sounds"><ChatSoundSettings prefs={notificationPrefs} thread="general" chatName="Grupo da galera" initialScope="global" onChange={updateNotificationPrefs} onClose={()=>setGlobalSoundPanel(false)} uploadMedia={uploadMedia} notify={notify}/></div>}
{incomingNotice&&<button type="button" className="ze-incoming-notice" onClick={()=>{setChatTo(incomingNotice.thread==='general'?null:incomingNotice.thread);setView('chat');setIncomingNotice(null)}} aria-label={'Abrir conversa: '+incomingNotice.title}><span className="ze-incoming-symbol">✉</span><span><strong>{incomingNotice.title}</strong><small>{incomingNotice.preview}</small></span><ArrowUpRight size={17}/></button>}
{toast&&<div className="toast" role="status">{toast}</div>}</div>}

