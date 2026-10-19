'use client';
import {useState} from 'react';
import {Volume2,X} from 'lucide-react';
import {playNotificationSound,type NotificationPreferences,type NotificationTone,type ConversationTone} from './chat-notifications';
import {unlockChatAudio} from './chat-sounds';
import './chat-sound-settings.css';
type Props={prefs:NotificationPreferences;thread:string;chatName:string;onChange:(p:NotificationPreferences)=>void;onClose:()=>void};
export default function ChatSoundSettings({prefs,thread,chatName,onChange,onClose}:Props){
 const [scope,setScope]=useState<'global'|'chat'>('chat');
 const selected=prefs.chats[thread]?.tone||'default';
 function changeTone(tone:NotificationTone|ConversationTone){
  if(scope==='global')onChange({...prefs,tone:tone as NotificationTone});
  else onChange({...prefs,chats:{...prefs.chats,[thread]:{tone:tone as ConversationTone}}});
 }
 return <div className="zesoundpanel" role="dialog" aria-label="Sons de notificação">
  <header><strong>♫ Sons de notificação</strong><button onClick={onClose} aria-label="Fechar"><X size={17}/></button></header>
  <p>Escolha o som para todos ou só para {chatName}.</p>
  <div className="zesoundtabs">
   <button className={scope==='global'?'active':''} onClick={()=>setScope('global')}>✳ Geral</button>
   <button className={scope==='chat'?'active':''} onClick={()=>setScope('chat')}>✉ Esta conversa</button>
  </div>
  <label className="zesoundcheck"><input type="checkbox" checked={prefs.enabled} onChange={e=>onChange({...prefs,enabled:e.target.checked})}/> Ativar notificações sonoras</label>
  <label className="zesoundfield">Som
   <select value={scope==='global'?prefs.tone:selected} onChange={e=>changeTone(e.target.value as NotificationTone|ConversationTone)}>
    {scope==='chat'&&<option value="default">Usar som geral</option>}
    <option value="fears">Fears to Fathom</option><option value="retro">Retrô eletrônico</option><option value="off">Sem som</option>
   </select>
  </label>
  <label className="zesoundfield">Volume · {prefs.volume}%
   <input type="range" min={0} max={100} step={5} value={prefs.volume} onChange={e=>onChange({...prefs,volume:Number(e.target.value)})}/>
  </label>
  <button className="zesoundpreview" onClick={()=>{unlockChatAudio();playNotificationSound(prefs,thread,true)}}><Volume2 size={15}/> Testar som</button>
  <small>Salvo neste navegador. Funciona enquanto o site estiver aberto.</small>
 </div>;
}
