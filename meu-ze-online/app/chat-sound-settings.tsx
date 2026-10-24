'use client';
import {useEffect,useRef,useState} from 'react';
import {nativePushAvailable} from './native-push';
import {Paperclip,Volume2,X} from 'lucide-react';
import {playNotificationSound,type NotificationPreferences,type NotificationTone,type ConversationTone} from './chat-notifications';
import {unlockChatAudio} from './chat-sounds';
import './chat-sound-settings.css';
type Props={prefs:NotificationPreferences;thread:string;chatName:string;initialScope?:'global'|'chat';onChange:(p:NotificationPreferences)=>void;onClose:()=>void;uploadMedia:(file:File,kind:'image'|'video'|'audio')=>Promise<string|null>;notify:(s:string)=>void};
export default function ChatSoundSettings({prefs,thread,chatName,initialScope='chat',onChange,onClose,uploadMedia,notify}:Props){
 const [scope,setScope]=useState<'global'|'chat'>(initialScope);
 const [uploading,setUploading]=useState(false);
 const [nativeAvailable,setNativeAvailable]=useState(false);
 useEffect(()=>setNativeAvailable(nativePushAvailable()),[]);
 const fileRef=useRef<HTMLInputElement>(null);
 const selected=prefs.chats[thread]?.tone||'default';
 function changeTone(tone:NotificationTone|ConversationTone){
  if(scope==='global')onChange({...prefs,tone:tone as NotificationTone});
  else onChange({...prefs,chats:{...prefs.chats,[thread]:{tone:tone as ConversationTone}}});
 }
 async function changeDesktop(checked:boolean){
  if(!checked){onChange({...prefs,desktop:false});return}
  if(typeof window==='undefined'||!('Notification' in window)){notify('Seu navegador não oferece notificações do sistema.');return}
  try{
   const permission=await Notification.requestPermission();
   if(permission==='granted')onChange({...prefs,desktop:true});
   else notify('Permita notificações nas configurações do navegador para ativar os avisos.');
  }catch{notify('Não foi possível ativar as notificações do navegador.')}
 }
 async function uploadSound(file?:File){
  if(!file||uploading)return;
  if(!['audio/mpeg','audio/mp4','audio/ogg'].includes(file.type)){notify('Use MP3, M4A ou OGG.');return}
  setUploading(true);
  try{
   const url=await uploadMedia(file,'audio');
   if(!url)return;
   if(scope==='global')onChange({...prefs,tone:'custom',customUrl:url});
   else onChange({...prefs,chats:{...prefs.chats,[thread]:{tone:'custom',customUrl:url}}});
   notify('Som personalizado salvo! ✳');
  }finally{setUploading(false)}
 }
 return <div className="zesoundpanel" role="dialog" aria-label="Sons de notificação">
  <header><strong>♫ Sons de notificação</strong><button onClick={onClose} aria-label="Fechar"><X size={17}/></button></header>
  <p>Escolha o som para todos ou só para {chatName}.</p>
  <div className="zesoundtabs">
   <button className={scope==='global'?'active':''} onClick={()=>setScope('global')}>✳ Geral</button>
   <button className={scope==='chat'?'active':''} onClick={()=>setScope('chat')}>✉ Esta conversa</button>
  </div>
  <label className="zesoundcheck"><input type="checkbox" checked={prefs.enabled} onChange={e=>onChange({...prefs,enabled:e.target.checked})}/> Ativar notificações sonoras</label>
  <label className="zesoundcheck"><input type="checkbox" checked={prefs.desktop} onChange={e=>{void changeDesktop(e.target.checked)}}/> Avisos do navegador (somente com o site aberto)</label>
  {nativeAvailable&&<label className="zesoundcheck"><input type="checkbox" checked={prefs.pushEnabled} onChange={e=>{
    const enabled=e.target.checked;
    onChange({...prefs,pushEnabled:enabled});
    if(enabled)window.MeuZeAndroid?.requestNotifications();
    else window.MeuZeAndroid?.refreshToken();
  }}/> Pop-ups do Android mesmo com o app em segundo plano</label>}
  <label className="zesoundfield">Som
   <select value={scope==='global'?prefs.tone:selected} onChange={e=>changeTone(e.target.value as NotificationTone|ConversationTone)}>
    {scope==='chat'&&<option value="default">Usar som geral</option>}
    <option value="retro">Retrô eletrônico (original)</option><option value="custom">Meu áudio</option><option value="off">Sem som</option>
   </select>
  </label>
  <label className="zesoundfield">Volume · {prefs.volume}%
   <input type="range" min={0} max={100} step={5} value={prefs.volume} onChange={e=>onChange({...prefs,volume:Number(e.target.value)})}/>
  </label>
  <input ref={fileRef} type="file" hidden accept=".mp3,.m4a,.ogg,audio/mpeg,audio/mp4,audio/ogg" onChange={e=>{const f=e.target.files?.[0];e.target.value='';void uploadSound(f)}}/>
  <div className="zesoundactions">
   <button type="button" disabled={uploading} onClick={()=>fileRef.current?.click()}><Paperclip size={14}/>{uploading?'Enviando…':'Enviar meu som'}</button>
   <button className="zesoundpreview" type="button" onClick={()=>{unlockChatAudio();playNotificationSound(scope==='global'?{...prefs,chats:{}}:prefs,thread,true)}}><Volume2 size={15}/> Testar som</button>
  </div>
  <small>Preferências por conversa salvas neste aparelho. No Android com push ativado, pop-ups e sons também funcionam em segundo plano; o sistema pode limitar avisos em economia de bateria. No navegador, os sons dependem do site aberto.</small>
 </div>;
}
