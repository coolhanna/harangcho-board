/* =========================================================
   admin.js — 관리자 마스터 창
   · 비밀번호 게이트  · AI 오판 신고 열람  · 글 삭제
   ========================================================= */
(function(){
  const MASTER_PW = "하랑초마스터";   // TODO: 배포 단계에서 서버측 인증으로 교체
  const $ = s=>document.querySelector(s);
  function esc(s){ return (s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function timeAgo(t){ const dt=new Date(t); return `${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`; }
  function toast(msg){ const el=$("#toast"); el.textContent=msg; el.classList.add("show");
    clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove("show"),2000); }

  let authed=false, tab="reports";

  function gate(){
    $("#adminApp").innerHTML=`<div class="gate">
      <div class="lock">🔒</div>
      <h2>관리자 인증</h2>
      <p>마스터 비밀번호를 입력해야 신고 내역과 관리 기능을 볼 수 있어요.</p>
      <label class="field"><input class="input" id="pw" type="text" autocomplete="off"
        style="-webkit-text-security:disc;text-security:disc;" placeholder="마스터 비밀번호 (한글 가능)"
        onkeydown="if(event.key==='Enter')Admin.unlock()"></label>
      <div class="form-err" id="pwErr"></div>
      <button class="btn-primary blue" onclick="Admin.unlock()">입장하기</button>
    </div>`;
    setTimeout(()=>$("#pw")&&$("#pw").focus(),100);
  }
  function unlock(){
    if($("#pw").value===MASTER_PW){ authed=true; $("#masterBadge").style.display="inline-block"; render(); }
    else $("#pwErr").textContent="비밀번호가 올바르지 않아요.";
  }

  function render(){
    if(!authed) return gate();
    const reports=Store.reports();
    const pending=reports.filter(r=>r.status==="대기").length;
    let html=`<div class="admin-tabs">
      <button class="${tab==="reports"?"active":""}" onclick="Admin.setTab('reports')">
        🚩 AI 오판 신고 ${pending?`<span class="badge">${pending}</span>`:""}</button>
      <button class="${tab==="posts"?"active":""}" onclick="Admin.setTab('posts')">🗂️ 글 관리</button>
    </div>`;
    html += tab==="reports" ? reportsHtml(reports) : postsHtml();
    $("#adminApp").innerHTML=html;
  }

  function reportsHtml(reports){
    if(reports.length===0)
      return `<div class="empty"><div class="e-ico">📭</div><p>아직 접수된 신고가 없어요.</p>
        <p style="font-size:13px;color:var(--faint);margin-top:6px;">학생이 올라온 글을 '🚩 신고'하거나, AI 차단을 '오판 신고'하면 여기에 나타나요.</p></div>`;
    return reports.map(r=> r.type==="post" ? postReportCard(r) : aiReportCard(r) ).join("");
  }

  // 학생이 올라온 글을 신고한 경우
  function postReportCard(r){
    const post = Store.get(r.postId);
    const exists = !!post;
    const cnt = Store.reportCountForPost(r.postId);
    return `<div class="rep-card">
      <div class="rc-top">
        <span class="rc-cat">${esc(r.cat)}</span>
        <span class="rc-flag" style="background:#FEF3D9;color:#8A5A00;">🚩 학생 신고 (누적 ${cnt}건)</span>
        ${post&&post.hidden?`<span class="rc-flag">🚫 자동 숨김됨</span>`:""}
        <span class="rc-status">${r.status==="대기"?"🔴 확인 대기":"✅ 확인함"} · ${timeAgo(r.time)}</span>
      </div>
      <h3>${esc(r.title)}</h3>
      <div class="rc-reason">신고 사유: <b>${esc(r.reportReason)}</b></div>
      <div class="rc-meta">신고자: ${esc(r.reporter)}${exists?"":" · <span style='color:#C23B3B;'>(이미 삭제된 글)</span>"}</div>
      <div class="rep-actions">
        ${exists?`<button class="del" onclick="Admin.delReportedPost('${r.postId}','${r.id}')">🗑️ 이 글 삭제</button>`:""}
        ${r.status==="대기"?`<button class="ok" onclick="Admin.resolve('${r.id}')">✓ 문제없음(확인)</button>`:""}
        <button class="del" style="background:var(--cream);color:var(--muted);" onclick="Admin.delReport('${r.id}')">신고 지우기</button>
      </div>
    </div>`;
  }

  // AI 차단을 학생이 '오판'이라고 신고한 경우
  function aiReportCard(r){
    const statusTxt = r.status==="대기" ? "🔴 확인 대기"
      : r.status==="게시됨" ? "✅ 승인·게시함"
      : r.status==="차단유지" ? "⛔ 차단 유지함" : "✅ 확인함";
    const opts = r.options ? `<div class="rc-reason">투표 선택지: ${r.options.map(o=>esc(o.text||o)).join(" / ")}</div>` : "";
    return `<div class="rep-card">
      <div class="rc-top">
        <span class="rc-cat">${esc(r.cat)}</span>
        <span class="rc-flag">AI 차단 오판신고: ${esc(r.aiCategory)}</span>
        <span class="rc-status">${statusTxt} · ${timeAgo(r.time)}</span>
      </div>
      <h3>${esc(r.title)}</h3>
      <div class="rc-body">${esc(r.body)}</div>
      ${opts}
      <div class="rc-reason">AI 판단 사유: <b>${esc(r.aiReason)}</b></div>
      <div class="rc-meta">신고자(작성자): ${esc(r.author)}</div>
      <div class="rep-actions">
        ${r.status==="대기"?`<button class="ok" style="background:var(--green-soft);color:var(--green-ink);" onclick="Admin.approve('${r.id}')">✅ 승인해서 게시</button>`:""}
        ${r.status==="대기"?`<button class="del" style="background:var(--cream);color:var(--muted);" onclick="Admin.reject('${r.id}')">⛔ 차단 유지</button>`:""}
        <button class="del" onclick="Admin.delReport('${r.id}')">신고 삭제</button>
      </div>
    </div>`;
  }

  function postsHtml(){
    const cats=Store.CATS; let out="";
    cats.forEach(c=>{
      const posts=Store.postsByCat(c, true); // 숨겨진 글 포함
      out+=`<div class="list-head" style="margin-top:18px;"><div class="tag" data-cat="${c}">${c}</div>
        <div class="count">${posts.length}개</div></div>`;
      out+=posts.map(p=>`<div class="post-row"${p.hidden?' style="border-color:#F0997B;background:#FEF6F4;"':''}>
        <div><div class="pr-title">${p.hidden?'<span style="color:#C23B3B;">🚫 [숨김] </span>':''}${p.pinned?"📌 ":""}${esc(p.title)}</div>
          <div class="pr-meta">${esc(p.author)} · 👁 ${p.views} · ❤ ${p.likes} · 💬 ${p.comments.length}${p.hidden?` · <span style="color:#C23B3B;font-weight:700;">신고 ${Store.reportCountForPost(p.id)}건으로 자동 숨김</span>`:''}</div></div>
        ${p.hidden?`<button class="ok" style="flex-shrink:0;" onclick="Admin.restore('${p.id}')">↩ 복구</button>`:''}
        <button class="del" onclick="Admin.delPost('${p.id}','${esc(p.title).replace(/'/g,"")}')">삭제</button>
      </div>`).join("") || `<div style="color:var(--faint);font-size:13px;padding:6px 2px;">글 없음</div>`;
    });
    return out;
  }

  window.Admin={
    unlock, setTab(t){ tab=t; render(); },
    resolve(id){ Store.resolveReport(id); render(); toast("확인 처리했어요."); },
    approve(id){ const p=Store.approveReport(id); render(); toast(p?"승인 완료 — 글이 게시판에 올라갔어요! ✅":"게시할 수 없어요."); },
    reject(id){ Store.rejectReport(id); render(); toast("차단을 유지했어요."); },
    delReport(id){ Store.deleteReport(id); render(); toast("신고를 삭제했어요."); },
    restore(id){ Store.restorePost(id); render(); toast("글을 다시 보이게 했어요."); },
    delReportedPost(postId, reportId){
      if(confirm("신고된 이 글을 삭제할까요? 되돌릴 수 없어요.")){
        Store.deletePost(postId); Store.resolveReport(reportId); render(); toast("글을 삭제하고 신고를 처리했어요.");
      }
    },
    delPost(id,title){ if(confirm(`이 글을 삭제할까요?\n\n"${title}"`)){ Store.deletePost(id); render(); toast("글을 삭제했어요."); } }
  };
  document.addEventListener("DOMContentLoaded", render);
})();
