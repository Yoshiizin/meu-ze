'use client';

/**
 * Original, synthesized retro-horror chat cues. No game audio is bundled.
 * The AudioContext is created only after a user gesture; browser autoplay rules apply.
 */
let context:AudioContext|null=null;

export function unlockChatAudio(){
  if(typeof window==='undefined')return;
  try{
    const AudioContextClass=window.AudioContext;
    if(!AudioContextClass)return;
    if(!context)context=new AudioContextClass();
    if(context.state==='suspended')void context.resume().catch(()=>{});
  }catch{/* Sound is optional; chat must always remain usable. */}
}

function tone(at:number,freq:number,endFreq:number,duration:number,volume:number,wave:OscillatorType='sine'){
  if(!context)return;
  const oscillator=context.createOscillator();
  const gain=context.createGain();
  oscillator.type=wave;
  oscillator.frequency.setValueAtTime(freq,at);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1,endFreq),at+duration);
  gain.gain.setValueAtTime(0.0001,at);
  gain.gain.exponentialRampToValueAtTime(Math.min(0.25,Math.max(0.0002,volume*2.1)),at+0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001,at+duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(at);
  oscillator.stop(at+duration+0.015);
}

export function playChatCue(kind:'sent'|'received'){
  if(!context||context.state!=='running')return;
  try{
    const now=context.currentTime+0.008;
    if(kind==='received'){
      // Soft, eerie two-note incoming-message chime.
      tone(now,740,700,0.18,0.055,'sine');
      tone(now+0.12,554,500,0.32,0.042,'triangle');
      tone(now+0.24,370,330,0.29,0.016,'sine');
    }else{
      // Short, muted confirmation click.
      tone(now,490,350,0.075,0.029,'triangle');
      tone(now+0.065,650,570,0.095,0.018,'sine');
    }
  }catch{/* Never interrupt messages for an audio error. */}
}
