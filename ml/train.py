import numpy as np, torch, torch.nn as nn, glob, json, time, sys
torch.set_num_threads(8);torch.manual_seed(0)
from gen import CLASSES
def load(fs):
  X=[];Y=[]
  for f in fs: d=np.load(f);X.append(d['X']);Y.append(d['Y'])
  return torch.tensor(np.concatenate(X)).permute(0,3,1,2).float()/255.,torch.tensor(np.concatenate(Y)).long()
Xtr,Ytr=load(sorted(glob.glob('tr*.npz')));Xi,Yi=load(['test_in.npz']);Xh,Yh=load(['test_hold.npz'])
import os,zipfile,io
from PIL import Image
if os.environ.get('REAL_ZIP'):  # アプリから書き出した自分の盤のデータで微調整
  z=zipfile.ZipFile(os.environ['REAL_ZIP']);xs=[];ys=[]
  for n in z.namelist():
    if not n.startswith('cells/') or not n.endswith('.png'):continue
    lab=n.split('/')[1];xs.append(np.asarray(Image.open(io.BytesIO(z.read(n))).convert('RGB').resize((32,32),Image.BOX)));ys.append(CLASSES.index(lab))
  Xr=torch.tensor(np.stack(xs)).permute(0,3,1,2).float()/255.;Yr=torch.tensor(ys).long();rep=int(os.environ.get('REAL_REPEAT','20'))
  Xtr=torch.cat([Xtr]+[Xr]*rep);Ytr=torch.cat([Ytr]+[Yr]*rep);print('real cells',len(Xr),'x',rep)
print(Xtr.shape)
def cb(i,o): return [nn.Conv2d(i,o,3,padding=1,bias=False),nn.BatchNorm2d(o),nn.ReLU()]
net=nn.Sequential(*cb(3,16),nn.MaxPool2d(2),*cb(16,32),*cb(32,32),nn.MaxPool2d(2),*cb(32,64),*cb(64,64),nn.MaxPool2d(2),*cb(64,128),nn.AdaptiveAvgPool2d(1),nn.Flatten(),nn.Dropout(.2),nn.Linear(128,29))
print('params',sum(p.numel() for p in net.parameters()))
EP=int(sys.argv[1]) if len(sys.argv)>1 else 14
if os.environ.get('FINETUNE'):net.load_state_dict(torch.load('model.pt'))
opt=torch.optim.AdamW(net.parameters(),2e-3,weight_decay=1e-4);sched=torch.optim.lr_scheduler.OneCycleLR(opt,4e-3,total_steps=EP*(len(Xtr)//256+1))
def aug(x):
  # 追加の軽い拡張: 明るさ・位置ずらし
  x=x*torch.empty(len(x),1,1,1).uniform_(.8,1.2)+torch.empty(len(x),1,1,1).uniform_(-.08,.08)
  s=np.random.randint(-2,3,2);x=torch.roll(x,shifts=(int(s[0]),int(s[1])),dims=(2,3))
  return x.clamp(0,1)
def evaluate(X,Y):
  net.eval();P=[]
  with torch.no_grad():
    for i in range(0,len(X),1024):P.append(net(X[i:i+1024]).argmax(1))
  P=torch.cat(P);return (P==Y).float().mean().item(),P
for ep in range(EP):
  net.train();perm=torch.randperm(len(Xtr));t=time.time();L=0
  for i in range(0,len(Xtr),256):
    idx=perm[i:i+256];x=aug(Xtr[idx]);loss=nn.functional.cross_entropy(net(x),Ytr[idx],label_smoothing=.05)
    opt.zero_grad();loss.backward();opt.step();sched.step();L+=loss.item()
  print(f'ep{ep} loss {L/(len(Xtr)/256):.3f} in {evaluate(Xi,Yi)[0]:.4f} hold {evaluate(Xh,Yh)[0]:.4f} {time.time()-t:.0f}s',flush=True)
torch.save(net.state_dict(),'model.pt')
res={}
for name,X,Y in [('in',Xi,Yi),('hold',Xh,Yh)]:
  acc,P=evaluate(X,Y);res[name]={'acc':acc,'per_class':{CLASSES[c]:round((P[Y==c]==c).float().mean().item(),4) for c in range(29)}}
  cm=np.zeros((29,29),int)
  for y,p in zip(Y.numpy(),P.numpy()):cm[y,p]+=1
  conf=[(CLASSES[i],CLASSES[j],int(cm[i,j])) for i in range(29) for j in range(29) if i!=j and cm[i,j]>=5];conf.sort(key=lambda x:-x[2]);res[name]['top_confusions']=conf[:12]
json.dump(res,open('eval.json','w'),ensure_ascii=False,indent=1)
# ---- 書き出し: BN を畳み込みに統合し int8 量子化 ----
net.eval();layers=[];mods=list(net)
i=0;blob=bytearray();meta=[]
while i<len(mods):
  m=mods[i]
  if isinstance(m,nn.Conv2d):
    bn=mods[i+1];w=m.weight.detach();s=bn.weight/torch.sqrt(bn.running_var+bn.eps);W=w*s[:,None,None,None];B=(bn.bias-bn.running_mean*s).detach()
    W=W.detach();sc=(W.abs().amax(dim=(1,2,3))/127).clamp(min=1e-8);q=torch.round(W/sc[:,None,None,None]).to(torch.int8)
    meta.append({'t':'conv','in':m.in_channels,'out':m.out_channels,'w':len(blob)});blob+=q.numpy().tobytes()
    meta[-1]['s']=len(blob);blob+=sc.numpy().astype('<f4').tobytes();meta[-1]['b']=len(blob);blob+=B.numpy().astype('<f4').tobytes();i+=3;continue
  if isinstance(m,nn.MaxPool2d):meta.append({'t':'pool'})
  if isinstance(m,nn.AdaptiveAvgPool2d):meta.append({'t':'gap'})
  if isinstance(m,nn.Linear):
    W=m.weight.detach();sc=(W.abs().amax(dim=1)/127).clamp(min=1e-8);q=torch.round(W/sc[:,None]).to(torch.int8)
    meta.append({'t':'fc','in':m.in_features,'out':m.out_features,'w':len(blob)});blob+=q.numpy().tobytes();meta[-1]['s']=len(blob);blob+=sc.numpy().astype('<f4').tobytes();meta[-1]['b']=len(blob);blob+=m.bias.detach().numpy().astype('<f4').tobytes()
  i+=1
  while len(blob)%4:blob+=b'\0'
open('piece-model.bin','wb').write(blob);json.dump({'classes':CLASSES,'input':32,'layers':meta},open('piece-model.json','w'))
# 量子化後の参照出力（JS 実装の検証用）
np.save('ref_in.npy',Xi[:64].numpy());np.save('ref_out.npy',net(Xi[:64]).detach().numpy())
print('model bytes',len(blob))
