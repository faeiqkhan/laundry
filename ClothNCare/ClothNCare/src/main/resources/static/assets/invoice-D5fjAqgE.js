import{n as e}from"./invoices-Bml3sSLW.js";var t=window.location.port===`5173`?`${window.location.protocol}//${window.location.hostname}:8080`:``,n=e=>e?`${t}${e}`:``,r=async e=>{let t=localStorage.getItem(`token`),n=t?{Authorization:`Bearer ${t}`}:void 0,r=await fetch(e,{headers:n});if(!r.ok)throw Error(`Failed to download invoice file`);return r.blob()},i=async e=>{let t=n(e);if(!t){alert(`Invoice not available`);return}try{let n=await r(t),i=URL.createObjectURL(n),a=e?.split(`/`).pop()??`invoice.pdf`,o=document.createElement(`a`);o.href=i,o.download=a,document.body.appendChild(o),o.click(),document.body.removeChild(o),URL.revokeObjectURL(i)}catch(e){console.error(e),alert(`Failed to download invoice`)}},a=async e=>{let t=n(e);if(!t){alert(`Invoice not available`);return}try{let e=await r(t),n=URL.createObjectURL(e),i=window.open(n,`_blank`);if(!i){alert(`Unable to open invoice window for printing`);return}i.onload=()=>{i.print()}}catch(e){console.error(e),alert(`Failed to open invoice for printing`)}},o=async t=>{try{return(await e(t)).invoiceUrl}catch(e){return console.error(e),alert(`Failed to generate invoice`),null}},s=e=>{let t=window.open(``,`_blank`,`width=460,height=680`);if(!t){alert(`Unable to open print window`);return}let n=e.invoiceNumber||e.id.slice(0,6),r=e.customerName||e.customerPhone||`-`,i=c(e.expectedDeliveryDate),a=(e.items&&e.items.length>0?e.items.map((t,n)=>({service:t.serviceType,garment:t.productType,count:`${n+1} / ${e.items.length}`})):[{service:`Dry Cleaning`,garment:`Garment`,count:`1 / 1`}]).map(e=>`
        <div class="tag">
          <div class="brand">Cloth &amp; Care</div>
          <div class="service">${l(e.service)}</div>
          <div class="garment">${l(e.garment)}</div>
          <div class="invoice">${l(n)}</div>
          <div class="customer">${l(r)}</div>
          <div class="delivery">${l(i||`Delivery date`)}</div>
          <div class="count">${l(e.count)}</div>
        </div>`).join(``),o=`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Garment Tags - ${e.id}</title>
        <style>
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; background: #ffffff; }
          body { font-family: Arial, Helvetica, sans-serif; color: #000000; }
          .tags { display: flex; flex-direction: column; align-items: stretch; }
          .tag {
            width: 40mm;
            height: 70mm;
            padding: 2mm 2mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-evenly;
            text-align: center;
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-after: always;
            break-after: page;
          }
          .tag:last-child { page-break-after: auto; break-after: auto; }
          .brand { font-size: 15px; font-weight: 800; letter-spacing: 0.4px; white-space: nowrap; }
          .service { font-size: 11px; font-weight: 700; letter-spacing: 0.6px; }
          .garment { font-size: 13px; font-weight: 700; }
          .invoice { font-size: 26px; font-weight: 800; letter-spacing: 0.6px; line-height: 1.05; }
          .customer { font-size: 11px; font-weight: 700; }
          .delivery { font-size: 10px; font-weight: 700; }
          .count { font-size: 12px; font-weight: 800; }
          @page { size: 40mm 70mm; margin: 0; }
        </style>
      </head>
      <body>
        <div class="tags">${a}</div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function(){ window.close(); }, 200);
          };
        <\/script>
      </body>
    </html>
  `;t.document.open(),t.document.write(o),t.document.close()},c=e=>{if(!e)return``;let t=new Date(e);return Number.isNaN(t.getTime())?e:`${[`Sun`,`Mon`,`Tue`,`Wed`,`Thu`,`Fri`,`Sat`][t.getDay()]} ${t.getDate()} ${[`Jan`,`Feb`,`Mar`,`Apr`,`May`,`Jun`,`Jul`,`Aug`,`Sep`,`Oct`,`Nov`,`Dec`][t.getMonth()]} ${t.getFullYear()}`},l=e=>e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`);export{s as i,o as n,a as r,i as t};