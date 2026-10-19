'use client';
import {useEffect,useRef,useState} from 'react';
import {Check,Move,RotateCcw,ZoomIn,ZoomOut,X} from 'lucide-react';
import './media-cropper.css';

type Props={
  file:File;
  kind:'avatar'|'cover';
  onCancel:()=>void;
  onConfirm:(file:File)=>Promise<boolean>;
};
const sizes={avatar:{w:800,h:800},cover:{w:1600,h:400}};
function drawCrop(canvas:HTMLCanvasElement,img:HTMLImageElement,zoom:number,x:number,y:number){
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  const w=canvas.width,h=canvas.height;
  const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight)*zoom;
  const dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
  const dx=(w-dw)*(x/100),dy=(h-dh)*(y/100);
  ctx.clearRect(0,0,w,h);
  ctx.drawImage(img,dx,dy,dw,dh);
}
export default function MediaCropper({file,kind,onCancel,onConfirm}:Props){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const dragRef=useRef<{px:number;py:number;x:number;y:number}|null>(null);
  const [img,setImg]=useState<HTMLImageElement|null>(null);
  const [zoom,setZoom]=useState(1);
  const [x,setX]=useState(50);
  const [y,setY]=useState(50);
  const [working,setWorking]=useState(false);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const {w,h}=sizes[kind];
  useEffect(()=>{
    const url=URL.createObjectURL(file);
    const picture=new window.Image();
    let active=true;
    picture.onload=()=>{if(active){setImg(picture);setLoading(false)}};
    picture.onerror=()=>{if(active){setError('Não foi possível abrir esta imagem.');setLoading(false)}};
    picture.src=url;
    return()=>{active=false;URL.revokeObjectURL(url)};
  },[file]);
  useEffect(()=>{
    const canvas=canvasRef.current;
    if(canvas&&img)drawCrop(canvas,img,zoom,x,y);
  },[img,zoom,x,y,kind]);
  function movePointer(clientX:number,clientY:number){
    const drag=dragRef.current;
    const canvas=canvasRef.current;
    if(!drag||!img||!canvas)return;
    const rect=canvas.getBoundingClientRect();
    const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight)*zoom;
    const overflowX=w-img.naturalWidth*scale;
    const overflowY=h-img.naturalHeight*scale;
    if(Math.abs(overflowX)>0.1)setX(Math.max(0,Math.min(100,drag.x+((clientX-drag.px)*w/rect.width)/overflowX*100)));
    if(Math.abs(overflowY)>0.1)setY(Math.max(0,Math.min(100,drag.y+((clientY-drag.py)*h/rect.height)/overflowY*100)));
  }
  async function confirm(){
    if(!img||working)return;
    setWorking(true);setError('');
    try{
      const exportCanvas=document.createElement('canvas');
      exportCanvas.width=w;exportCanvas.height=h;
      drawCrop(exportCanvas,img,zoom,x,y);
      const blob=await new Promise<Blob>((resolve,reject)=>exportCanvas.toBlob(b=>b?resolve(b):reject(Error('Falha ao preparar a imagem.')),'image/webp',0.92));
      const output=new File([blob],(kind==='avatar'?'foto-perfil':'banner')+'.webp',{type:'image/webp'});
      const ok=await onConfirm(output);
      if(!ok)setError('Não foi possível enviar. Confira o armazenamento e tente novamente.');
    }catch(e){setError(e instanceof Error?e.message:'Falha ao preparar a imagem.')}
    finally{setWorking(false)}
  }
  return <div className="zecrop-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!working)onCancel()}}>
    <section className="zecrop-dialog" role="dialog" aria-modal="true" aria-label={'Ajustar '+(kind==='avatar'?'foto de perfil':'banner')}>
      <header className="zecrop-head"><div><small>✳ PERSONALIZE DO SEU JEITO</small><h2>{kind==='avatar'?'Ajustar foto de perfil':'Ajustar banner'}</h2></div><button type="button" onClick={onCancel} disabled={working} aria-label="Fechar"><X size={20}/></button></header>
      <p className="zecrop-description">Arraste a imagem ou use os controles para ajustar. Esta é a parte que vai aparecer no seu perfil.</p>
      <div className={'zecrop-stage '+(kind==='avatar'?'zecrop-stage-avatar':'zecrop-stage-cover')}
        onPointerDown={e=>{if(!img)return;dragRef.current={px:e.clientX,py:e.clientY,x,y};e.currentTarget.setPointerCapture(e.pointerId)}}
        onPointerMove={e=>{if(dragRef.current)movePointer(e.clientX,e.clientY)}}
        onPointerUp={e=>{dragRef.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}}
        onPointerCancel={()=>{dragRef.current=null}}
      >
        {loading?<span>Preparando sua imagem…</span>:<canvas ref={canvasRef} width={w} height={h} aria-label="Prévia do enquadramento"/>}
      </div>
      <div className="zecrop-controls">
        <label><span><ZoomOut size={15}/> Zoom <ZoomIn size={15}/></span><input type="range" min={1} max={3} step={0.02} value={zoom} onChange={e=>setZoom(Number(e.target.value))} aria-label="Aproximar ou afastar"/><strong>{Math.round(zoom*100)}%</strong></label>
        <label><span><Move size={15}/> Horizontal</span><input type="range" min={0} max={100} step={1} value={x} onChange={e=>setX(Number(e.target.value))} aria-label="Posição horizontal"/><strong>{x}%</strong></label>
        <label><span><Move size={15}/> Vertical</span><input type="range" min={0} max={100} step={1} value={y} onChange={e=>setY(Number(e.target.value))} aria-label="Posição vertical"/><strong>{y}%</strong></label>
      </div>
      <div className="zecrop-note">Prévia em proporção {kind==='avatar'?'1:1 (quadrada)':'4:1 (banner)'}. GIFs animados ficam estáticos ao serem recortados.</div>
      {error&&<p className="zecrop-error" role="alert">{error}</p>}
      <footer className="zecrop-actions"><button type="button" className="zecrop-reset" disabled={working} onClick={()=>{setZoom(1);setX(50);setY(50)}}><RotateCcw size={15}/> Centralizar</button><button type="button" className="zecrop-cancel" disabled={working} onClick={onCancel}>Cancelar</button><button type="button" className="zecrop-save" disabled={!img||working} onClick={()=>void confirm()}><Check size={16}/>{working?'Enviando…':'Usar esta imagem'}</button></footer>
    </section>
  </div>;
}
