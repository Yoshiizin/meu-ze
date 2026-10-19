'use client';

export type ChatSound='fears'|'retro'|'custom'|'off';
export type ChatOverride='default'|ChatSound;
export type NotificationPrefs={
  enabled:boolean;
  sound:ChatSound;
  volume:number;
  desktop:boolean;
  customUrl:string;
  chats:Record<string,ChatOverride>;
};
export const defaultNotificationPrefs:NotificationPrefs={
  enabled:true,sound:'fears',volume:0.8,desktop:false,customUrl:'',chats:{}
};
const validSounds=['fears','retro','custom','off'];
export function chatNotificationKey(chatTo:string|null){
  return chatTo===null?'group':'dm:'+chatTo;
}
export function loadNotificationPrefs(userId:string):NotificationPrefs{
  if(!userId||typeof window==='undefined')return defaultNotificationPrefs;
  try{
    const raw=window.localStorage.getItem('meuze-notifications-v1:'+userId);
    if(!raw){
      const old=window.localStorage.getItem('meuze-chat-sounds');
      return {...defaultNotificationPrefs,enabled:old!=='off'};
    }
    const p=JSON.parse(raw) as Partial<NotificationPrefs>;
    const chats:Record<string,ChatOverride>={};
    if(p.chats&&typeof p.chats==='object'){
      for(const [key,value] of Object.entries(p.chats)){
        if((key==='group'||/^dm:[a-zA-Z0-9-]{1,80}$/.test(key))&&(value==='default'||validSounds.includes(value)))chats[key]=value as ChatOverride;
      }
    }
    return {
      enabled:typeof p.enabled==='boolean'?p.enabled:true,
      sound:validSounds.includes(p.sound||'')?p.sound!:defaultNotificationPrefs.sound,
      volume:typeof p.volume==='number'&&Number.isFinite(p.volume)?Math.max(0,Math.min(1,p.volume)):0.8,
      desktop:p.desktop===true,
      customUrl:typeof p.customUrl==='string'&&/^https:\/\//.test(p.customUrl)?p.customUrl:'',
      chats
    };
  }catch{return defaultNotificationPrefs}
}
export function saveNotificationPrefs(userId:string,prefs:NotificationPrefs){
  if(!userId||typeof window==='undefined')return;
  try{window.localStorage.setItem('meuze-notifications-v1:'+userId,JSON.stringify(prefs))}catch{}
}
export function effectiveChatSound(prefs:NotificationPrefs,key:string):ChatSound{
  if(!prefs.enabled)return 'off';
  const choice=prefs.chats[key];
  return choice&&choice!=='default'?choice:prefs.sound;
}
