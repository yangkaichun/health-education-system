let emailsList = [];
function loadEmails(){
  db.collection("emails").get().then(snap=>{
    emailsList = snap.docs.map(d=>({id:d.id,...d.data()}));
    renderEmails();
  });
}
function renderEmails(){
  const div = document.getElementById("emails");
  div.innerHTML = emailsList.map(e=>
    `<label><input type="checkbox" data-id="${e.id}" ${e.enabled?'checked':''}> ${e.address}</label><br>`
  ).join("");
  div.querySelectorAll("input").forEach(cb=>{
    cb.onchange = ()=>{
      db.collection("emails").doc(cb.dataset.id).update({ enabled: cb.checked });
    };
  });
}
document.getElementById("email-settings-btn").onclick = ()=>{
  document.getElementById("email-settings").classList.toggle("hidden");
  loadEmails();
};

// 顯示 records
function loadRecords(){
  db.collection("records").orderBy("timestamp","desc").get().then(snap=>{
    const tbody = document.getElementById("records");
    tbody.innerHTML = snap.docs.map(d=>{
      const r = d.data();
      const t = new Date(r.timestamp.seconds*1000).toLocaleString();
      return `<tr>
        <td>${r.code}</td>
        <td>${topicsConfig[r.topicIdx].name}</td>
        <td>${r.watched?"已看完":"觀看中"}</td>
        <td>${r.score}</td>
        <td><input type="checkbox" ${r.notified?"checked":""} data-id="${d.id}" class="notify"></td>
        <td>${t}</td>
        <td><button data-id="${d.id}" class="del">刪除</button></td>
      </tr>`;
    }).join("");
    // 綁事件
    tbody.querySelectorAll(".notify").forEach(cb=>{
      cb.onchange = ()=>{
        db.collection("records").doc(cb.dataset.id).update({ notified: cb.checked });
      };
    });
    tbody.querySelectorAll(".del").forEach(btn=>{
      btn.onclick = ()=> {
        db.collection("records").doc(btn.dataset.id).delete().then(loadRecords);
      };
    });
  });
}
let topicsConfig;
db.collection("topics").doc("config").onSnapshot(doc=>{
  topicsConfig = doc.data().list;
  loadRecords();
});
setInterval(loadRecords, 30000);
