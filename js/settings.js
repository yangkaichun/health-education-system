let configDoc;
db.collection("topics").doc("config").get().then(doc=>{
  if(!doc.exists) db.collection("topics").doc("config").set({ list: [] });
  configDoc = db.collection("topics").doc("config");
  configDoc.onSnapshot(d=> render(d.data().list));
});
function render(list){
  const div = document.getElementById("topics-settings");
  div.innerHTML = list.map((t,i)=>`
    <fieldset data-idx="${i}">
      <legend>主題 ${i+1}</legend>
      名稱：<input class="name" value="${t.name}"><br>
      YouTube URL：<input class="url" value="${t.url}"><br>
      <div class="survey">
        ${t.survey.map((q,qi)=>`
          <div data-qi="${qi}">
            題目：<input class="qtext" value="${q.text}">
            型態：
            <select class="qtype">
              <option value="tf" ${q.type==="tf"?"selected":""}>是非</option>
              <option value="mc" ${q.type==="mc"?"selected":""}>選擇</option>
            </select>
            <button class="del-q">刪除題目</button><br>
            ${q.type==="mc"?
              q.options.map((o,oi)=>`
                選項：<input class="opt" value="${o}">分數：<input class="opt-score" value="${q.scores[oi]}"><br>`
              ).join(""):"分數True:<input class='score-true' value='${q.scoreTrue}'>False:<input class='score-false' value='${q.scoreFalse}'><br>`
            }
          </div>
        `).join("")}
      </div>
      <button class="add-q">新增題目</button>
      <button class="del-topic">刪除此主題</button>
    </fieldset>
  `).join("");
  bindSettingsEvents();
}
function bindSettingsEvents(){
  document.querySelectorAll(".add-q").forEach(btn=>{
    btn.onclick=()=>{
      const idx=btn.parentElement.dataset.idx*1;
      const list=configDocList();
      list[idx].survey.push({ text:"新題目", type:"tf", scoreTrue:1, scoreFalse:0, options:[], scores:[] });
      configDoc.update({ list });
    };
  });
  document.querySelectorAll(".del-q").forEach(btn=>{
    btn.onclick=()=>{
      const f=btn.parentElement.parentElement.parentElement;
      const idx=f.dataset.idx*1, qi=btn.parentElement.dataset.qi*1;
      const list=configDocList();
      list[idx].survey.splice(qi,1);
      configDoc.update({ list });
    };
  });
  document.querySelectorAll(".del-topic").forEach(btn=>{
    btn.onclick=()=>{
      const idx=btn.parentElement.dataset.idx*1;
      let list=configDocList();
      list.splice(idx,1);
      configDoc.update({ list });
    };
  });
  document.querySelectorAll(".name, .url, .qtext, .qtype, .opt, .opt-score, .score-true, .score-false")
    .forEach(inp=> inp.onchange = ()=> {
      let list = configDocList();
      const f=inp.closest("fieldset"), i=f.dataset.idx*1;
      list[i].name = f.querySelector(".name").value;
      list[i].url = f.querySelector(".url").value;
      list[i].survey = Array.from(f.querySelectorAll(".survey > div")).map(div=>{
        const type=div.querySelector(".qtype").value;
        const text=div.querySelector(".qtext").value;
        if(type==="tf"){
          return {
            text, type,
            scoreTrue: Number(div.querySelector(".score-true").value),
            scoreFalse: Number(div.querySelector(".score-false").value),
            options:[], scores:[]
          };
        } else {
          const options = Array.from(div.querySelectorAll(".opt")).map(i=>i.value);
          const scores  = Array.from(div.querySelectorAll(".opt-score")).map(i=>Number(i.value));
          return { text, type, options, scores };
        }
      });
      configDoc.update({ list });
    });
}
function configDocList(){
  return JSON.parse(JSON.stringify(configDoc._delegate._document.data.value.mapValue.fields.list.arrayValue.values))
    .map(v=> firebase.firestore.DocumentSnapshot._fromValue(v).data());
}
// 新增主題
document.getElementById("add-topic").onclick = ()=>{
  configDoc.get().then(d=>{
    const list = d.data().list;
    list.push({ name:"新主題", url:"", survey:[] });
    configDoc.update({ list });
  });
};
// 儲存全部（其實已即時存）
document.getElementById("save-all").onclick = ()=> alert("所有變更已自動儲存");
