/* Fieldhand dialogue renderer. Plain script, no imports or dependencies.
   new FieldDialogue(canvas, {metrics, land, lock, skins, onState})
   skins.paper / skins.lifer each contain loaded {body, tail} images.
   say({text, portrait, mouth:[x,y], mirror, name, skin, reducedMotion})
   Mouth coordinates are measured on the original 96x96 sprite. */
(function () {
  'use strict';
  const W = 360, H = 166, body = {x:6,y:21,w:235,h:115};
  function surface() {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    c.getContext('2d').imageSmoothingEnabled = false;
    return c;
  }
  function nine(ctx, im, x, y, w, h) {
    const sx=[0,7,21,28], sy=[0,7,21,28], dx=[x,x+7,x+w-7,x+w], dy=[y,y+7,y+h-7,y+h];
    for(let i=0;i<3;i++) for(let j=0;j<3;j++)
      ctx.drawImage(im,sx[i],sy[j],sx[i+1]-sx[i],sy[j+1]-sy[j],dx[i],dy[j],dx[i+1]-dx[i],dy[j+1]-dy[j]);
  }
  class FieldDialogue {
    constructor(canvas, resources) {
      this.canvas=canvas; this.r=resources; this.metrics=resources.metrics;
      canvas.width=W; canvas.height=H;
      this.ctx=canvas.getContext('2d'); this.ctx.imageSmoothingEnabled=false;
      this.base=surface(); this.fixed=surface();
      this.timer=0; this.done=true; this.active=[]; this.pending=0;
    }
    glyph(c) {return this.metrics.glyphs[c] || this.metrics.glyphs['?'];}
    stamp(ctx,c,state,x,y) {
      const g=this.glyph(c), [w,h]=this.metrics.tile;
      ctx.drawImage(this.r[state],g.x,g.y,w,h,Math.round(x)-4,Math.round(y)-6,w,h);
    }
    measure(s) {return Array.from(s).reduce((w,c)=>w+this.glyph(c).advance,0);}
    layout(text) {
      const max=body.w-30, lines=['']; let line=0, cur=0;
      const next=()=>{lines.push('');line++;cur=0;};
      for(const part of text.replace(/\r\n?/g,'\n').match(/\n|[^\s]+/gu)||[]) {
        if(part==='\n'){next(); continue;}
        const sw=this.measure(' ');
        if(cur && cur+sw+this.measure(part)>max)next();
        else if(cur){lines[line]+=' ';cur+=sw;}
        for(const ch of part) {
          const w=this.glyph(ch).advance;
          if(cur && cur+w>max)next();
          lines[line]+=ch;cur+=w;
        }
      }
      const pages=[];
      for(let i=0;i<lines.length;i+=4)pages.push(lines.slice(i,i+4));
      return pages;
    }
    say(scene) {
      clearTimeout(this.timer); this.scene=scene; this.pages=this.layout(scene.text); this.page=0;
      this.preparePage();
    }
    renderBase() {
      const g=this.base.getContext('2d'), scene=this.scene;
      g.clearRect(0,0,W,H);
      const pic={x:229,y:36,w:127}, mouth=scene.mouth || [50,42];
      const mx=Math.round(pic.x+(scene.mirror?96-mouth[0]:mouth[0])*pic.w/96);
      const my=Math.round(pic.y+mouth[1]*pic.w/96);
      g.save();
      if(scene.mirror){g.translate(pic.x+pic.w,pic.y);g.scale(-1,1);g.drawImage(scene.portrait,0,0,pic.w,pic.w);}
      else g.drawImage(scene.portrait,pic.x,pic.y,pic.w,pic.w);
      g.restore();
      const silhouette=g.getImageData(0,0,W,H).data;
      const skin=this.r.skins[scene.skin||'paper'];
      nine(g,skin.body,body.x,body.y,body.w,body.h);
      const left=body.x+body.w-4;
      const joinY=Math.max(body.y+23,Math.min(my-32,body.y+body.h-24));
      const rayY=x=>Math.round(joinY+8+(my-joinY-8)*(x-left)/Math.max(1,mx-left));
      let tipX=mx-6;
      // Aim at the mouth, stopping just before the portrait silhouette.
      for(let x=left+4;x<tipX;x++){
        if(silhouette[(rayY(x)*W+x)*4+3]>127){tipX=Math.max(left+10,x-3);break;}
      }
      g.drawImage(skin.tail,left,joinY,tipX-left+1,Math.max(13,rayY(tipX)-joinY+1));
      const who=scene.name||'DOT LAU', tagWidth=this.measure(who)+22;
      g.fillStyle='#213b32';g.fillRect(body.x+12,body.y-7,tagWidth,18);
      g.fillStyle='#d8a84b';g.fillRect(body.x+18,body.y-2,3,9);
      // Use the same bitmap letters for the reversed-out nameplate.
      const nameCanvas=document.createElement('canvas');nameCanvas.width=tagWidth;nameCanvas.height=18;
      const ng=nameCanvas.getContext('2d');let nx=0;
      for(const ch of who){this.stamp(ng,ch,'lock',nx,1);nx+=this.glyph(ch).advance;}
      ng.globalCompositeOperation='source-in';ng.fillStyle='#fff9e8';ng.fillRect(0,0,tagWidth,18);
      g.drawImage(nameCanvas,body.x+26,body.y-6);
    }
    preparePage() {
      clearTimeout(this.timer);this.renderBase();
      this.fixed.getContext('2d').clearRect(0,0,W,H);
      this.letters=[];this.active=[];this.pending=0;this.done=false;
      let t=0;
      this.pages[this.page].forEach((line,li)=>{
        let x=body.x+14;
        for(const ch of line){
          if(ch!==' ')this.letters.push({ch,x,y:body.y+20+li*23,t});
          x+=this.glyph(ch).advance;
          t+=ch===' '?14:this.metrics.letterMs;
          if('.,!?…'.includes(ch))t+=ch===','?80:150;
        }
        t+=14;
      });
      this.started=performance.now();
      if(this.scene.reducedMotion) this.finish(); else this.tick();
    }
    paint() {
      const ctx=this.ctx;ctx.clearRect(0,0,W,H);ctx.drawImage(this.base,0,0);ctx.drawImage(this.fixed,0,0);
      for(const a of this.active)this.stamp(ctx,a.ch,'land',a.x,a.y);
    }
    state() {
      return {done:this.done,page:this.page,pages:this.pages.length,fullText:this.pages[this.page].join(' ')};
    }
    tick() {
      const now=performance.now()-this.started, hold=this.metrics.landingMs;
      while(this.pending<this.letters.length && this.letters[this.pending].t<=now)
        this.active.push(this.letters[this.pending++]);
      while(this.active.length && this.active[0].t+hold<=now) {
        const a=this.active.shift();this.stamp(this.fixed.getContext('2d'),a.ch,'lock',a.x,a.y);
      }
      this.paint();
      const next=Math.min(this.letters[this.pending]?.t ?? Infinity,
                          this.active.length?this.active[0].t+hold:Infinity);
      if(Number.isFinite(next)){this.timer=setTimeout(()=>this.tick(),Math.max(1,Math.ceil(next-(performance.now()-this.started))));}
      else this.done=true;
      if(this.done || this.pending<=1)this.r.onState?.(this.state());
    }
    finish() {
      clearTimeout(this.timer);const ctx=this.fixed.getContext('2d');
      ctx.clearRect(0,0,W,H);
      for(const a of this.letters)this.stamp(ctx,a.ch,'lock',a.x,a.y);
      this.pending=this.letters.length;this.active=[];this.done=true;
      this.paint();this.r.onState?.(this.state());
    }
    advance() {
      if(!this.done){this.finish();return true;}
      if(this.page+1<this.pages.length){this.page++;this.preparePage();return true;}
      return false;
    }
    destroy(){clearTimeout(this.timer);}
  }
  window.FieldDialogue=FieldDialogue;
})();
