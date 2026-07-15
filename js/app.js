/* =========================================================
   app.js — 하랑초 소통 게시판 메인 로직
   ========================================================= */
(function(global){
  const CATS = Store.CATS;
  const CAT_ICON = {"공지":"📢","자유게시판":"💬","건의함":"🙋","투표":"🗳️"};
  const IS_TEACHER = (global.HARANG_MODE === "teacher");
  // 글쓰기 가능한 게시판: 교사=전체, 학생=공지 제외
  const WRITE_CATS = IS_TEACHER ? ["공지","자유게시판","건의함","투표"] : ["자유게시판","건의함","투표"];
  let cur = { cat:"공지", view:"list", postId:null };

  /* ---------- 유틸 ---------- */
  const $ = s=>document.querySelector(s);
  function esc(s){ return (s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function initial(name){ const m=(name||"").replace(/^\d+학년\s*/,"").trim(); return (m[0]||"?"); }
  function timeAgo(t){
    const d=Date.now()-t, m=60000,h=3600000,day=86400000;
    if(d<m) return "방금 전";
    if(d<h) return Math.floor(d/m)+"분 전";
    if(d<day) return Math.floor(d/h)+"시간 전";
    if(d<7*day) return Math.floor(d/day)+"일 전";
    const dt=new Date(t); return `${dt.getMonth()+1}월 ${dt.getDate()}일`;
  }
  function toast(msg){
    const el=$("#toast"); el.textContent=msg; el.classList.add("show");
    clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove("show"),2200);
  }
  function openModal(html){
    $("#modal").innerHTML=html; $("#overlay").classList.add("show");
  }
  function closeModal(){ $("#overlay").classList.remove("show"); }
  $("#overlay") && $("#overlay").addEventListener("click",e=>{ if(e.target.id==="overlay") closeModal(); });

  /* ---------- 인증 영역 ---------- */
  function renderAuth(){
    const u=Store.currentUser(); const el=$("#authArea");
    if(u){
      el.innerHTML=`<div style="display:flex;align-items:center;gap:8px;">
        <span class="user-chip"><span class="avatar">${esc(initial(u.name))}</span>${esc(u.name)}</span>
        <button class="btn-ghost" onclick="App.logout()">로그아웃</button></div>`;
    }else{
      el.innerHTML=`<button class="btn-login" onclick="App.openLogin()">로그인</button>`;
    }
  }

  /* ---------- 메인 렌더 ---------- */
  function render(){
    renderAuth();
    if(cur.view==="detail") return renderDetail();
    renderListPage();
  }

  function tabsHtml(){
    return `<div class="tabs">${CATS.map(c=>
      `<button class="tab ${c===cur.cat?"active":""}" data-cat="${c}" onclick="App.selectCat('${c}')">${CAT_ICON[c]} ${c}</button>`
    ).join("")}</div>`;
  }

  function renderListPage(){
    const u=Store.currentUser();
    const posts=Store.postsByCat(cur.cat);
    let html = tabsHtml();

    // 소개 배너 (공지 탭에서만)
    if(cur.cat==="공지"){
      html += `<div class="hero">
        <div>
          <h1>우리 학교 이야기를 나눠요 🌱</h1>
          <p>공지부터 자유로운 수다, 건의와 투표까지 — 하랑 친구들의 소통 공간이에요.</p>
        </div>
        <div class="hero-badges">
          <div class="hero-badge"><div class="n">${Store.totalPosts()}</div><div class="l">전체 글</div></div>
          <div class="hero-badge"><div class="n">${Store.totalComments()}</div><div class="l">댓글</div></div>
        </div>
      </div>`;
    }

    if(!u){
      html += `<div class="locked-note" style="margin:2px 0 14px;width:100%;justify-content:center;">
        🔒 <b style="margin:0 4px;">로그인</b>하면 글 내용과 댓글을 볼 수 있고, 글도 쓸 수 있어요.
        &nbsp;<a style="color:var(--blue);font-weight:700;cursor:pointer;" onclick="App.openLogin()">로그인하기</a></div>`;
    }

    html += `<div class="list-head"><div class="tag" data-cat="${cur.cat}">${cur.cat}</div>
      <div class="count">${posts.length}개의 글</div></div>`;

    if(posts.length===0){
      html += `<div class="empty"><div class="e-ico">${CAT_ICON[cur.cat]}</div><p>아직 글이 없어요. 첫 글을 남겨보세요!</p></div>`;
    }else{
      html += `<div class="post-list">${posts.map(p=>cardHtml(p,u)).join("")}</div>`;
    }
    $("#app").innerHTML=html;
  }

  function cardHtml(p,u){
    if(!u){
      // 비로그인: 제목만
      return `<div class="post-card locked ${p.pinned?"pinned":""}" onclick="App.openPost('${p.id}')">
        <div class="top"><span class="tag" data-cat="${p.cat}">${p.cat}</span>
          <span class="title">${esc(p.title)}</span></div>
        <div class="locked-note">🔒 로그인하면 내용·작성자·댓글을 볼 수 있어요</div>
      </div>`;
    }
    return `<div class="post-card ${p.pinned?"pinned":""}" onclick="App.openPost('${p.id}')">
      <div class="top"><span class="tag" data-cat="${p.cat}">${p.cat}</span>
        <span class="title">${esc(p.title)}</span></div>
      <div class="excerpt">${esc(p.body.replace(/\n/g," "))}</div>
      <div class="meta">
        <span class="who">${esc(p.author)}</span>
        <span>${timeAgo(p.created)}</span>
        <i>👁 ${p.views}</i><i>❤ ${p.likes}</i><i>💬 ${p.comments.length}</i>
        <button class="report-btn" onclick="event.stopPropagation();App.reportPost('${p.id}')" title="부적절한 글 신고">🚩 신고</button>
      </div>
    </div>`;
  }

  /* ---------- 투표 렌더 ---------- */
  function pollHtml(p, u){
    const voted = Store.hasVoted(p.id, u.id);
    const total = p.options.reduce((n,o)=>n+o.votes,0);
    return `<div class="poll">
      <div class="poll-head">🗳️ 익명 투표 ${voted?`· <b>${total}명</b> 참여`:`· 선택지를 눌러 투표하세요`}</div>
      ${p.options.map((o,i)=>{
        const pct = total? Math.round(o.votes/total*100):0;
        if(voted){
          return `<div class="poll-opt voted">
            <div class="poll-bar" style="width:${pct}%;"></div>
            <span class="poll-txt">${esc(o.text)}</span>
            <span class="poll-pct">${pct}% <span class="poll-cnt">(${o.votes})</span></span>
          </div>`;
        }
        return `<button class="poll-opt clickable" onclick="App.vote('${p.id}',${i})">
          <span class="poll-txt">${esc(o.text)}</span><span class="poll-go">투표 →</span></button>`;
      }).join("")}
      ${voted?`<div class="poll-foot">이미 투표에 참여했어요. (익명이라 누가 뭘 골랐는지는 아무도 볼 수 없어요)</div>`:""}
    </div>`;
  }
  function vote(id, idx){
    const u=Store.currentUser(); if(!u) return openLogin();
    const res=Store.vote(id, idx, u.id);
    if(res.already) toast("이미 투표했어요.");
    renderDetail();
  }

  /* ---------- 상세 ---------- */
  function renderDetail(){
    const p=Store.get(cur.postId); const u=Store.currentUser();
    if(!p){ cur.view="list"; return render(); }
    const liked=Store.hasLiked(p.id,u.id);
    let html=`<div class="detail">
      <a class="back" onclick="App.backToList()">← ${p.cat} 목록으로</a>
      <div class="top" style="display:flex;gap:8px;align-items:center;">
        <span class="tag" data-cat="${p.cat}">${p.cat}</span></div>
      <h1>${p.pinned?"📌 ":""}${esc(p.title)}</h1>
      <div class="d-meta">
        <span class="who">${esc(p.author)}</span>
        <span>${timeAgo(p.created)}</span>
        <span>👁 조회 ${p.views}</span>
        <button class="report-btn" onclick="App.reportPost('${p.id}')" title="부적절한 글 신고">🚩 신고</button>
      </div>
      <div class="body">${esc(p.body)}</div>
      ${p.options ? pollHtml(p, u) : ""}
      <div class="like-row">
        <button class="btn-like ${liked?"on":""}" onclick="App.like('${p.id}')">
          <span class="heart">${liked?"❤️":"🤍"}</span> 좋아요 <span id="likeCount">${p.likes}</span>
        </button>
      </div>
      ${commentsHtml(p)}
    </div>`;
    $("#app").innerHTML=html;
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function commentsHtml(p){
    const u=Store.currentUser();
    return `<div class="comments">
      <h3>💬 댓글 ${p.comments.length}</h3>
      ${p.comments.map(c=>`
        <div class="comment">
          <div class="avatar">${esc(initial(c.who))}</div>
          <div class="c-body">
            <div class="c-top"><span class="c-who">${esc(c.who)}</span><span class="c-time">${timeAgo(c.time)}</span></div>
            <div class="c-text">${esc(c.text)}</div>
          </div>
        </div>`).join("")}
      <div class="comment-write">
        <input class="input" id="commentInput" placeholder="따뜻한 댓글을 남겨주세요"
          onkeydown="if(event.key==='Enter')App.addComment('${p.id}')">
        <button onclick="App.addComment('${p.id}')">등록</button>
      </div>
    </div>`;
  }

  /* ---------- 로그인 ---------- */
  function openLogin(){
    const body = IS_TEACHER ? `
      <p class="sub">성함과 담당을 입력하면 공지 작성과 댓글을 이용할 수 있어요.</p>
      <label class="field"><span class="lab">성함</span>
        <input class="input" id="loginName" placeholder="예시: 김하랑 선생님" maxlength="15"></label>
      <label class="field"><span class="lab">담당 (학년·반 / 과목)</span>
        <input class="input" id="loginSid" placeholder="예시: 1학년 1반 담임교사" maxlength="30"
          onkeydown="if(event.key==='Enter')App.doLogin()"></label>` : `
      <p class="sub">이름과 학반으로 로그인하면 글과 댓글을 이용할 수 있어요.</p>
      <label class="field"><span class="lab">이름</span>
        <input class="input" id="loginName" placeholder="예시: 김하랑" maxlength="10"></label>
      <label class="field"><span class="lab">학반 (또는 비밀번호)</span>
        <input class="input" id="loginSid" placeholder="예시: 1학년 1반" maxlength="20"
          onkeydown="if(event.key==='Enter')App.doLogin()"></label>`;
    openModal(`<div class="modal-pad">
      <button class="modal-close" onclick="App.closeModal()">×</button>
      <h2>${IS_TEACHER ? "교사 로그인" : "로그인"}</h2>
      ${body}
      <div class="form-err" id="loginErr"></div>
      <button class="btn-primary blue" onclick="App.doLogin()">로그인</button>
    </div>`);
    setTimeout(()=>$("#loginName")&&$("#loginName").focus(),100);
  }
  // 교사 표시 이름
  //  · 성함에 '선생님'을 쓴 경우:  "김하랑 선생님" + "1학년 1반 담임교사" → "1학년 1반 김하랑 선생님"
  //  · 성함에 '선생님'을 안 쓴 경우: "김하랑" + "1학년 1반 담임교사" → "1학년 1반 담임교사 김하랑"
  function teacherName(name, dept){
    const nm = (name||"").trim();
    const dp = (dept||"").trim();
    const hasHonorific = /(선생님|쌤|샘)/.test(nm);
    if(hasHonorific){
      const role = dp.replace(/(담임교사|교과전담교사|교과전담|전담교사|담임샘|담임|전담|교사|선생님|샘|쌤)\s*$/,"").trim();
      return (role ? role + " " : "") + nm;
    }
    // 선생님을 안 붙였으면 담당(담임교사 등)을 그대로 살려서 표기
    return (dp ? dp + " " : "") + nm;
  }
  function doLogin(){
    const raw=($("#loginName").value||"").trim();
    const sid=($("#loginSid").value||"").trim();
    if(raw.length<2){ $("#loginErr").textContent = IS_TEACHER ? "성함을 입력해 주세요." : "이름을 두 글자 이상 입력해 주세요."; return; }
    if(sid.length<2){ $("#loginErr").textContent = IS_TEACHER ? "담당(학년·반 또는 과목)을 입력해 주세요." : "학반(또는 비밀번호)을 입력해 주세요."; return; }
    if(Moderation.checkProfanity(raw).profane || Moderation.checkProfanity(sid).profane){
      $("#loginErr").textContent="사용할 수 없는 표현이 있어요."; return; }
    const displayName = IS_TEACHER ? teacherName(raw, sid) : raw;
    Store.login(displayName, sid);
    closeModal(); render();
    toast(`${displayName}님, 환영해요! ${IS_TEACHER?"🍎":"🌱"}`);
  }
  function logout(){ Store.logout(); cur.view="list"; render(); toast("로그아웃 되었어요."); }

  /* ---------- 열람 (로그인 게이트) ---------- */
  function openPost(id){
    const u=Store.currentUser();
    if(!u){
      openLogin();
      setTimeout(()=>{ const e=$("#loginErr"); if(e) e.textContent="🔒 글을 보려면 먼저 로그인해 주세요."; },120);
      return;
    }
    const p=Store.get(id);
    if(p && p.hidden){ toast("신고가 많이 접수되어 숨김 처리된 글이에요."); cur.view="list"; render(); return; }
    Store.addView(id);
    cur.view="detail"; cur.postId=id; render();
  }
  function backToList(){ cur.view="list"; render(); }
  function goHome(){ cur={cat:"공지",view:"list",postId:null}; render(); }
  function selectCat(c){ cur.cat=c; cur.view="list"; render(); }

  function like(id){
    const u=Store.currentUser(); if(!u) return openLogin();
    const on=Store.toggleLike(id,u.id);
    renderDetail();
  }

  function addComment(id){
    const u=Store.currentUser(); if(!u) return openLogin();
    const inp=$("#commentInput"); const text=(inp.value||"").trim();
    if(!text) return;
    if(Moderation.checkProfanity(text).profane){
      inp.value=""; inp.placeholder="⚠ 바르고 고운 말로 다시 써주세요";
      inp.classList.add("shake"); setTimeout(()=>inp.classList.remove("shake"),400);
      return;
    }
    Store.addComment(id,u.name,text);
    renderDetail();
  }

  /* ---------- 글쓰기 (게이트 + 검열) ---------- */
  function tryWrite(){
    const u=Store.currentUser();
    if(!u){ openLogin(); setTimeout(()=>{const e=$("#loginErr");if(e)e.textContent="🔒 글을 쓰려면 먼저 로그인해 주세요.";},120); return; }
    openWrite();
  }
  function openWrite(){
    const startCat = WRITE_CATS.includes(cur.cat) ? cur.cat : WRITE_CATS[0];
    const catField = `
      <label class="field"><span class="lab">게시판</span>
        <div class="cat-choose">
          ${WRITE_CATS.map(c=>`<label><input type="radio" name="wcat" value="${c}" ${c===startCat?"checked":""} onclick="App.onCatChange()">
            <span class="chip" data-cat="${c}">${CAT_ICON[c]} ${c}</span></label>`).join("")}
        </div></label>`;
    const teacherNote = IS_TEACHER ? `
      <div class="teacher-note" id="teacherNote" style="display:none;">📌 반 안의 일보단 <b>학년·학교 전체 대상인 글</b>만 이곳에 작성 부탁드립니다!</div>` : "";
    // 투표 선택지 (최대 5개, 직접 작성)
    const voteField = `
      <div class="field" id="voteOptions" style="display:none;">
        <span class="lab">투표 선택지 <span style="color:var(--faint);font-weight:400;">(2~5개, 익명 투표)</span></span>
        ${[1,2,3,4,5].map(i=>`<input class="input vote-opt" id="vopt${i}" style="margin-bottom:8px;"
          placeholder="선택지 ${i}${i<=2?" (필수)":" (선택)"}" maxlength="30">`).join("")}
      </div>`;
    openModal(`<div class="modal-pad" id="writeBody">
      <button class="modal-close" onclick="App.closeModal()">×</button>
      <h2>${IS_TEACHER ? "글쓰기 (교사)" : "글쓰기"}</h2>
      <p class="sub">바르고 고운 말로, 서로 존중하며 써주세요 🌱</p>
      ${catField}
      ${teacherNote}
      <label class="field"><span class="lab">제목</span>
        <input class="input" id="wTitle" placeholder="제목을 입력하세요" maxlength="60"></label>
      ${voteField}
      <label class="field"><span class="lab">내용</span>
        <textarea class="textarea" id="wBody" placeholder="내용을 입력하세요"></textarea></label>
      <div class="form-err" id="wErr"></div>
      <button class="btn-primary" onclick="App.submitPost()">✏️ 올리기</button>
    </div>`);
    onCatChange();
    setTimeout(()=>$("#wTitle")&&$("#wTitle").focus(),100);
  }
  function onCatChange(){
    const catEl=document.querySelector('input[name="wcat"]:checked');
    const cat=catEl?catEl.value:WRITE_CATS[0];
    const vo=$("#voteOptions"); if(vo) vo.style.display = (cat==="투표")?"block":"none";
    const tn=$("#teacherNote"); if(tn) tn.style.display = (cat==="공지")?"block":"none";
    const bodyEl=$("#wBody");
    if(bodyEl) bodyEl.placeholder = (cat==="투표") ? "투표 설명을 적어주세요 (선택지는 위에서 입력)" : "내용을 입력하세요";
  }

  async function submitPost(){
    const title=($("#wTitle").value||"").trim();
    const body=($("#wBody").value||"").trim();
    const catEl=document.querySelector('input[name="wcat"]:checked') || document.querySelector('input[name="wcat"]');
    let cat=catEl?catEl.value:WRITE_CATS[0];
    // 안전장치: 학생은 공지 작성 불가
    if(cat==="공지" && !IS_TEACHER) cat="자유게시판";
    const err=$("#wErr");
    if(title.length<2){ err.textContent="제목을 두 글자 이상 입력해 주세요."; return; }

    // 투표 선택지 수집
    let options = null;
    if(cat==="투표"){
      options = [1,2,3,4,5].map(i=>{ const el=$("#vopt"+i); return el?(el.value||"").trim():""; }).filter(x=>x);
      if(options.length<2){ err.textContent="투표 선택지를 2개 이상 입력해 주세요."; return; }
    } else if(body.length<2){
      err.textContent="내용을 입력해 주세요."; return;
    }

    // 1) 욕설 필터 (제목·내용·선택지 전부)
    const allText = [title, body].concat(options||[]).join(" ");
    if(Moderation.checkProfanity(allText).profane){
      err.textContent="바르고 고운 말로 다시 써주세요.";
      $("#writeBody").classList.add("shake"); setTimeout(()=>$("#writeBody").classList.remove("shake"),400);
      return;
    }

    // 2) AI 검열 — 검사 중 화면
    openModal(`<div class="modal-pad"><div class="scan">
      <div class="ai-orb"></div>
      <h3>AI가 부적절한 내용이 없는지 검사하고 있어요</h3>
      <p>뒷담화·싸움·논란이 될 내용이 없는지 확인 중이에요…</p>
    </div></div>`);

    const result = await Moderation.aiReview(title, body + " " + (options||[]).join(" "));

    if(result.flagged){
      showBlocked({title,body,cat,options,category:result.category,reason:result.reason});
    }else{
      const u=Store.currentUser();
      const p=Store.addPost({cat,title,body,author:u.name,authorId:u.id,options});
      closeModal();
      cur.cat=cat; cur.view="detail"; cur.postId=p.id; Store.addView(p.id); render();
      toast(cat==="투표" ? "투표가 등록되었어요! 🗳️" : "글이 등록되었어요! 🎉");
    }
  }

  /* 차단 화면 + 오판 신고 */
  function showBlocked(data){
    openModal(`<div class="modal-pad"><div class="blocked">
      <div class="icon">🚫</div>
      <h3>부적절한 내용이 감지되었어요.</h3>
      <div class="why">${esc(data.reason)}<br><span style="color:var(--faint);font-size:12px;">(감지 항목: ${esc(data.category)})</span></div>
      <div class="appeal">
        <p class="q">AI가 잘못된 판단을 내린 것 같다면?<br>아래 버튼을 눌러 신고해 주세요. 관리자가 직접 확인할게요.</p>
        <button class="btn-appeal" id="appealBtn" onclick="App.report()">🚩 잘못된 판단 신고하기</button>
      </div>
      <div class="blocked-actions">
        <button class="edit" onclick="App.reopenWrite()">✏️ 다시 수정</button>
        <button class="cancel" onclick="App.closeModal()">닫기</button>
      </div>
    </div></div>`);
    App._blocked=data;
  }
  function report(){
    const d=App._blocked; if(!d) return;
    const u=Store.currentUser();
    Store.addReport({title:d.title, body:d.body, cat:d.cat, options:d.options,
      category:d.category, reason:d.reason, author:u?u.name:"익명", authorId:u?u.id:""});
    const btn=$("#appealBtn");
    btn.disabled=true; btn.textContent="✓ 신고 완료 — 관리자가 확인할게요";
  }
  function reopenWrite(){
    const d=App._blocked; openWrite();
    setTimeout(()=>{
      $("#wTitle").value=d.title; $("#wBody").value=d.body;
      const r=document.querySelector(`input[name="wcat"][value="${d.cat}"]`); if(r)r.checked=true;
      if(d.options){ d.options.forEach((o,i)=>{ const el=$("#vopt"+(i+1)); if(el) el.value=o; }); }
      onCatChange();
    },120);
  }

  /* ---------- 올라온 글 신고 (AI가 놓친 경우) ---------- */
  const REPORT_REASONS = ["욕설·비속어","뒷담·험담","싸움·폭력","따돌림·괴롭힘","사칭·도용","광고·도배","개인정보 노출","기타"];
  function reportPost(id){
    const u=Store.currentUser(); if(!u) return openLogin();
    const p=Store.get(id); if(!p) return;
    openModal(`<div class="modal-pad">
      <button class="modal-close" onclick="App.closeModal()">×</button>
      <h2>🚩 글 신고하기</h2>
      <p class="sub">"${esc(p.title)}"<br>이 글의 어떤 점이 문제인가요? 관리자가 확인 후 조치할게요.</p>
      <div class="cat-choose" id="reportReasons" style="margin-bottom:16px;">
        ${REPORT_REASONS.map((r,i)=>`<label><input type="radio" name="rrs" value="${r}" ${i===0?"checked":""}>
          <span class="chip" data-cat="건의함">${r}</span></label>`).join("")}
      </div>
      <label class="field"><span class="lab">자세한 내용 (선택)</span>
        <textarea class="textarea" id="reportDetail" style="min-height:80px;" placeholder="어떤 점이 부적절한지 적어주면 확인에 도움돼요."></textarea></label>
      <button class="btn-primary blue" onclick="App.submitPostReport('${id}')">신고 접수하기</button>
    </div>`);
  }
  function submitPostReport(id){
    const u=Store.currentUser(); const p=Store.get(id); if(!p) return;
    const rEl=document.querySelector('input[name="rrs"]:checked');
    const reason=(rEl?rEl.value:"기타") + ( ($("#reportDetail").value||"").trim() ? " — "+$("#reportDetail").value.trim() : "" );
    const res = Store.addPostReport({postId:id, title:p.title, cat:p.cat, reason, reporter:u.name});
    closeModal();
    if(res && res.hidden){
      toast("신고가 3건 이상 모여 이 글이 자동으로 숨겨졌어요. 관리자가 확인할게요.");
      if(cur.view==="detail" && cur.postId===id){ cur.view="list"; }
      render();
    }else{
      toast("신고가 접수됐어요. 관리자가 확인할게요. 🙏");
    }
  }

  /* ---------- 공개 API ---------- */
  global.App = {
    init(){ render(); },
    selectCat, openPost, backToList, goHome, like, addComment,
    openLogin, doLogin, logout, closeModal,
    tryWrite, submitPost, report, reopenWrite, onCatChange, vote,
    reportPost, submitPostReport,
    _blocked:null
  };
  document.addEventListener("DOMContentLoaded", ()=>App.init());
})(window);
