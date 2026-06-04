import { useState, useEffect, useRef } from "react";

// ── DEFAULT CATEGORIES (user can add/remove) ───────────────────────────────
const DEFAULT_CATEGORIES = {
  "Food & Dining": { emoji:"🍜", color:"#f59e0b" },
  "Public Transport":{ emoji:"🚇", color:"#22d3ee" },
  "PHV / Taxi":    { emoji:"🚕", color:"#38bdf8" },
  "Shopping":      { emoji:"🛍️", color:"#a78bfa" },
  "Groceries":     { emoji:"🛒", color:"#4ade80" },
  "Entertainment": { emoji:"🎬", color:"#f87171" },
  "Healthcare":    { emoji:"💊", color:"#34d399" },
  "Utilities":     { emoji:"💡", color:"#fbbf24" },
  "Others":        { emoji:"📦", color:"#8b95a8" },
  "Annual":        { emoji:"📅", color:"#c084fc" },
  "Business":      { emoji:"💼", color:"#fb923c" },
  "Uncategorised": { emoji:"❓", color:"#8b95a8" },
};

const PALETTE = ["#f59e0b","#22d3ee","#a78bfa","#4ade80","#f87171","#34d399","#fbbf24","#fb923c","#e879f9","#38bdf8","#a3e635","#f472b6"];

const today  = () => new Date().toISOString().split("T")[0];
const fmtSGD = (n) => `S$${(parseFloat(String(n||0).replace(/[^0-9.]/g,""))||0).toFixed(2)}`;

function fmtDate(d) {
  if (!d) return "Unknown";
  try {
    const dt = new Date(d+"T00:00:00"); const now = new Date(); now.setHours(0,0,0,0);
    const diff = Math.round((now-dt)/86400000);
    if (diff===0) return "Today"; if (diff===1) return "Yesterday";
    return dt.toLocaleDateString("en-SG",{weekday:"long",month:"long",day:"numeric"});
  } catch { return d; }
}
function monthLabel(ym) {
  const [y,m]=ym.split("-");
  return new Date(+y,+m-1,1).toLocaleDateString("en-SG",{month:"long",year:"numeric"});
}

// ── UI ATOMS ──────────────────────────────────────────────────────────────────
const IS = {width:"100%",padding:"10px 14px",background:"#2e3340",border:"1px solid #353a47",borderRadius:8,color:"#e8eaf0",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none"};
const SS = {...IS,cursor:"pointer"};
const Inp = (p) => <input style={IS} {...p}/>;
const TA  = (p) => <textarea style={{...IS,resize:"vertical",minHeight:72}} {...p}/>;
const FG  = ({label,children}) => (
  <div style={{marginBottom:14}}>
    <label style={{display:"block",fontSize:10,color:"#8b95a8",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>{label}</label>
    {children}
  </div>
);
const Btn = ({primary,danger,sm,children,style={},disabled,...r}) => (
  <button disabled={disabled} style={{
    display:"flex",alignItems:"center",justifyContent:"center",gap:6,
    width:"100%",padding:sm?"6px 12px":"10px 14px",borderRadius:8,
    cursor:disabled?"default":"pointer",opacity:disabled?0.5:1,
    fontFamily:"'DM Mono',monospace",fontSize:sm?11:12,fontWeight:primary?600:400,
    border:`1px solid ${primary?"#4ade80":danger?"#f87171":"#3a3f4d"}`,
    background:primary?"#4ade80":danger?"rgba(248,113,113,0.1)":"#2e3340",
    color:primary?"#000":danger?"#f87171":"#e8eaf0",...style
  }} {...r}>{children}</button>
);
const Modal = ({title,onClose,children,wide}) => (
  <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
    style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)",padding:20}}>
    <div style={{background:"#252932",border:"1px solid #353a47",borderRadius:16,padding:28,width:"100%",maxWidth:wide?600:460,maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:700,marginBottom:24,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        {title}
        <button onClick={onClose} style={{background:"none",border:"none",color:"#8b95a8",cursor:"pointer",fontSize:22,lineHeight:1}}>×</button>
      </div>
      {children}
    </div>
  </div>
);
const LBar = () => (
  <div style={{height:4,background:"#3a3f4d",borderRadius:2,overflow:"hidden",marginTop:12}}>
    <div style={{height:"100%",background:"linear-gradient(90deg,#22c55e,#06b6d4)",borderRadius:2,animation:"loadAnim 1.5s ease-in-out infinite"}}/>
  </div>
);

// ── TOAST ─────────────────────────────────────────────────────────────────────
function Toast({msg,accent,onDone}) {
  useEffect(()=>{const t=setTimeout(onDone,3500);return()=>clearTimeout(t);},[]);
  return <div style={{position:"fixed",bottom:24,right:24,background:"#252932",border:"1px solid #353a47",borderLeft:`3px solid ${accent||"#4ade80"}`,padding:"12px 18px",borderRadius:10,fontSize:13,zIndex:300,color:"#e8eaf0",animation:"slideIn 0.3s ease",fontFamily:"'DM Mono',monospace",maxWidth:340}}>{msg}</div>;
}

// ── SCAN STATUS STRIP (no button — type "scan" in chat) ──────────────────────
function ScanBar({lastScan,scanState}) {
  const {status,phase,progress,eta} = scanState;
  const fmtTime = iso => {
    if (!iso) return "Never";
    try { return new Date(iso).toLocaleString("en-SG",{timeZone:"Asia/Singapore",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}); }
    catch { return "Never"; }
  };
  const fmtEta = s => !s||s<=0 ? "almost done" : s<60 ? `~${s}s left` : `~${Math.ceil(s/60)}m left`;
  const scanning = status==="scanning";
  const accent = status==="done"?"#4ade80":status==="error"?"#f87171":"#22d3ee";

  return (
    <div style={{background:"#1a1d24",borderBottom:"1px solid #353a47"}}>
      <div style={{padding:"8px 20px",display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:6,height:6,borderRadius:"50%",background:accent,flexShrink:0,animation:scanning?"pulse 1s infinite":"none"}}/>
        <span style={{fontSize:11,color:accent,fontFamily:"'DM Mono',monospace"}}>
          {status==="idle"     && `Last scan: ${fmtTime(lastScan)}`}
          {status==="scanning" && (phase || "Scanning Gmail...")}
          {status==="done"     && "Scan complete"}
          {status==="error"    && "Scan failed"}
        </span>
        {scanning && eta>0 && (
          <span style={{fontSize:10,color:"#8b95a8",fontFamily:"'DM Mono',monospace",marginLeft:4}}>{fmtEta(eta)}</span>
        )}
      </div>
      {scanning && (
        <div style={{padding:"0 20px 8px"}}>
          <div style={{height:2,background:"#2e3340",borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#06b6d4,#22c55e)",borderRadius:2,transition:"width 0.6s ease"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>
            <span style={{fontSize:10,color:"#6b7585",fontFamily:"'DM Mono',monospace"}}>{Math.round(progress)}%</span>
            {phase && <span style={{fontSize:10,color:"#6b7585",fontFamily:"'DM Mono',monospace"}}>{phase}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── RECEIPT DRAWER ────────────────────────────────────────────────────────────
function ReceiptDrawer({expense,categories,onClose,onUpdate,onDelete,onSoftDelete}) {
  const [form,setForm]     = useState({...expense});
  const [editing,setEdit]  = useState(false);
  const [uploading,setUpl] = useState(false);
  const fileRef = useRef();
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const cat = categories[form.category]||categories["Uncategorised"]||{emoji:"📦",color:"#8b95a8"};
  const isPayLah=(form.payment||"").toLowerCase().includes("paylah");
  const isPayNow=(form.payment||"").toLowerCase().includes("paynow");

  const handleImg = async (ev) => {
    const file=ev.target.files[0]; if(!file) return;
    setUpl(true);
    try {
      const base64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
      const dataUrl=`data:${file.type||"image/jpeg"};base64,${base64}`;
      // Ask Claude to verify amount from receipt image
      const resp=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        model:"claude-sonnet-4-20250514",max_tokens:300,
        messages:[{role:"user",content:[
          {type:"image",source:{type:"base64",media_type:file.type||"image/jpeg",data:base64}},
          {type:"text",text:`Receipt for "${form.merchant}" recorded as ${fmtSGD(form.amount)}. Extract: {"confirmedAmount":number,"confirmedMerchant":string,"note":string}. JSON only.`}
        ]}]
      })});
      const data=await resp.json();
      const text=data.content?.find(b=>b.type==="text")?.text||"{}";
      const parsed=JSON.parse(text.replace(/```json|```/g,"").trim());
      const updated={...form,receiptImage:dataUrl};
      if(parsed.confirmedAmount) updated.amount=parsed.confirmedAmount;
      if(parsed.confirmedMerchant) updated.merchant=parsed.confirmedMerchant;
      if(parsed.note) updated.receiptNote=parsed.note;
      setForm(updated); onUpdate(updated);
    } catch{}
    setUpl(false);
  };

  const save = () => { onUpdate({...form,amount:parseFloat(form.amount)||0}); setEdit(false); };

  return (
    <div style={{position:"fixed",inset:0,zIndex:150}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(2px)"}}/>
      <div style={{position:"absolute",top:0,right:0,bottom:0,width:420,background:"#252932",borderLeft:"1px solid #353a47",display:"flex",flexDirection:"column",animation:"drawerIn 0.25s ease",overflowY:"auto"}}>
        {/* Header */}
        <div style={{padding:"20px 24px",borderBottom:"1px solid #353a47",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
          <div style={{minWidth:0}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{form.merchant}</div>
            <div style={{fontSize:11,color:"#8b95a8",marginTop:3}}>{fmtDate(form.date)} · {form.category||"Uncategorised"}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#8b95a8",cursor:"pointer",fontSize:22,flexShrink:0}}>×</button>
        </div>

        <div style={{padding:"20px 24px",flex:1}}>
          {/* Amount */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <div>
              <div style={{fontSize:10,color:"#8b95a8",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Amount</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:32,fontWeight:800,color:cat.color}}>{fmtSGD(form.amount)}</div>
            </div>
            <div style={{fontSize:28}}>{cat.emoji}</div>
          </div>

          {/* Tags */}
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
            {form.payment&&<div style={{fontSize:11,padding:"3px 10px",borderRadius:12,border:"1px solid #353a47",color:isPayLah?"#a78bfa":isPayNow?"#22d3ee":"#8b95a8"}}>{form.payment}</div>}
            <div style={{fontSize:11,padding:"3px 10px",borderRadius:12,border:"1px solid #353a47",color:form.source==="email"?"#22d3ee":form.source==="photo"?"#f59e0b":"#4ade80"}}>
              {form.source==="email"?"📧 auto":form.source==="photo"?"📸 photo":"✍️ manual"}
            </div>
          </div>

          {/* Notes */}
          {form.note && (
            <div style={{background:"#2e3340",borderRadius:8,padding:"10px 14px",marginBottom:20,fontSize:12,color:"#8b95a8",lineHeight:1.6}}>
              📝 {form.note}
            </div>
          )}

          {/* Receipt image */}
          <div style={{marginBottom:20}}>
            <div style={{fontSize:10,color:"#8b95a8",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Receipt</div>
            {form.receiptImage ? (
              <div>
                <img src={form.receiptImage} alt="Receipt" style={{width:"100%",borderRadius:10,border:"1px solid #353a47",maxHeight:300,objectFit:"contain",background:"#1c1f26"}}/>
                {form.receiptNote&&<div style={{fontSize:11,color:"#4ade80",marginTop:6}}>✓ {form.receiptNote}</div>}
                <label style={{display:"block",marginTop:8,cursor:"pointer"}}>
                  <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleImg}/>
                  <div style={{fontSize:11,color:"#8b95a8",textAlign:"center",padding:6,borderRadius:6,border:"1px dashed #d1d5de",cursor:"pointer"}}>Replace image</div>
                </label>
              </div>
            ) : (
              <label style={{display:"block",border:"2px dashed #d1d5de",borderRadius:10,padding:24,textAlign:"center",cursor:"pointer"}}>
                <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleImg}/>
                {uploading?(
                  <div style={{color:"#8b95a8",fontSize:12}}><div style={{fontSize:24,marginBottom:8}}>🤖</div>Reading receipt...<LBar/></div>
                ):(
                  <><div style={{fontSize:28,marginBottom:8}}>📎</div>
                  <div style={{color:"#8b95a8",fontSize:12}}>Tap to attach receipt photo</div>
                  <div style={{color:"#8b95a8",fontSize:11,marginTop:4}}>Claude verifies amount & merchant</div></>
                )}
              </label>
            )}
          </div>

          {/* Edit form */}
          {editing ? (
            <div style={{background:"#2e3340",borderRadius:10,padding:16,border:"1px solid #353a47",marginBottom:12}}>
              <div style={{fontSize:11,color:"#22d3ee",marginBottom:14}}>✏️ Editing</div>
              <FG label="Merchant"><Inp value={form.merchant} onChange={f("merchant")}/></FG>
              <FG label="Amount (SGD)"><Inp value={form.amount} onChange={f("amount")} type="number" step="0.01"/></FG>
              <FG label="Date"><Inp value={form.date} onChange={f("date")} type="date"/></FG>
              <FG label="Category">
                <select style={SS} value={form.category||"Uncategorised"} onChange={f("category")}>
                  {Object.keys(categories).map(c=><option key={c}>{c}</option>)}
                </select>
              </FG>
              <FG label="Payment">
                <select style={SS} value={form.payment||"Credit Card"} onChange={f("payment")}>
                  {["Credit Card","PayLah!","PayNow","Cash","Other"].map(p=><option key={p}>{p}</option>)}
                </select>
              </FG>
              <FG label="Notes"><TA value={form.note||""} onChange={f("note")}/></FG>
              <div style={{display:"flex",gap:8}}>
                <Btn primary onClick={save}>Save</Btn>
                <Btn onClick={()=>{setForm({...expense});setEdit(false);}}>Cancel</Btn>
              </div>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <Btn onClick={()=>setEdit(true)}>✏️ Edit transaction</Btn>
              <Btn danger onClick={()=>{onSoftDelete(expense.id);onClose();}}>🗑 Delete</Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MANUAL MODAL ──────────────────────────────────────────────────────────────
function ManualModal({onAdd,onClose,categories}) {
  const [form,setForm]=useState({merchant:"",amount:"",date:today(),category:"Food & Dining",payment:"Credit Card",note:""});
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const submit=()=>{
    if(!form.merchant||!form.amount) return;
    onAdd({...form,amount:parseFloat(form.amount)||0,source:"manual"});
    onClose();
  };
  return (
    <Modal title="Add Expense" onClose={onClose}>
      <FG label="Merchant"><Inp value={form.merchant} onChange={f("merchant")} placeholder="e.g. Kopitiam, Grab, NTUC..."/></FG>
      <FG label="Amount (SGD)"><Inp value={form.amount} onChange={f("amount")} type="number" step="0.01" placeholder="0.00"/></FG>
      <FG label="Date"><Inp value={form.date} onChange={f("date")} type="date"/></FG>
      <FG label="Category">
        <select style={SS} value={form.category} onChange={f("category")}>
          {Object.keys(categories).map(c=><option key={c}>{c}</option>)}
        </select>
      </FG>
      <FG label="Payment">
        <select style={SS} value={form.payment} onChange={f("payment")}>
          {["Credit Card","PayLah!","PayNow","Cash","Other"].map(p=><option key={p}>{p}</option>)}
        </select>
      </FG>
      <FG label="Notes (optional)"><TA value={form.note} onChange={f("note")} placeholder="Any notes..."/></FG>
      <Btn primary onClick={submit}>Save Expense</Btn>
    </Modal>
  );
}

// ── PHOTO MODAL ───────────────────────────────────────────────────────────────
function PhotoModal({onAdd,onClose,categories}) {
  const [state,setState]=useState("upload");
  const [form,setForm]=useState({});
  const [img,setImg]=useState(null);
  const [err,setErr]=useState("");
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const handleFile=async(e)=>{
    const file=e.target.files[0]; if(!file) return;
    setState("loading");
    const base64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
    setImg(`data:${file.type||"image/jpeg"};base64,${base64}`);
    try {
      const resp=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        model:"claude-sonnet-4-20250514",max_tokens:600,
        messages:[{role:"user",content:[
          {type:"image",source:{type:"base64",media_type:file.type||"image/jpeg",data:base64}},
          {type:"text",text:`Extract expense from this receipt. Return ONLY JSON:
{"merchant":string,"amount":number,"date":"YYYY-MM-DD","category":"Food & Dining|Public Transport|PHV / Taxi|Shopping|Groceries|Entertainment|Healthcare|Utilities|Others","note":string,"payment":string}
For note: include what was purchased, any reference numbers, or useful context from the receipt.`}
        ]}]
      })});
      const data=await resp.json();
      const text=data.content?.find(b=>b.type==="text")?.text||"{}";
      const p=JSON.parse(text.replace(/```json|```/g,"").trim());
      setForm({merchant:p.merchant||"",amount:p.amount||"",date:p.date||today(),category:p.category||"Others",note:p.note||"",payment:p.payment||"Credit Card"});
      setState("review");
    } catch(ex){setErr(ex.message);setState("error");}
  };

  const submit=()=>{
    if(!form.merchant||!form.amount) return;
    onAdd({...form,amount:parseFloat(form.amount)||0,receiptImage:img,source:"photo"});
    onClose();
  };

  return (
    <Modal title="Upload Receipt" onClose={onClose}>
      {state==="upload"&&(
        <label style={{display:"block",border:"2px dashed #d1d5de",borderRadius:10,padding:32,textAlign:"center",cursor:"pointer"}}>
          <input type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
          <div style={{fontSize:36,marginBottom:8}}>📸</div>
          <div style={{color:"#8b95a8",fontSize:13}}>Drop receipt or <span style={{color:"#f59e0b"}}>click to browse</span></div>
          <div style={{color:"#8b95a8",fontSize:11,marginTop:4}}>Claude extracts all details automatically</div>
        </label>
      )}
      {state==="loading"&&<div style={{textAlign:"center",padding:32,color:"#8b95a8"}}><div style={{fontSize:36,marginBottom:10}}>🤖</div><div>Reading receipt...</div><LBar/></div>}
      {state==="review"&&(
        <>
          {img&&<img src={img} alt="Receipt" style={{width:"100%",borderRadius:8,marginBottom:14,maxHeight:180,objectFit:"contain",background:"#1c1f26"}}/>}
          <div style={{background:"#2e3340",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:11,color:"#4ade80"}}>✨ AI extracted — review below</div>
          <FG label="Merchant"><Inp value={form.merchant} onChange={f("merchant")}/></FG>
          <FG label="Amount (SGD)"><Inp value={form.amount} onChange={f("amount")} type="number" step="0.01"/></FG>
          <FG label="Date"><Inp value={form.date} onChange={f("date")} type="date"/></FG>
          <FG label="Category">
            <select style={SS} value={form.category} onChange={f("category")}>
              {Object.keys(categories).map(c=><option key={c}>{c}</option>)}
            </select>
          </FG>
          <FG label="Payment"><Inp value={form.payment} onChange={f("payment")}/></FG>
          <FG label="Notes"><TA value={form.note} onChange={f("note")}/></FG>
          <Btn primary onClick={submit}>Save Expense</Btn>
        </>
      )}
      {state==="error"&&<><div style={{color:"#f87171",textAlign:"center",padding:20}}><div style={{fontSize:28,marginBottom:8}}>⚠️</div><div>Failed to read receipt</div>{err&&<div style={{fontSize:11,color:"#8b95a8",marginTop:6}}>{err}</div>}</div><Btn onClick={()=>setState("upload")}>Try Again</Btn></>}
    </Modal>
  );
}

// ── CATEGORY MANAGER MODAL ────────────────────────────────────────────────────
function CategoryModal({categories,setCategories,onClose}) {
  const [newName,setNewName]=useState("");
  const [newEmoji,setNewEmoji]=useState("📦");
  const [newColor,setNewColor]=useState(PALETTE[0]);
  const PROTECTED = ["Uncategorised"];

  const addCat=()=>{
    const name=newName.trim();
    if(!name||categories[name]) return;
    setCategories(prev=>({...prev,[name]:{emoji:newEmoji,color:newColor}}));
    setNewName(""); setNewEmoji("📦"); setNewColor(PALETTE[Math.floor(Math.random()*PALETTE.length)]);
  };
  const removeCat=(name)=>{
    if(PROTECTED.includes(name)) return;
    setCategories(prev=>{const n={...prev};delete n[name];return n;});
  };

  return (
    <Modal title="Manage Categories" onClose={onClose}>
      <div style={{marginBottom:20}}>
        {Object.entries(categories).map(([name,{emoji,color}])=>(
          <div key={name} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:8,marginBottom:4,background:"#2e3340"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:color}}/>
              <span style={{fontSize:13}}>{emoji} {name}</span>
            </div>
            {!PROTECTED.includes(name)&&name!=="Others"&&(
              <button onClick={()=>removeCat(name)} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>
            )}
          </div>
        ))}
      </div>
      <div style={{borderTop:"1px solid #353a47",paddingTop:16}}>
        <div style={{fontSize:11,color:"#8b95a8",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Add New Category</div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <Inp value={newEmoji} onChange={e=>setNewEmoji(e.target.value)} style={{...IS,width:60}} placeholder="🏷️"/>
          <Inp value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Category name"/>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
          {PALETTE.map(c=>(
            <div key={c} onClick={()=>setNewColor(c)} style={{width:22,height:22,borderRadius:"50%",background:c,cursor:"pointer",border:newColor===c?"3px solid #fff":"3px solid transparent"}}/>
          ))}
        </div>
        <Btn primary onClick={addCat} disabled={!newName.trim()}>Add Category</Btn>
      </div>
      <div style={{marginTop:12,fontSize:11,color:"#8b95a8",lineHeight:1.6}}>
        ⚠️ Removing a category moves its expenses to Uncategorised
      </div>
    </Modal>
  );
}

// ── DELETED FOLDER MODAL ──────────────────────────────────────────────────────
function DeletedModal({deleted,categories,onRecover,onPermanentDelete,onClearAll,onClose}) {
  return (
    <Modal title="🗑 Deleted Transactions" onClose={onClose} wide>
      {!deleted.length ? (
        <div style={{textAlign:"center",padding:"32px 0",color:"#8b95a8"}}>
          <div style={{fontSize:36,marginBottom:8}}>✅</div>
          <div>No deleted transactions</div>
        </div>
      ) : (
        <>
          <div style={{maxHeight:400,overflowY:"auto",marginBottom:16}}>
            {deleted.map(e=>{
              const cat=categories[e.category]||categories["Uncategorised"]||{emoji:"📦",color:"#8b95a8"};
              return (
                <div key={e.id} style={{display:"grid",gridTemplateColumns:"36px 1fr auto auto",alignItems:"center",gap:12,padding:"10px 8px",borderRadius:8,marginBottom:4,background:"#2e3340"}}>
                  <div style={{width:36,height:36,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,background:cat.color+"22"}}>{cat.emoji}</div>
                  <div style={{minWidth:0}}>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:600}}>{e.merchant}</div>
                    <div style={{fontSize:11,color:"#8b95a8"}}>{e.date} · {fmtSGD(e.amount)}</div>
                    {e.note&&<div style={{fontSize:11,color:"#6b7585",marginTop:2}}>{e.note}</div>}
                  </div>
                  <Btn sm onClick={()=>onRecover(e.id)} style={{width:"auto",padding:"5px 10px",color:"#4ade80",borderColor:"rgba(74,222,128,0.3)"}}>Recover</Btn>
                  <Btn sm danger onClick={()=>onPermanentDelete(e.id)} style={{width:"auto",padding:"5px 10px"}}>Remove</Btn>
                </div>
              );
            })}
          </div>
          <Btn danger onClick={onClearAll}>🗑 Permanently delete all</Btn>
        </>
      )}
    </Modal>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
const LATEST_SCAN = [{"merchant": "Bus/MRT", "amount": 7.32, "amountRaw": "", "date": "2026-06-04", "category": "Public Transport", "payment": "UOB Credit Card", "note": "", "emailId": "19e8f6120fafb9ea", "source": "email"}, {"merchant": "Bus/MRT", "amount": 2.5, "amountRaw": "", "date": "2026-06-04", "category": "Public Transport", "payment": "UOB Credit Card", "note": "Accumulated transit", "emailId": "19e8f65f54db79c9", "source": "email"}, {"merchant": "PayNow Transfer", "amount": 6000.0, "amountRaw": "", "date": "2026-06-03", "category": "Others", "payment": "PayNow", "note": "To: iFAST Financial", "emailId": "19e8c9b8507ae609", "source": "email"}, {"merchant": "Bus/MRT", "amount": 1.9, "amountRaw": "", "date": "2026-06-03", "category": "Public Transport", "payment": "UOB Credit Card", "note": "", "emailId": "19e8a3927a35a122", "source": "email"}, {"merchant": "TADA", "amount": 32.13, "amountRaw": "", "date": "2026-06-03", "category": "PHV / Taxi", "payment": "UOB Credit Card", "note": "", "emailId": "19e8b1678fbaa785", "source": "email"}, {"merchant": "Anthropic", "amount": 63.77, "amountRaw": "", "date": "2026-06-03", "category": "Utilities", "payment": "UOB Credit Card", "note": "", "emailId": "19e8cc51aad921e4", "source": "email"}, {"merchant": "Bill Payment", "amount": 933.62, "amountRaw": "", "date": "2026-06-03", "category": "Others", "payment": "DBS", "note": "digibank bill payment", "emailId": "19e8951771c9531a", "source": "email"}, {"merchant": "PayNow Transfer", "amount": 133.0, "amountRaw": "", "date": "2026-05-28", "category": "Others", "payment": "PayNow", "note": "", "emailId": "19e6e015cb0417b6", "source": "email"}, {"merchant": "DBS Bank Transfer", "amount": 3000.0, "amountRaw": "", "date": "2026-05-28", "category": "Others", "payment": "Bank Transfer", "note": "UOB to DBS a/c ending 9570", "emailId": "19e6dec08d9ddadd", "source": "email"}];

// Permanently deleted emailIds — embedded so they survive storage wipes.
// Updated by Claude when you permanently delete a transaction.
const PERMANENT_BLOCKLIST = new Set([]);

export default function App() {
  const [expenses,   setExpenses]   = useState([]);
  const [deleted,    setDeleted]    = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [activeCategory,setActiveCat]=useState("all");
  const [activeSource,  setActiveSrc]=useState("all");
  const [activeMonth,   setActiveMon]=useState("all");
  const [modal,      setModal]      = useState(null); // null|"manual"|"photo"|"cats"|"deleted"
  const [drawer,     setDrawer]     = useState(null); // expense object
  const [toast,      setToast]      = useState(null);
  const [lastScan,   setLastScan]   = useState(null);
  const [scanState,  setScanState]  = useState({status:"idle",phase:"",progress:0,eta:0});
  const expRef  = useRef([]);

  useEffect(()=>{expRef.current=expenses;},[expenses]);

  // Categories: when one is removed, remap its expenses to Uncategorised
  // and always persist category changes to storage
  const prevCatsRef  = useRef(null);
  const catsLoadedRef = useRef(false);
  useEffect(()=>{
    // Skip the very first render before boot has loaded stored categories
    if (!catsLoadedRef.current) { catsLoadedRef.current = true; prevCatsRef.current = categories; return; }
    const prev = prevCatsRef.current || {};
    const removed = Object.keys(prev).filter(k=>!categories[k]);
    if (removed.length > 0) {
      setExpenses(ex => {
        const next = ex.map(e => removed.includes(e.category) ? {...e, category:"Uncategorised"} : e);
        try { window.storage.set("expenses_v2", JSON.stringify(next)); } catch {}
        expRef.current = next;
        return next;
      });
    }
    prevCatsRef.current = categories;
    try { window.storage.set("spendsg_categories", JSON.stringify(categories)); } catch {}
  },[categories]);

  // Scan timestamp — updated by Claude each scan, read on boot to set lastScan
  const SCAN_TIMESTAMP = "2026-06-04T03:56:18Z";

  // Boot
  useEffect(()=>{
    (async()=>{
      // Load categories — merge stored with defaults so new defaults appear
      // but user additions/removals/renames are preserved
      try {
        const r = await window.storage.get("spendsg_categories");
        if (r?.value) {
          const stored = JSON.parse(r.value);
          // Add any new default categories missing from stored (user additions kept, user removals kept)
          const merged = { ...DEFAULT_CATEGORIES };
          // Overlay stored on top — user changes win, but new defaults fill gaps
          Object.entries(stored).forEach(([k,v]) => { merged[k] = v; });
          // Ensure Uncategorised always exists at the end
          if (!merged["Uncategorised"]) merged["Uncategorised"] = DEFAULT_CATEGORIES["Uncategorised"];
          setCategories(merged);
          // Save merged back so it's persisted
          await window.storage.set("spendsg_categories", JSON.stringify(merged));
        } else {
          // First load — save defaults
          await window.storage.set("spendsg_categories", JSON.stringify(DEFAULT_CATEGORIES));
        }
      } catch {}
      // Load deleted
      try{const r=await window.storage.get("spendsg_deleted");if(r?.value)setDeleted(JSON.parse(r.value));}catch{}
      // Load expenses, merge LATEST_SCAN
      // Load expenses — merge LATEST_SCAN into stored, never overwrite user changes
      let storedExpenses = [];
      try {
        const r = await window.storage.get("expenses_v2");
        if (r?.value) {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed)) storedExpenses = parsed;
        }
      } catch {}

      // Blocklist — combine code-embedded (survives storage wipes) + storage-saved
      let blocklist = new Set(PERMANENT_BLOCKLIST);
      try {
        const rb = await window.storage.get("spendsg_blocklist");
        if (rb?.value) JSON.parse(rb.value).forEach(id => blocklist.add(id));
      } catch {}

      // Load soft-deleted emailIds so they don't reseed either
      let deletedIds = new Set();
      try {
        const rd = await window.storage.get("spendsg_deleted");
        if (rd?.value) {
          const dels = JSON.parse(rd.value);
          dels.forEach(e => { if (e.emailId) deletedIds.add(e.emailId); });
        }
      } catch {}

      // Always merge LATEST_SCAN — skip blocklisted, soft-deleted, and already-stored
      const storedIds  = new Set(storedExpenses.map(e=>e.emailId).filter(Boolean));
      const storedKeys = new Set(storedExpenses.map(e=>`${e.merchant}|${e.amount}|${e.date}`));
      const ts = Date.now();
      const newOnes = LATEST_SCAN
        .filter(t =>
          !blocklist.has(t.emailId) &&
          !deletedIds.has(t.emailId) &&
          !storedIds.has(t.emailId) &&
          !storedKeys.has(`${t.merchant}|${t.amount}|${t.date}`)
        )
        .map((t,i) => ({...t, id: ts+i}));

      const merged = newOnes.length > 0 ? [...newOnes, ...storedExpenses] : storedExpenses;
      if (newOnes.length > 0) {
        try { await window.storage.set("expenses_v2", JSON.stringify(merged)); } catch {}
      }
      setExpenses(merged);
      expRef.current = merged;
      // Last scan — use whichever is more recent: stored or embedded scan timestamp
      try{
        const m=await window.storage.get("last_scan");
        const stored = m?.value || null;
        const embedded = SCAN_TIMESTAMP;
        const useTime = (!stored || embedded > stored) ? embedded : stored;
        setLastScan(useTime);
        if (embedded > (stored||"")) {
          window.storage.set("last_scan", embedded).catch(()=>{});
        }
      }catch{ setLastScan(SCAN_TIMESTAMP); }
    })();
  },[]);

  const saveExpenses=(exps)=>{try{window.storage.set("expenses_v2",JSON.stringify(exps));}catch{}};
  const saveDeleted =(dels)=>{try{window.storage.set("spendsg_deleted",JSON.stringify(dels));}catch{}};

  const addExpense=(exp)=>{
    const e={...exp,id:Date.now()+Math.random(),date:exp.date||today()};
    setExpenses(prev=>{const next=[e,...prev];saveExpenses(next);expRef.current=next;return next;});
    setToast({msg:"✅ Added: "+exp.merchant,accent:"#4ade80"});
  };
  const updateExpense=(updated)=>{
    setExpenses(prev=>{const next=prev.map(e=>e.id===updated.id?updated:e);saveExpenses(next);expRef.current=next;return next;});
    if(drawer?.id===updated.id)setDrawer(updated);
    setToast({msg:"✅ Saved",accent:"#4ade80"});
  };
  const softDelete=(id)=>{
    const exp=expRef.current.find(e=>e.id===id);
    if(!exp) return;
    setExpenses(prev=>{const next=prev.filter(e=>e.id!==id);saveExpenses(next);expRef.current=next;return next;});
    const dels=[exp,...deleted];
    setDeleted(dels); saveDeleted(dels);
    setToast({msg:"🗑 Moved to Deleted",accent:"#f87171"});
  };
  const recover=(id)=>{
    const exp=deleted.find(e=>e.id===id);
    if(!exp) return;
    const dels=deleted.filter(e=>e.id!==id); setDeleted(dels); saveDeleted(dels);
    addExpense(exp);
    setToast({msg:"✅ Recovered: "+exp.merchant,accent:"#4ade80"});
  };
  const permanentDelete=(id)=>{
    const exp = deleted.find(e=>e.id===id);
    const dels=deleted.filter(e=>e.id!==id); setDeleted(dels); saveDeleted(dels);
    // Add emailId to blocklist so it never reappears from LATEST_SCAN on reload
    if (exp?.emailId) {
      (async()=>{
        try {
          const r = await window.storage.get("spendsg_blocklist");
          const list = r?.value ? JSON.parse(r.value) : [];
          if (!list.includes(exp.emailId)) {
            list.push(exp.emailId);
            await window.storage.set("spendsg_blocklist", JSON.stringify(list));
          }
        } catch {}
      })();
    }
  };
  const clearDeleted=()=>{
    const emailIds = deleted.map(e=>e.emailId).filter(Boolean);
    setDeleted([]); saveDeleted([]);
    if (emailIds.length > 0) {
      (async()=>{
        try {
          const r = await window.storage.get("spendsg_blocklist");
          const list = r?.value ? JSON.parse(r.value) : [];
          const merged = [...new Set([...list, ...emailIds])];
          await window.storage.set("spendsg_blocklist", JSON.stringify(merged));
        } catch {}
      })();
    }
  };

  // Scan state crawler — keeps bar moving while scan is running
  useEffect(()=>{
    if(scanState.status!=="scanning") return;
    const startTime=Date.now();
    const ticker=setInterval(()=>{
      setScanState(p=>{
        if(p.status!=="scanning") return p;
        const elapsed=(Date.now()-startTime)/1000;
        const progress=Math.min(90,5+elapsed*2);
        const eta=Math.max(0,Math.round(45-elapsed));
        return{...p,progress,eta};
      });
    },1000);
    return()=>clearInterval(ticker);
  },[scanState.status]);

  // Derived
  const nowMonth  =new Date().toISOString().slice(0,7);
  const dispMonth =activeMonth==="all"?nowMonth:activeMonth;
  const monthTotal=expenses.filter(e=>e.date?.startsWith(dispMonth)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const allMonths =[...new Set(expenses.map(e=>e.date?.slice(0,7)).filter(Boolean))].sort((a,b)=>b.localeCompare(a));

  const catTotals={};
  expenses.filter(e=>activeMonth==="all"||e.date?.startsWith(activeMonth))
    .forEach(e=>{const c=e.category||"Uncategorised";catTotals[c]=(catTotals[c]||0)+(parseFloat(e.amount)||0);});
  const maxCat=Math.max(...Object.values(catTotals),1);

  let filtered=expenses;
  if(activeMonth!=="all")    filtered=filtered.filter(e=>e.date?.startsWith(activeMonth));
  if(activeCategory!=="all") filtered=filtered.filter(e=>(e.category||"Uncategorised")===activeCategory);
  if(activeSource!=="all")   filtered=filtered.filter(e=>e.source===activeSource);

  const groups={};
  filtered.forEach(e=>{const d=e.date||"Unknown";if(!groups[d])groups[d]=[];groups[d].push(e);});
  const sortedGroups=Object.entries(groups).sort((a,b)=>b[0].localeCompare(a[0]));
  const srcColors={email:"#22d3ee",photo:"#f59e0b",manual:"#4ade80"};

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#1c1f26;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#353a47;border-radius:2px;}
        select option{background:#f1f3f7;}
        @keyframes loadAnim{0%{width:0%;margin-left:0}50%{width:60%;margin-left:20%}100%{width:0%;margin-left:100%}}
        @keyframes slideIn{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes drawerIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
      `}</style>

      <div style={{fontFamily:"'DM Mono',monospace",background:"#1c1f26",color:"#e8eaf0",minHeight:"100vh",display:"grid",gridTemplateRows:"auto auto auto auto 1fr",fontSize:13}}>

        {/* Header */}
        <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 28px",borderBottom:"1px solid #353a47",background:"#252932"}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800,letterSpacing:-0.5}}>spend<span style={{color:"#4ade80"}}>.</span>sg</div>
          <div style={{display:"flex",gap:24,alignItems:"center"}}>
            {deleted.length>0&&(
              <button onClick={()=>setModal("deleted")} style={{fontSize:11,color:"#f87171",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontFamily:"'DM Mono',monospace"}}>
                🗑 {deleted.length}
              </button>
            )}
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:"#8b95a8",textTransform:"uppercase",letterSpacing:1}}>{activeMonth==="all"?"This Month":monthLabel(activeMonth)}</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:700,color:"#16a34a"}}>{fmtSGD(monthTotal)}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:"#8b95a8",textTransform:"uppercase",letterSpacing:1}}>Transactions</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:700,color:"#0284c7"}}>{filtered.length}</div>
            </div>
          </div>
        </header>

        {/* Scan bar */}
        <ScanBar lastScan={lastScan} scanState={scanState}/>

        {/* Month tabs */}
        <div style={{background:"#1a1d24",borderBottom:"1px solid #353a47",padding:"0 20px",display:"flex",overflowX:"auto"}}>
          {["all",...allMonths].map(m=>(
            <button key={m} onClick={()=>setActiveMon(m)} style={{padding:"10px 16px",background:"none",border:"none",fontFamily:"'DM Mono',monospace",fontSize:11,cursor:"pointer",whiteSpace:"nowrap",color:activeMonth===m?"#4ade80":"#8b95a8",borderBottom:`2px solid ${activeMonth===m?"#4ade80":"transparent"}`,transition:"all 0.15s"}}>
              {m==="all"?"All time":monthLabel(m)}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{display:"grid",gridTemplateColumns:"268px 1fr",overflow:"hidden",height:"calc(100vh - 130px)"}}>

          {/* Sidebar */}
          <aside style={{background:"#252932",borderRight:"1px solid #353a47",display:"flex",flexDirection:"column",overflowY:"auto"}}>
            <div style={{padding:18,borderBottom:"1px solid #353a47"}}>
              <div style={{fontSize:10,color:"#8b95a8",textTransform:"uppercase",letterSpacing:1.5,marginBottom:12}}>Add Expense</div>
              {[
                {label:"Upload Receipt",icon:"📸",key:"photo",bc:"rgba(245,158,11,0.3)",c:"#f59e0b"},
                {label:"Add Manually", icon:"✍️",key:"manual",bc:"#3a3f4d",c:"#e8eaf0"},
              ].map(b=>(
                <button key={b.key} onClick={()=>setModal(b.key)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${b.bc}`,background:"#2e3340",color:b.c,fontFamily:"'DM Mono',monospace",fontSize:11,cursor:"pointer",marginBottom:7,textAlign:"left"}}>
                  {b.icon} {b.label}
                </button>
              ))}
            </div>

            {/* Categories */}
            <div style={{padding:18,borderBottom:"1px solid #353a47"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <div style={{fontSize:10,color:"#8b95a8",textTransform:"uppercase",letterSpacing:1.5}}>Categories</div>
                <button onClick={()=>setModal("cats")} style={{fontSize:10,color:"#4ade80",background:"none",border:"1px solid rgba(74,222,128,0.3)",borderRadius:5,padding:"2px 8px",cursor:"pointer",fontFamily:"'DM Mono',monospace"}}>Manage</button>
              </div>
              {[["all","All","#8b95a8",Object.values(catTotals).reduce((a,b)=>a+b,0)],
                ...Object.entries(categories).map(([n,{color}])=>[n,n,color,catTotals[n]||0])
              ].map(([key,label,color,amt])=>(
                <div key={key} onClick={()=>setActiveCat(key)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",borderRadius:6,cursor:"pointer",background:activeCategory===key?"#2e3340":"transparent"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,fontSize:11}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:color}}/>
                    {categories[key]?.emoji?`${categories[key].emoji} ${label}`:label}
                  </div>
                  <div style={{fontSize:11,color:"#8b95a8"}}>{fmtSGD(amt)}</div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div style={{padding:18}}>
              <div style={{fontSize:10,color:"#8b95a8",textTransform:"uppercase",letterSpacing:1.5,marginBottom:12}}>Spending by Category</div>
              {Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,amt])=>{
                const {color}=categories[name]||{color:"#8b95a8"};
                return(
                  <div key={name} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}><span>{name}</span><span style={{color:"#8b95a8"}}>{fmtSGD(amt)}</span></div>
                    <div style={{height:5,background:"#3a3f4d",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:3,background:color,width:`${Math.round((amt/maxCat)*100)}%`,transition:"width 0.6s ease"}}/>
                    </div>
                  </div>
                );
              })}
              {!Object.keys(catTotals).length&&<div style={{color:"#8b95a8",fontSize:11}}>No data yet</div>}
            </div>
          </aside>

          {/* List */}
          <div style={{display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"14px 24px",borderBottom:"1px solid #353a47",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:700}}>
                {activeCategory==="all"?(activeMonth==="all"?"All Expenses":monthLabel(activeMonth)):activeCategory}
              </div>
              <div style={{display:"flex",gap:6}}>
                {[["all","All"],["email","📧 Auto"],["photo","📸 Photo"],["manual","✍️ Manual"]].map(([src,label])=>(
                  <button key={src} onClick={()=>setActiveSrc(src)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${activeSource===src?"#4ade80":"#3a3f4d"}`,background:activeSource===src?"#2e3340":"none",color:activeSource===src?"#e8eaf0":"#8b95a8",fontFamily:"'DM Mono',monospace",fontSize:11,cursor:"pointer"}}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{flex:1,overflowY:"auto",padding:"0 24px"}}>
              {!sortedGroups.length?(
                <div style={{textAlign:"center",padding:"60px 20px",color:"#8b95a8"}}>
                  <div style={{fontSize:48,marginBottom:12}}>💳</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,color:"#e8eaf0",marginBottom:8}}>No expenses yet</div>
                  <div>Type <span style={{color:"#f59e0b",fontFamily:"'DM Mono',monospace"}}>scan</span> in chat to import, or upload a receipt photo</div>
                </div>
              ):sortedGroups.map(([date,exps])=>(
                <div key={date} style={{margin:"18px 0"}}>
                  <div style={{fontSize:10,color:"#8b95a8",textTransform:"uppercase",letterSpacing:1.5,padding:"7px 0",borderBottom:"1px solid #353a47",marginBottom:6}}>{fmtDate(date)}</div>
                  {exps.map(e=>{
                    const cat=categories[e.category]||categories["Uncategorised"]||{emoji:"📦",color:"#8b95a8"};
                    const isPayLah=(e.payment||"").toLowerCase().includes("paylah");
                    const isPayNow=(e.payment||"").toLowerCase().includes("paynow");
                    const hasReceipt=!!e.receiptImage;
                    return(
                      <div key={e.id} onClick={()=>setDrawer(e)}
                        style={{display:"grid",gridTemplateColumns:"36px 1fr auto auto auto",alignItems:"center",gap:12,padding:"9px 8px",borderRadius:8,cursor:"pointer",marginBottom:2,transition:"background 0.1s"}}
                        onMouseEnter={ev=>ev.currentTarget.style.background="#2e3340"}
                        onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
                        <div style={{width:36,height:36,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,background:cat.color+"22",flexShrink:0,position:"relative"}}>
                          {cat.emoji}
                          {hasReceipt&&<div style={{position:"absolute",bottom:-2,right:-2,width:8,height:8,borderRadius:"50%",background:"#4ade80",border:"2px solid #1c1f26"}}/>}
                        </div>
                        <div style={{minWidth:0}}>
                          <div style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.merchant||"Unknown"}</div>
                          <div style={{fontSize:11,color:"#8b95a8",marginTop:1}}>
                            {e.category||"Uncategorised"}
                            {e.payment&&<span style={{color:isPayLah?"#a78bfa":isPayNow?"#22d3ee":"#8b95a8",marginLeft:5}}>· {e.payment}</span>}
                            {e.note&&<span style={{color:"#6b7585",marginLeft:5}}>· {e.note.slice(0,40)}{e.note.length>40?"...":""}</span>}
                          </div>
                        </div>
                        <div style={{fontSize:10,padding:"2px 6px",borderRadius:10,border:`1px solid ${(srcColors[e.source]||"#6b7585")+"55"}`,color:srcColors[e.source]||"#6b7585"}}>
                          {e.source==="email"?"📧":e.source==="photo"?"📸":"✍️"}
                        </div>
                        <div style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:cat.color,whiteSpace:"nowrap"}}>{fmtSGD(e.amount)}</div>
                        <div style={{color:"#6b7585",fontSize:12}}>›</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal==="photo"   && <PhotoModal   onAdd={addExpense} onClose={()=>setModal(null)} categories={categories}/>}
      {modal==="manual"  && <ManualModal  onAdd={addExpense} onClose={()=>setModal(null)} categories={categories}/>}
      {modal==="cats"    && <CategoryModal categories={categories} setCategories={setCategories} onClose={()=>setModal(null)}/>}
      {modal==="deleted" && <DeletedModal deleted={deleted} categories={categories} onRecover={recover} onPermanentDelete={permanentDelete} onClearAll={clearDeleted} onClose={()=>setModal(null)}/>}

      {/* Receipt drawer */}
      {drawer && <ReceiptDrawer expense={drawer} categories={categories} onClose={()=>setDrawer(null)} onUpdate={updateExpense} onDelete={id=>{softDelete(id);}} onSoftDelete={id=>{softDelete(id);setDrawer(null);}}/>}

      {toast && <Toast msg={toast.msg} accent={toast.accent} onDone={()=>setToast(null)}/>}
    </>
  );
}
