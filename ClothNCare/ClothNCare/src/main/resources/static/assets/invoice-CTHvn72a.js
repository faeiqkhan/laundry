import{t as e}from"./axios-BQWIQ4uc.js";var t=async t=>(await e.post(`/invoice/${t}`)).data.data,n=async t=>(await e.delete(`/invoice/${t}`)).data.data,r=window.location.port===`5173`?`${window.location.protocol}//${window.location.hostname}:8080`:``,i=e=>e?`${r}${e}`:``,a=async e=>{let t=localStorage.getItem(`token`),n=t?{Authorization:`Bearer ${t}`}:void 0,r=await fetch(e,{headers:n});if(!r.ok)throw Error(`Failed to download invoice file`);return r.blob()},o=async e=>{let t=i(e);if(!t){alert(`Invoice not available`);return}try{let n=await a(t),r=URL.createObjectURL(n),i=e?.split(`/`).pop()??`invoice.pdf`,o=document.createElement(`a`);o.href=r,o.download=i,document.body.appendChild(o),o.click(),document.body.removeChild(o),URL.revokeObjectURL(r)}catch(e){console.error(e),alert(`Failed to download invoice`)}},s=async e=>{let t=i(e);if(!t){alert(`Invoice not available`);return}try{let e=await a(t),n=URL.createObjectURL(e),r=window.open(n,`_blank`);if(!r){alert(`Unable to open invoice window for printing`);return}r.onload=()=>{r.print()}}catch(e){console.error(e),alert(`Failed to open invoice for printing`)}},c=async e=>{try{return(await t(e)).invoiceUrl}catch(e){return console.error(e),alert(`Failed to generate invoice`),null}},l=e=>{let t=window.open(``,`_blank`,`width=420,height=640`);if(!t){alert(`Unable to open print window`);return}let n=new Date().toLocaleString(),r=`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Order Tag - ${e.id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 16px; color: #111827; }
          .tag { border: 2px dashed #111827; border-radius: 12px; padding: 16px; }
          .brand { font-size: 18px; font-weight: 800; margin: 0 0 4px 0; letter-spacing: 0.4px; }
          .muted { color: #4b5563; font-size: 12px; margin-bottom: 12px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .label { color: #374151; }
          .value { font-weight: 700; text-align: right; margin-left: 12px; }
          .status { margin-top: 8px; display: inline-block; padding: 4px 10px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-weight: 700; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="tag">
          <p class="brand">ClothNCare</p>
          <p class="muted">Laundry Tag • ${n}</p>
          <div class="row"><span class="label">Order ID</span><span class="value">${e.id}</span></div>
          <div class="row"><span class="label">Customer</span><span class="value">${e.customerName??`-`}</span></div>
          <div class="row"><span class="label">Customer Phone</span><span class="value">${e.customerPhone??`-`}</span></div>
          <div class="row"><span class="label">Created By</span><span class="value">${e.createdByName??`-`}</span></div>
          <div class="row"><span class="label">Delivery Date</span><span class="value">${e.expectedDeliveryDate??`-`}</span></div>
          <div class="row"><span class="label">Total</span><span class="value">₹${e.totalPrice??0}</span></div>
          <span class="status">${e.status}</span>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function(){ window.close(); }, 200);
          };
        <\/script>
      </body>
    </html>
  `;t.document.open(),t.document.write(r),t.document.close()};export{n as a,l as i,c as n,s as r,o as t};