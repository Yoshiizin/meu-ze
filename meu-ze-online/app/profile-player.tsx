'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {ArrowUpRight,Music2,Pause,Play,Volume2,VolumeX} from 'lucide-react';
import './profile-player.css';

type Props={src:string;title:string};
function fmt(seconds:number){
  if(!Number.isFinite(seconds)||seconds<0)return '0:00';
  const s=Math.floor(seconds);
  return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
}
export default function ProfilePlayer({src,title}:Props){
  const audioRef=useRef<HTMLAudioElement>(null);
  const [playing,setPlaying]=useState(false);
  const [current,setCurrent]=useState(0);
  const [duration,setDuration]=useState(0);
  const [volume,setVolume]=useState(0.85);
  const [muted,setMuted]=useState(false);
  const [error,setError]=useState(false);
  const direct=/\.(mp3|m4a|ogg)(\?|$)/i.test(src);
  useEffect(()=>{setPlaying(false);setCurrent(0);setDuration(0);setError(false)},[src]);
  async function toggle(){
    const audio=audioRef.current;
    if(!audio)return;
    if(!audio.paused){audio.pause();return}
    try{await audio.play();setError(false)}catch{setError(true)}
  }
  function seek(value:number){
    const audio=audioRef.current;
    if(!audio||!Number.isFinite(audio.duration)||audio.duration<=0)return;
    audio.currentTime=Math.max(0,Math.min(audio.duration,value));
    setCurrent(audio.currentTime);
  }
  function changeVolume(value:number){
    const audio=audioRef.current;
    setVolume(value);setMuted(false);
    if(audio){audio.volume=value;audio.muted=false}
  }
  function toggleMute(){
    const audio=audioRef.current;
    setMuted(v=>{if(audio)audio.muted=!v;return !v});
  }
  return <div className={'zeplayer'+(playing?' zeplayer-playing':'')} aria-label="Música do perfil">
    <div className="zeplayer-art" aria-hidden="true"><Music2 size={23} strokeWidth={1.7}/><span>✳</span></div>
    <div className="zeplayer-main">
      <div className="zeplayer-meta"><span className="zeplayer-label"><span className="zeplayer-led"/> NO MEU REPEAT</span><span className="zeplayer-tag">♫ TRILHA DO PERFIL</span></div>
      <div className="zeplayer-name" title={title}>{title||'Minha trilha sonora'}</div>
      {direct?<div className="zeplayer-controls">
        <audio ref={audioRef} src={src} preload="metadata"
          onLoadedMetadata={e=>{const a=e.currentTarget;setDuration(Number.isFinite(a.duration)?a.duration:0);a.volume=volume;a.muted=muted}}
          onDurationChange={e=>setDuration(Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:0)}
          onTimeUpdate={e=>setCurrent(e.currentTarget.currentTime)}
          onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}
          onEnded={()=>{setPlaying(false);setCurrent(0)}}
          onError={()=>{setError(true);setPlaying(false)}}/>
        <button type="button" className="zeplayer-play" onClick={()=>void toggle()} aria-label={playing?'Pausar música':'Tocar música'} title={playing?'Pausar':'Reproduzir'}>{playing?<Pause size={17} fill="currentColor"/>:<Play size={17} fill="currentColor"/>}</button>
        <span className="zeplayer-time">{fmt(current)}</span>
        <input className="zeplayer-seek" type="range" min={0} max={duration||100} step={0.1} value={Math.min(current,duration||100)} onChange={e=>seek(Number(e.target.value))} aria-label="Posição da música" style={{'--zeplayer-progress':(duration?Math.min(100,current/duration*100):0)+'%'} as CSSProperties}/>
        <span className="zeplayer-time">{duration?fmt(duration):'--:--'}</span>
        <button type="button" className="zeplayer-volume-button" onClick={toggleMute} aria-label={muted?'Ativar som':'Silenciar'} title={muted?'Ativar som':'Silenciar'}>{muted||volume===0?<VolumeX size={16}/>:<Volume2 size={16}/>}</button>
        <input className="zeplayer-volume" type="range" min={0} max={1} step={0.05} value={muted?0:volume} onChange={e=>changeVolume(Number(e.target.value))} aria-label="Volume"/>
      </div>:<a className="zeplayer-external" href={src} target="_blank" rel="noopener noreferrer">OUVIR MÚSICA <ArrowUpRight size={16}/></a>}
      {error&&<p className="zeplayer-error" role="status">Não foi possível reproduzir este áudio.</p>}
    </div>
    <div className="zeplayer-eq" aria-hidden="true">{[1,2,3,4,5].map(i=><i key={i}/>)}</div>
  </div>;
}
