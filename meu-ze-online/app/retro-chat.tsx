'use client';
import {useEffect, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {Check, Palette, Send, X, RotateCcw, Lock, Users, Image as ImageIcon, Video, Smile, Paperclip} from 'lucide-react';
import './retro-chat.css';
import {encodeChatAttachment,parseChatAttachment,uploadChatFile, type ChatAttachment} from './chat-media';

type Profile = {id:string;name:string;bio:string;theme:string};
type Message = {id:string;sender:string;recipient:string|null;body:string;created_at:string};
type ChatTheme = {bg:string;ink:string;accent:string;sent:string;received:string;font:string;pattern:string;wallpaper:string};
type Props = {
  me:string; mine?:Profile; profiles:Profile[]; messages:Message[]; chatReady:boolean;
  chatTo:string|null; setChatTo:(id:string|null)=>void;
  chatText:string; setChatText:(s:string)=>void; sendChat:(payload?:string)=>Promise<boolean>;
  avatar:(p?:Profile,large?:boolean)=>ReactNode;
  act:(action:Record<string,unknown>)=>Promise<boolean>;
  openProfile:(id:string)=>void;
  notify:(message:string)=>void;
  uploadMedia:(file:File,kind:'image'|'video'|'audio')=>Promise<string|null>;
};

const original:ChatTheme = {bg:'#ffffff',ink:'#141414',accent:'#1700b7',sent:'#e9e7ff',received:'#f1f1f1',font:'sans',pattern:'plain',wallpaper:''};
const presets:{name:string;theme:ChatTheme}[] = [
  {name:'Meu Zé original',theme:original},
  {name:'Orkut clássico',theme:{...original,bg:'#dce8f8',ink:'#2f4668',accent:'#517bb1',sent:'#c9ddf5',received:'#ffffff'}},
  {name:'MSN 2005',theme:{...original,bg:'#e5f2fb',ink:'#284867',accent:'#4096c7',sent:'#d0ecfc',received:'#ffffff'}},
  {name:'Windows XP',theme:{...original,bg:'#eae8dc',ink:'#253b60',accent:'#3266af',sent:'#d4e2fa',received:'#fffdf1'}}
];
const fonts:Record<string,string> = {sans:'Arial, sans-serif',serif:'Georgia, serif',mono:'Courier New, monospace'};
function themeOf(profile?:Profile):ChatTheme {
  try {
    const parsed=JSON.parse(profile?.theme||'{}');
    const candidate=parsed && typeof parsed==='object' ? parsed.chat : null;
    if(!candidate || typeof candidate!=='object') return original;
    const theme={...original,...candidate};
    for(const key of ['bg','ink','accent','sent','received'] as const) {
      if(!/^#[0-9a-fA-F]{6}$/.test(theme[key])) theme[key]=original[key];
    }
    if(!['sans','serif','mono'].includes(theme.font)) theme.font='sans';
    if(!['plain','dots','grid'].includes(theme.pattern)) theme.pattern='plain';
    if(typeof theme.wallpaper!=='string'||!/^https:\/\/[^\s<>"']{1,990}$/.test(theme.wallpaper)) theme.wallpaper='';
    return theme;
  } catch {return original}
}
function profileTheme(profile?:Profile):Record<string,unknown> {
  try {const x=JSON.parse(profile?.theme||'{}');return x&&typeof x==='object'?x:{}} catch {return {}}
}
const colorFields:{key:'bg'|'ink'|'accent'|'sent'|'received';label:string}[]=[
  {key:'bg',label:'Fundo'},{key:'ink',label:'Texto'},{key:'accent',label:'Destaque'},
  {key:'sent',label:'Minhas mensagens'},{key:'received',label:'Mensagens recebidas'}
];

export default function RetroChat({me,mine,profiles,messages,chatReady,chatTo,setChatTo,chatText,setChatText,sendChat,avatar,act,uploadMedia,openProfile,notify}:Props){
  const [editing,setEditing]=useState(false);
  const [level,setLevel]=useState(1);
  const [draft,setDraft]=useState<ChatTheme>(original);
  const [saving,setSaving]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [chatUploading,setChatUploading]=useState(false);
  const [chatProgress,setChatProgress]=useState(0);
  const [stickerOpen,setStickerOpen]=useState(false);
  const mediaInputRef=useRef<HTMLInputElement>(null);
  const stickerInputRef=useRef<HTMLInputElement>(null);
  const logRef=useRef<HTMLDivElement>(null);
  const lastChatRef=useRef<string|null>(null);
  const theme=themeOf(mine);
  const selected=profiles.find(p=>p.id===chatTo);
  const stickers=Array.from(new Set(messages.map(m=>parseChatAttachment(m.body)).filter((a):a is ChatAttachment=>Boolean(a&&a.type==='sticker')).map(a=>a.url))).reverse().slice(0,40);
  const filtered=messages.filter(m=>chatTo===null?m.recipient===null:
    (m.sender===me&&m.recipient===chatTo)||(m.sender===chatTo&&m.recipient===me));
  useEffect(()=>{
    const el=logRef.current;
    if(!el)return;
    const changed=lastChatRef.current!==chatTo;
    lastChatRef.current=chatTo;
    const nearBottom=el.scrollHeight-el.scrollTop-el.clientHeight<140;
    if(changed||nearBottom)el.scrollTop=el.scrollHeight;
  },[chatTo,filtered.length,chatReady]);
  const chatStyle={
    '--chat-bg':theme.bg,'--chat-ink':theme.ink,'--chat-accent':theme.accent,
    '--chat-sent':theme.sent,'--chat-received':theme.received,
    '--chat-wallpaper':theme.wallpaper?'url("'+theme.wallpaper+'")':'none',
    fontFamily:fonts[theme.font]||fonts.sans
  } as CSSProperties;
  async function sendAttachment(attachment:ChatAttachment){
    const sent=await sendChat(encodeChatAttachment(attachment));
    if(sent)setStickerOpen(false);
    return sent;
  }
  async function attachFile(file:File|undefined,sticker:boolean){
    if(!file||chatUploading)return;
    if(sticker&&!['image/png','image/webp','image/gif'].includes(file.type)){notify('Figurinhas precisam ser PNG, WEBP ou GIF.');return}
    setChatUploading(true);setChatProgress(0);
    try{
      const url=await uploadChatFile(file,me,setChatProgress);
      await sendAttachment({type:sticker?'sticker':file.type.startsWith('video/')?'video':'image',url});
    }catch(error){notify(error instanceof Error?'Não foi possível enviar: '+error.message:'Não foi possível enviar o arquivo. Confira o limite do Supabase.')}
    finally{setChatUploading(false);setChatProgress(0)}
  }
  function openEditor(){setDraft({...theme});setLevel(1);setEditing(true)}
  async function save(){
    if(saving)return;
    setSaving(true);
    try {
      const ok=await act({action:'profile',name:mine?.name||'Novo Zé',bio:mine?.bio||'',theme:{...profileTheme(mine),chat:draft}});
      if(ok)setEditing(false);
    } finally {setSaving(false)}
  }
  return <>
    <div className="heading"><small>O NOSSO MSN PARTICULAR</small><h1>Chat da galera <span>✉</span></h1><p>Conversa geral ou só entre vocês.</p></div>
    <section className={'zechat zechat-pattern-'+theme.pattern} style={chatStyle} aria-label="Chat do Meu Zé">
      <nav className="zechatpeople" aria-label="Conversas">
        <div className="zechatpeople-title">✳ CONVERSAS</div>
        <button type="button" className={chatTo===null?'selected':''} aria-current={chatTo===null?'page':undefined} onClick={()=>setChatTo(null)}>
          <span className="zechatgeneral"><Users size={18}/></span>
          <span className="zechatpersonname"><strong>Grupo da galera ✳</strong><small>{profiles.length} amigos · todos juntos</small></span>
        </button>
        {profiles.filter(p=>p.id!==me).map(p=><div key={p.id} className={'zechatpersonrow '+(chatTo===p.id?'selected':'')}>
          <button type="button" className="zechatprofilelink" onClick={()=>openProfile(p.id)} title={'Visitar perfil de '+p.name} aria-label={'Visitar perfil de '+p.name}>{avatar(p)}</button>
          <button type="button" className="zechatconversationlink" aria-current={chatTo===p.id?'page':undefined} onClick={()=>setChatTo(p.id)}>
            <span className="zechatpersonname"><strong>{p.name}</strong><small>Mensagem privada</small></span>
          </button>
        </div>)}
      </nav>
      <div className="zechatroom">
        <header className="zechatroomhead">
          <div className="zechatroomtitle">
            {selected?<button type="button" className="zechatprofilelink" onClick={()=>openProfile(selected.id)} title={'Visitar perfil de '+selected.name} aria-label={'Visitar perfil de '+selected.name}>{avatar(selected)}</button>:<span className="zechatgeneral"><Users size={18}/></span>}
            <span>{selected?<button type="button" className="zechatnamelink" onClick={()=>openProfile(selected.id)} title={'Visitar perfil de '+selected.name}>{selected.name}</button>:<strong>Grupo da galera ✳</strong>}<small>{chatTo?<><Lock size={11}/> Conversa particular</>:<><Users size={11}/> {profiles.length} amigos · sala de todo mundo</>}</small></span>
          </div>
          <button type="button" className="zechatsettings" onClick={openEditor} aria-label="Personalizar cores do chat"><Palette size={17}/><span>Cores</span></button>
        </header>
        <div ref={logRef} className="zechatlog" aria-live="off" aria-label="Histórico de mensagens">
          {filtered.map(m=>{
            const author=profiles.find(p=>p.id===m.sender);
            const attachment=parseChatAttachment(m.body);
            return <div key={m.id} className={'zechatbubble '+(m.sender===me?'mine':'received')+(attachment?' zechatbubblemedia':'')}>

              <div className="zechatbubblehead"><button type="button" className="zechatprofilelink" onClick={()=>openProfile(m.sender)} title={'Visitar perfil de '+(author?.name||'Zé')} aria-label={'Visitar perfil de '+(author?.name||'Zé')}>{avatar(author)}</button><button type="button" className="zechatnamelink" onClick={()=>openProfile(m.sender)}>{m.sender===me?'Você':author?.name||'Zé'}</button></div>
              {attachment?<div className="zechatattachment">{attachment.type==='video'?<video src={attachment.url} controls playsInline preload="metadata"/>:<a href={attachment.url} target="_blank" rel="noopener noreferrer" title="Abrir imagem"><img src={attachment.url} alt={attachment.type==='sticker'?'Figurinha de meme':'Foto enviada no chat'} loading="lazy" className={attachment.type==='sticker'?'zechatsticker':''}/></a>}{attachment.caption&&<p>{attachment.caption}</p>}{attachment.type==='sticker'&&<button type="button" className="zechatstickerreuse" onClick={()=>setStickerOpen(true)}>✳ Ver figurinhas</button>}</div>:<p>{m.body}</p>}
              <small>{new Date(m.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small>
            </div>;
          })}
          {!chatReady&&<p className="zechatempty">Conectando à conversa…</p>}
          {chatReady&&filtered.length===0&&<p className="zechatempty">✳ Ainda não tem mensagem aqui. Manda um oi!</p>}
        </div>
        {stickerOpen&&<div className="zechatstickerpanel" aria-label="Figurinhas de memes">
          <div className="zechatstickerpanelhead"><strong>✳ Figurinhas da galera</strong><button type="button" onClick={()=>setStickerOpen(false)} aria-label="Fechar figurinhas"><X size={17}/></button></div>
          <p>Envie sua figurinha em PNG, WEBP ou GIF. As figurinhas enviadas ficam disponíveis aqui para reutilizar.</p>
          <div className="zechatstickergrid">{stickers.map(url=><button type="button" key={url} disabled={chatUploading} onClick={()=>void sendAttachment({type:'sticker',url})} title="Enviar esta figurinha"><img src={url} alt="Figurinha disponível" loading="lazy"/></button>)}
          {!stickers.length&&<span>O álbum está vazio. Seja o primeiro a mandar uma figurinha!</span>}</div>
          <button type="button" className="zechat-addsticker" disabled={chatUploading} onClick={()=>stickerInputRef.current?.click()}><ImageIcon size={15}/> Adicionar figurinha</button>
        </div>}
        {chatUploading&&<div className="zechat-uploadprogress" role="status"><span>Enviando arquivo… {chatProgress}%</span><progress max={100} value={chatProgress}/></div>}
        <form className="zechatinput" onSubmit={e=>{e.preventDefault();void sendChat()}}>
          <input ref={mediaInputRef} type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={e=>{const f=e.target.files?.[0];e.target.value='';void attachFile(f,false)}}/>
          <input ref={stickerInputRef} type="file" hidden accept="image/png,image/webp,image/gif" onChange={e=>{const f=e.target.files?.[0];e.target.value='';void attachFile(f,true)}}/>
          <button type="button" className="zechat-attach" disabled={chatUploading} title="Enviar foto ou vídeo" aria-label="Enviar foto ou vídeo" onClick={()=>mediaInputRef.current?.click()}><Paperclip size={19}/></button>
          <button type="button" className={'zechat-attach '+(stickerOpen?'active':'')} title="Figurinhas de memes" aria-label="Figurinhas de memes" onClick={()=>setStickerOpen(v=>!v)}><Smile size={19}/></button>
          <input aria-label="Escrever mensagem" maxLength={2000} value={chatText} onChange={e=>setChatText(e.target.value)} placeholder={chatTo?'Mensagem privada…':'Fala com a galera…'}/>
          <button type="submit" className="zechat-send" disabled={!chatText.trim()} aria-label="Enviar mensagem"><Send size={18}/></button>
        </form>
      </div>
    </section>
    {editing&&<div className="zechat-overlay" onClick={()=>setEditing(false)}>
      <section className="zechat-editor" role="dialog" aria-modal="true" aria-label="Personalizar chat" onClick={e=>e.stopPropagation()}>
        <header><div><small>MEU ZÉ · PERSONALIZAÇÃO</small><h2>Meu chat, minhas cores ✳</h2></div><button type="button" aria-label="Fechar" onClick={()=>setEditing(false)}><X size={20}/></button></header>
        <p>Um visual Orkut/MSN só para você. Seus amigos continuam vendo as próprias cores.</p>
        <div className="zechatlevels" role="group" aria-label="Nível de personalização">
          {['Temas','Cores','Fundo','Detalhes'].map((label,i)=><button type="button" key={label} className={level===i+1?'active':''} onClick={()=>setLevel(i+1)}>{i+1}. {label}</button>)}
        </div>
        <h3>Escolha um tema</h3>
        <div className="zechatthemes">{presets.map(p=><button type="button" key={p.name} onClick={()=>setDraft({...p.theme})} style={{background:p.theme.bg,color:p.theme.ink,borderColor:p.theme.accent}}>
          <span style={{background:p.theme.accent}}/> {p.name}
        </button>)}</div>
        {level>=2&&<><h3>Escolha suas cores</h3><div className="zechatcolors">{colorFields.map(({key,label})=><label key={key}><input type="color" value={draft[key]} onChange={e=>setDraft(d=>({...d,[key]:e.target.value}))}/>{label}</label>)}</div></>}
        {level>=3&&<><h3><ImageIcon size={16}/> Fundo personalizado</h3><label className="zechatfield">Enviar imagem ou GIF<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setUploading(true);try{const url=await uploadMedia(file,'image');if(url)setDraft(d=>({...d,wallpaper:url}))}finally{setUploading(false);e.target.value=''}}}/></label><label className="zechatfield">Ou colar um link HTTPS<input type="url" maxLength={1000} placeholder="https://site.com/fundo.gif" value={draft.wallpaper} onChange={e=>setDraft(d=>({...d,wallpaper:e.target.value}))}/></label><button type="button" className="zechatlink" onClick={()=>setDraft(d=>({...d,wallpaper:''}))}>Remover imagem</button></>}
        {level>=4&&<div className="zechatoptions"><label>Fonte<select value={draft.font} onChange={e=>setDraft(d=>({...d,font:e.target.value}))}><option value="sans">Clássica</option><option value="serif">Orkut</option><option value="mono">Máquina de escrever</option></select></label><label>Textura<select value={draft.pattern} onChange={e=>setDraft(d=>({...d,pattern:e.target.value}))}><option value="plain">Lisa</option><option value="dots">Pontinhos</option><option value="grid">Quadriculada</option></select></label></div>}
        <div className="zechatpreview" style={{background:draft.bg,color:draft.ink,fontFamily:fonts[draft.font]||fonts.sans}}>
          <strong style={{color:draft.accent}}>✳ Prévia da conversa</strong>
          <div style={{background:draft.received}}>Amigo: E aí, meu zé? :D</div>
          <div style={{background:draft.sent,marginLeft:'auto'}}>Você: Ficou show! ✳</div>
        </div>
        <div className="zechat-editoractions">
          <button type="button" onClick={()=>{setDraft({...original});setLevel(1)}}><RotateCcw size={15}/> Restaurar</button>
          <button type="button" className="zechat-save" disabled={saving||uploading} onClick={()=>void save()}><Check size={17}/>{saving?'Salvando…':'Salvar minhas cores'}</button>
        </div>
      </section>
    </div>}
  </>;
}
