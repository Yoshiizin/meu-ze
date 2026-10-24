'use client';
import {playChatCue,unlockChatAudio} from './chat-sounds';

export type NotificationTone='retro'|'custom'|'off';
export type ConversationTone='default'|NotificationTone;
export type ConversationSound={tone:ConversationTone;customUrl?:string};
export type NotificationPreferences={
  enabled:boolean;
  desktop:boolean;
  pushEnabled:boolean;
  tone:NotificationTone;
  volume:number;
  customUrl:string;
  chats:Record<string,ConversationSound>;
};

export const defaultNotificationPreferences:NotificationPreferences={
  enabled:true,desktop:false,pushEnabled:false,tone:'retro',volume:80,customUrl:'',chats:{}
};
const storageKey=(user:string)=>'meuze-notifications-v1-'+user;
const safeAudioUrl=(value:unknown):string=>typeof value==='string'&&/^https:\/\/[^\s<>"']{1,1900}$/.test(value)?value:'';

export function readNotificationPreferences(user:string):NotificationPreferences{
  if(typeof window==='undefined'||!user)return {...defaultNotificationPreferences,chats:{}};
  try{
    const raw=window.localStorage.getItem(storageKey(user));
    if(!raw)return {...defaultNotificationPreferences,chats:{}};
    const parsed=JSON.parse(raw);
    const tones=['retro','custom','off'];
    const chats:Record<string,ConversationSound>={};
    if(parsed.chats&&typeof parsed.chats==='object'){
      for(const [id,item] of Object.entries(parsed.chats)){
        if(id!=='general'&&!/^[0-9a-f-]{36}$/i.test(id))continue;
        const value=item as Record<string,unknown>;
        chats[id]={tone:value?.tone==='fears'?'retro':typeof value?.tone==='string'&&['default',...tones].includes(value.tone)?value.tone as ConversationTone:'default',customUrl:safeAudioUrl(value?.customUrl)};
      }
    }
    return {
      enabled:parsed.enabled!==false,
      desktop:parsed.desktop===true,
      pushEnabled:parsed.pushEnabled===true,
      tone:parsed.tone==='fears'?'retro':tones.includes(parsed.tone)?parsed.tone:'retro',
      volume:Number.isFinite(parsed.volume)?Math.max(0,Math.min(100,parsed.volume)):80,
      customUrl:safeAudioUrl(parsed.customUrl),
      chats
    };
  }catch{return {...defaultNotificationPreferences,chats:{}}}
}

export function saveNotificationPreferences(user:string,prefs:NotificationPreferences){
  if(typeof window==='undefined'||!user)return;
  try{window.localStorage.setItem(storageKey(user),JSON.stringify(prefs));window.MeuZeAndroid?.syncSettings(user,JSON.stringify(prefs));window.dispatchEvent(new CustomEvent('meuze-notification-settings-changed',{detail:user}))}catch{}
}

export function threadId(sender:string,recipient:string|null,me:string):string{
  return recipient===null?'general':sender===me?recipient:sender;
}

export function resolvedSound(prefs:NotificationPreferences,thread:string){
  const override=prefs.chats[thread];
  const tone=override?.tone&&override.tone!=='default'?override.tone:prefs.tone;
  const url=override?.tone==='custom'?override.customUrl||prefs.customUrl:prefs.customUrl;
  return {tone,url};
}

export function playNotificationSound(prefs:NotificationPreferences,thread:string,preview=false){
  if(!preview&&!prefs.enabled)return;
  const {tone,url}=resolvedSound(prefs,thread);
  if(tone==='off'||prefs.volume===0)return;
  const volume=Math.max(0,Math.min(1,prefs.volume/100));
  if(tone==='retro'){
    unlockChatAudio();
    playChatCue('received',volume);
    return;
  }
  // Custom audio is user-supplied; built-in audio is synthesized locally.
  const src=tone==='custom'?safeAudioUrl(url):'';
  if(!src||typeof window==='undefined')return;
  try{
    const audio=new Audio(src);
    audio.volume=volume;
    void audio.play().catch(()=>{/* Browsers may require a user gesture first. */});
  }catch{}
}

export function playSentSound(prefs:NotificationPreferences,thread:string){
  if(!prefs.enabled||resolvedSound(prefs,thread).tone==='off'||prefs.volume===0)return;
  unlockChatAudio();
  playChatCue('sent',Math.max(0,Math.min(1,prefs.volume/100)));
}
