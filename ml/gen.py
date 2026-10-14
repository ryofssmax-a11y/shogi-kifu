# 合成データ生成: 1マス(周囲15%込み)を 32x32 RGB で描画
import numpy as np, random, math, sys, glob, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
KINDS=['P','L','N','S','G','B','R','K','+P','+L','+N','+S','+B','+R']
CLASSES=['empty']+['b'+k for k in KINDS]+['w'+k for k in KINDS]
SUN={'P':'pawn','L':'lance','N':'knight','S':'silver','G':'gold','B':'bishop','R':'rook','K':'king','+P':'prom_pawn','+L':'prom_lance','+N':'prom_knight','+S':'prom_silver','+B':'horse','+R':'dragon'}
CH1={'P':'歩','L':'香','N':'桂','S':'銀','G':'金','B':'角','R':'飛','K':'玉','+P':'と','+L':'杏','+N':'圭','+S':'全','+B':'馬','+R':'龍'}
CH2={'+L':'成香','+N':'成桂','+S':'成銀','+R':'龍王','+B':'龍馬','K':'玉将','G':'金将','S':'銀将','N':'桂馬','L':'香車','B':'角行','R':'飛車','P':'歩兵','+P':'と金'}
FONTS=[f for f in glob.glob('/usr/share/fonts/**/*.[ot]t[fc]',recursive=True) if any(s in f for s in ['NotoSerifCJK-','NotoSansCJK-','BIZUDPMincho','DotGothic'])]
FONTS=[f for f in FONTS if 'Thin' not in f and 'ExtraLight' not in f]
def load_sprites(holdout):
  S={k:[] for k in KINDS}
  for d in glob.glob('shogi-images/docs/*/'):
    name=d.rstrip('/').split('/')[-1]
    if name in('board','css','icons'): continue
    if (name=='hitomoji_wood')!=holdout: continue
    for k in KINDS:
      for f in [d+'black_'+SUN[k]+'.png']+([d+'black_king2.png'] if k=='K' else []):
        if os.path.exists(f): S[k].append(Image.open(f).convert('RGBA'))
  if not holdout:
    order=[['K','R','B','G','S','N','L','P'],['K','+R','+B',None,'+S','+N','+L','+P']]
    for f in ['shogi-piece-images/kaishoa/kaishoa_single.png','shogi-piece-images/kaishoa/kaishoa_double.png']:
      sh=Image.open(f).convert('RGBA')
      for r in range(2):
        for c,k in enumerate(order[r]):
          if k: S[k].append(sh.crop((c*140,r*148,c*140+140,r*148+148)))
  return S
def piece_shape(w,h,color):
  im=Image.new('RGBA',(w,h),(0,0,0,0));d=ImageDraw.Draw(im)
  t=random.uniform(.18,.3)
  d.polygon([(w/2,1),(w*(1-t*.5),h*t),(w-2,h-2),(2,h-2),(w*t*.5,h*t)],fill=color,outline=tuple(int(x*.6) for x in color[:3])+(255,))
  return im
def font_sprite(k,holdout):
  fonts=[f for f in FONTS if ('Sans' in f)==holdout] or FONTS
  f=random.choice(fonts);w,h=100,108
  base=random.choice([(246,226,179),(240,210,150),(250,238,205),(232,200,140)])
  im=piece_shape(w,h,base+(255,));d=ImageDraw.Draw(im)
  red=k.startswith('+') and random.random()<.85
  col=(190,20,30,255) if red else (20,20,20,255)
  two=k in CH2 and random.random()<(.6 if k in('+L','+N','+S') else .2)
  if two:
    fs=int(h*.36);F=ImageFont.truetype(f,fs)
    for i,ch in enumerate(CH2[k]): d.text((w/2,h*.38+i*fs*.98),ch,font=F,fill=col,anchor='mm',stroke_width=random.choice([0,0,1]),stroke_fill=col)
  else:
    ch=CH1[k] if not(k=='K' and random.random()<.5) else '王'
    F=ImageFont.truetype(f,int(h*random.uniform(.42,.66)));d.text((w/2,h*random.uniform(.5,.6)),ch,font=F,fill=col,anchor='mm',stroke_width=random.choice([0,0,1,2]),stroke_fill=col)
  return im
def wood(n):
  base=np.array(random.choice([(226,184,110),(210,160,90),(235,200,135),(200,150,80),(190,170,140),(240,215,160)]),np.float32)
  y=np.arange(n)[:,None];x=np.arange(n)[None,:]
  grain=np.sin((x*random.uniform(.05,.3)+np.sin(y*.05)*random.uniform(2,8)))*random.uniform(3,12)
  if random.random()<.5: grain=grain.T
  a=base[None,None,:]+grain[...,None]+np.random.randn(n,n,1)*3
  return a
def sample(cls,sprites,holdout=False,N=84):
  # N: キャンバス(マス + 周囲 15%)  マス=N/1.3
  cell=N/1.3;m=(N-cell)/2
  img=Image.fromarray(np.clip(wood(N),0,255).astype(np.uint8)).convert('RGBA')
  d=ImageDraw.Draw(img);lc=tuple(int(v) for v in np.random.randint(10,70,3))+(255,);lw=random.choice([1,1,2])
  jx,jy=random.uniform(-.06,.06)*cell,random.uniform(-.06,.06)*cell
  for p in (m+jx,m+cell+jx): d.line([(p,0),(p,N)],fill=lc,width=lw)
  for p in (m+jy,m+cell+jy): d.line([(0,p),(N,p)],fill=lc,width=lw)
  def put(k,gote,cx,cy,sc):
    src=sprites[k]; sp=font_sprite(k,holdout) if (not src or random.random()<.45) else random.choice(src).copy()
    if not src and holdout is None: pass
    hh=cell*sc;ww=hh*sp.width/sp.height*random.uniform(.88,1.1)
    sp=sp.resize((max(4,int(ww)),max(4,int(hh))),Image.BILINEAR)
    sp=sp.rotate(random.uniform(-8,8)+(180 if gote else 0),expand=True,resample=Image.BILINEAR)
    sh=Image.new('RGBA',sp.size,(0,0,0,0));alpha=sp.split()[3].point(lambda v:int(v*random.uniform(.2,.45)))
    sh.putalpha(alpha);sh=sh.filter(ImageFilter.GaussianBlur(2))
    ox,oy=random.randint(-3,4),random.randint(0,4)
    img.alpha_composite(sh,(int(cx-sp.width/2+ox),int(cy-sp.height/2+oy))) if 0<=int(cx-sp.width/2+ox) else None
    img.paste(sp,(int(cx-sp.width/2),int(cy-sp.height/2)),sp)
  # 隣のマスの駒（はみ出し）
  for dx,dy in [(-1,0),(1,0),(0,-1),(0,1)]:
    if random.random()<.35: put(random.choice(KINDS),random.random()<.5,N/2+dx*cell+jx,N/2+dy*cell+jy,random.uniform(.75,.95))
  if cls:
    name=CLASSES[cls];gote=name[0]=='w';k=name[1:]
    put(k,gote,N/2+jx+random.uniform(-.08,.08)*cell,N/2+jy+random.uniform(-.08,.08)*cell,random.uniform(.72,.97))
  img=img.convert('RGB')
  # 射影ゆがみ（軽い）
  if random.random()<.6:
    q=lambda:random.uniform(-.05,.05)*N
    img=img.transform((N,N),Image.QUAD,(q(),q(),q(),N+q(),N+q(),N+q(),N+q(),q()),Image.BILINEAR)
  # 照明・影・色
  a=np.asarray(img).astype(np.float32)
  g=np.linspace(random.uniform(.6,1.15),random.uniform(.6,1.15),N)
  a*= (g[None,:,None] if random.random()<.5 else g[:,None,None])
  if random.random()<.3: # 手の影など
    yy,xx=np.mgrid[0:N,0:N];cx,cy,r=random.uniform(0,N),random.uniform(0,N),random.uniform(N*.3,N)
    a*=1-random.uniform(.2,.5)*(((xx-cx)**2+(yy-cy)**2)<r*r)[...,None]
  a*=np.array([random.uniform(.85,1.12) for _ in range(3)])[None,None,:]  # ホワイトバランス
  a=a*random.uniform(.7,1.3)+random.uniform(-30,30)
  img=Image.fromarray(np.clip(a,0,255).astype(np.uint8))
  if random.random()<.6: img=img.filter(ImageFilter.GaussianBlur(random.uniform(.2,1.4)))
  img=img.resize((32,32),random.choice([Image.BILINEAR,Image.BOX,Image.LANCZOS]))
  a=np.asarray(img).astype(np.float32)+np.random.randn(32,32,3)*random.uniform(0,10)
  if random.random()<.15: a=a.mean(2,keepdims=True).repeat(3,2)
  return np.clip(a,0,255).astype(np.uint8)
def make(n_per,holdout,seed,out):
  random.seed(seed);np.random.seed(seed);sp=load_sprites(holdout)
  X=[];Y=[]
  for c in range(len(CLASSES)):
    for i in range(n_per*(3 if c==0 else 1)):
      X.append(sample(c,sp,holdout));Y.append(c)
  np.savez_compressed(out,X=np.stack(X),Y=np.array(Y,np.int8))
if __name__=='__main__':
  n,h,seed,out=int(sys.argv[1]),sys.argv[2]=='1',int(sys.argv[3]),sys.argv[4];make(n,h,seed,out)
