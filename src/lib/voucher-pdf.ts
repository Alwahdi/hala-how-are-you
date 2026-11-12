import {jsPDF} from 'jspdf';
import fontAsset from '@/assets/voucher-cairo.ttf.asset.json';
import {a4Layout,type VoucherTemplate,type PrintVoucher} from './vouchers';
export async function voucherPdf(t:VoucherTemplate,cards:PrintVoucher[],artwork='',logo=''){
 const {perPage}=a4Layout(t.layout,cards.length);const pdf=new jsPDF({format:'a4',unit:'mm'});const response=await fetch(fontAsset.url);if(!response.ok)throw Error('font_failed');const bytes=new Uint8Array(await response.arrayBuffer());let binary='';for(const v of bytes)binary+=String.fromCharCode(v);pdf.addFileToVFS('Cairo.ttf',btoa(binary));pdf.addFont('Cairo.ttf','Cairo','normal');
 const palette={teal:[0,126,123],blue:[35,88,189],berry:[142,37,76],amber:[163,95,0]} as const;const tone=palette[t.tone];
 cards.forEach((c,index)=>{if(index && index%perPage===0)pdf.addPage();const n=index%perPage;const {width:w,height:h,margin,gap,columns}=t.layout;const x=margin+(n%columns)*(w+gap),y=margin+Math.floor(n/columns)*(h+gap);
 if(!t.dataOnly){pdf.setFillColor(255,255,255);pdf.rect(x,y,w,h,'F');if(artwork)pdf.addImage(artwork,x,y,w,h);else if(t.kind!=='economy'){pdf.setFillColor(tone[0],tone[1],tone[2]);pdf.rect(x+w*.72,y,w*.28,h,'F');if(t.kind==='wave')pdf.ellipse(x+w*.75,y+h*.5,w*.18,h*.7,'F');}pdf.setDrawColor(tone[0],tone[1],tone[2]);pdf.setLineWidth(.25);pdf.roundedRect(x+w*.04,y+h*.34,w*.62,h*.27,2,2,'S');if(logo)pdf.addImage(logo,x+w*.02,y+h*.04,w*.12,h*.22);}
 const values:Record<string,string>={network:t.network,price:c.price,number:c.name,password:c.password?`PIN: ${c.password}`:'',facts:c.facts,contact:t.contact};
 for(const [field,f] of Object.entries(t.fields)){if(!f.visible||!values[field])continue;pdf.setFont('Cairo');const text=pdf.processArabic(values[field]??'');const max=w*(field==='price'?.25:.86);let size=f.size;pdf.setFontSize(size);while(pdf.getTextWidth(text)>max&&size>6){pdf.setFontSize(--size);}const inverse=!t.dataOnly&&!artwork&&t.kind!=='economy'&&f.x>72;pdf.setTextColor(...(inverse?[255,255,255]:[20,25,25]) as [number,number,number]);pdf.text(text,x+w*f.x/100,y+h*f.y/100,{align:'center'});}
 if(t.cuts){pdf.setDrawColor(150);pdf.setLineDashPattern([1,1],0);pdf.rect(x,y,w,h);pdf.setLineDashPattern([],0);}
 });return pdf;
}
