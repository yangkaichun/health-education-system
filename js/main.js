// 讀取主題設定
let topicsConfig;
db.collection("topics").doc("config").onSnapshot(doc=>{
  topicsConfig = doc.data().list; renderTopics();
});
function renderTopics(){
  const div = document.getElementById("topics");
  div.innerHTML = topicsConfig.map((t,i)=>
    `<label><input type="radio" name="topic" value="${i}"> ${t.name}</label>`
  ).join("<br>");
}

// QR Code 掃描
const html5QrCode = new Html5Qrcode("reader");
document.getElementById("btn-scan").onclick = ()=>{
  html5QrCode.start(
    { facingMode: "environment" },
    { fps:10, qrbox:250 },
    qrCodeMsg => {
      document.getElementById("qr-result").value = qrCodeMsg;
      html5QrCode.stop();
    }
  );
};

// 選主題送出 → 顯示影片
document.getElementById("topic-form").onsubmit = e=>{
  e.preventDefault();
  const code = document.getElementById("qr-result").value;
  const topicIdx = document.querySelector('input[name=topic]:checked').value;
  const topic = topicsConfig[topicIdx];
  const video = document.getElementById("edu-video");
  video.src = topic.url;
  document.getElementById("video-section").classList.remove("hidden");

  // 禁止快轉
  let lastTime=0;
  video.addEventListener('timeupdate',()=>{
    if(video.currentTime > lastTime+0.5) video.currentTime = lastTime;
    else lastTime = video.currentTime;
  });
  video.onended = ()=>{
    document.getElementById("to-survey").classList.remove("hidden");
  };
};

// 重播
document.getElementById("replay").onclick = ()=>{
  const v = document.getElementById("edu-video");
  v.currentTime=0; v.play();
};

// 進入問卷
document.getElementById("to-survey").onclick = ()=>{
  const idx = document.querySelector('input[name=topic]:checked').value;
  db.collection("topics").doc("config").get().then(doc=>{
    const survey = doc.data().list[idx].survey;
    const form = document.getElementById("survey-form");
    form.innerHTML = survey.map((q,qi)=>{
      if(q.type==="tf"){
        return `<p>${q.text}<br>
          <label><input name="q${qi}" type="radio" value="true">是</label>
          <label><input name="q${qi}" type="radio" value="false">否</label>
        </p>`;
      } else {
        return `<p>${q.text}<br>`+
          q.options.map((o,oi)=>
            `<label><input name="q${qi}" type="radio" value="${oi}">${o}</label>`
          ).join("")+`</p>`;
      }
    }).join("")+`<button type="submit">送出問卷</button>`;
    document.getElementById("survey-section").classList.remove("hidden");
  });
};

// 問卷送出
document.getElementById("survey-form").onsubmit = e=>{
  e.preventDefault();
  const code = document.getElementById("qr-result").value;
  const topicIdx = document.querySelector('input[name=topic]:checked').value;
  const answers = Array.from(new FormData(e.target).entries());
  const score = answers.reduce((sum,[k,v],i)=>{
    const q = topicsConfig[topicIdx].survey[i];
    if(q.type==="tf") return sum + (v==="true"? q.scoreTrue: q.scoreFalse);
    else return sum + q.scores[parseInt(v)];
  },0);
  const record = {
    code, topicIdx: parseInt(topicIdx),
    watched: true, score,
    notified: false,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };
  db.collection("records").add(record).then(()=>{
    // Email 通知護理師
    emailjs.send(EMAIL_SERVICE, EMAIL_TEMPLATE, { code, topic: topicsConfig[topicIdx].name, score });
    alert("問卷已送出，護理師將與您說明");
    location.href="dashboard.html";
  });
};
