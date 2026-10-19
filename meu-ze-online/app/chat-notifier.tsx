'use client';
import {useEffect,useRef,useState} from 'react';
import {Bell,MessageCircle,X} from 'lucide-react';
import {getSupabase} from '../lib/supabase';
import {playNotificationSound,readNotificationPreferences,threadId} from './chat-notifications';
import {unlockChatAudio} from './chat-sounds';
import {nativePushAvailable,registerNativeToken,syncNativeSettings} from './native-push';
import './chat-notifier.css';

type Message={id:string;sender:string;recipient:string|null;body:string};
type Notice={sender:string;thread:string;name:string};
export default function ChatNotifier(){
  const [notice,setNotice]=useState<Notice|null>(null);
  const userRef=useRef('');
  const seenRef=useRef<Set<string>|null>(null);
  const busyRef=useRef(false);
  useEffect(()=>{
    const sb=getSupabase();
    if(!sb)return;
    let active=true;
    async function sync(){
      if(!active||!nativePushAvailable())return;
      const {data:{session}}=await sb!.auth.getSession();
      if(!active||!session)return;
      syncNativeSettings(session.user.id,readNotificationPreferences(session.user.id));
      window.MeuZeAndroid?.refreshToken();
    }
    async function onToken(event:Event){
      if(!active)return;
      const token=(event as CustomEvent<string>).detail;
      const {data:{session}}=await sb!.auth.getSession();
      if(active&&session&&typeof token==='string')await registerNativeToken(session.user.id,token);
    }
    const onPrefs=()=>{void sync()};
    window.addEventListener('meuze-native-push-token',onToken);
    window.addEventListener('meuze-notification-settings-changed',onPrefs);
    const {data:{subscription}}=sb.auth.onAuthStateChange(()=>queueMicrotask(()=>void sync()));
    void sync();
    return()=>{active=false;subscription.unsubscribe();window.removeEventListener('meuze-native-push-token',onToken);window.removeEventListener('meuze-notification-settings-changed',onPrefs)};
  },[]);
  useEffect(()=>{
    let active=true;
    const sb=getSupabase();
    if(!sb)return;
    async function poll(){
      if(busyRef.current)return;
      busyRef.current=true;
      try{
        const {data:{session}}=await sb!.auth.getSession();
        const me=session?.user.id||'';
        if(me!==userRef.current){userRef.current=me;seenRef.current=null;setNotice(null)}
        if(!me)return;
        const {data,error}=await sb!.from('chat_messages').select('id,sender,recipient,body').order('created_at',{ascending:false}).limit(300);
        if(error||!active)return;
        const rows=(data||[]) as Message[];
        if(seenRef.current===null){seenRef.current=new Set(rows.map(m=>m.id));return}
        const seen=seenRef.current;
        const prefs=readNotificationPreferences(me);
        let newest:Message|null=null;
        for(const m of rows){
          if(seen.has(m.id))continue;
          seen.add(m.id);
          if(m.sender===me)continue;
          if(!newest)newest=m;
        }
        if(seen.size>650){seen.clear();for(const m of rows)seen.add(m.id)}
        if(!newest)return;
        const thread=threadId(newest.sender,newest.recipient,me);
        playNotificationSound(prefs,thread);
        const {data:profile}=await sb!.from('profiles').select('name').eq('id',newest.sender).maybeSingle();
        if(active)setNotice({sender:newest.sender,thread,name:profile?.name||'Um amigo'});
      }catch{/* Network interruptions must not affect the site. */}
      finally{busyRef.current=false}
    }
    const unlock=()=>unlockChatAudio();
    document.addEventListener('pointerdown',unlock,{passive:true});
    document.addEventListener('keydown',unlock);
    void poll();
    const timer=window.setInterval(()=>void poll(),5000);
    return()=>{active=false;window.clearInterval(timer);document.removeEventListener('pointerdown',unlock);document.removeEventListener('keydown',unlock)};
  },[]);
  useEffect(()=>{
    if(!notice)return;
    const timer=window.setTimeout(()=>setNotice(null),6500);
    return()=>window.clearTimeout(timer);
  },[notice]);
  function openNotice(){
    if(!notice)return;
    const thread=notice.thread;
    setNotice(null);
    const nav=Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar nav button')).find(b=>b.textContent?.includes('Chat'));
    nav?.click();
    window.setTimeout(()=>window.dispatchEvent(new CustomEvent('meuze-open-chat',{detail:thread})),100);
  }
  if(!notice)return null;
  return <div className="zenotice" role="status">
    <button type="button" className="zenotice-open" onClick={openNotice}>
      <span className="zenotice-bell"><Bell size={19}/></span>
      <span><strong>{notice.thread==='general'?'Nova mensagem no grupo':notice.name+' enviou mensagem'}</strong><small><MessageCircle size={12}/> Abrir conversa ↗</small></span>
    </button>
    <button type="button" className="zenotice-close" aria-label="Dispensar notificação" onClick={()=>setNotice(null)}><X size={15}/></button>
  </div>;
}
