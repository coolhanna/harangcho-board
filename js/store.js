/* =========================================================
   store.js — 데이터 저장소 (localStorage 기반)
   글 / 댓글 / 좋아요 / 조회수 / 신고 / 로그인 상태 관리
   (3단계에서 Supabase로 교체 예정)
   ========================================================= */
(function(global){
  const KEY = "harang_board_v1";
  const CATS = ["공지","자유게시판","건의함","투표"];

  function now(){ return Date.now(); }
  function uid(){ return "p" + Math.random().toString(36).slice(2,9); }

  /* ---- 시드(가짜) 데이터 ---- */
  function seed(){
    const t = now();
    const day = 86400000;
    return {
      posts:[
        { id:uid(), cat:"공지", title:"하랑초 소통 게시판 규칙 (필독!)",
          body:"안녕하세요! 하랑초 소통 게시판에 오신 것을 환영해요. 🌱\n모두가 즐겁게 이용할 수 있도록 아래 규칙을 꼭 지켜주세요.\n\n1. 서로 예의를 지켜요\n이곳은 1학년부터 6학년까지 전교생과 선생님들이 함께 이용하는 공간이에요. 나이와 상관없이 서로 존중하고 예의를 지켜주세요.\n\n2. AI가 글을 검사해요\n글을 올리면 AI가 잠깐 부적절한 내용이 없는지 검사해요. 뒷담화·싸움·논란이 될 내용이 있으면 자동으로 등록이 막혀요.\n\n3. 잘못 막혔다면 신고하세요\n적절한 글인데 '부적절한 내용'으로 잘못 막혔다면, 그 화면의 신고하기 버튼을 눌러주세요. 관리자가 빠른 시일 내에 확인할게요.\n\n4. 부적절한 글을 봤다면 🚩신고\n욕설·뒷담·사칭 등 부적절한 글을 발견하면 글 옆의 🚩신고 버튼을 눌러주세요. 신고가 여러 건 모이면 그 글은 자동으로 숨겨져요.\n\n5. 욕설·비속어 금지\n욕이나 비속어(초성 포함)는 절대 쓰지 말아주세요. 자동으로 차단돼요.\n\n6. 사칭(도용) 금지\n다른 사람인 척 이름을 도용하지 마세요. 사칭은 신고 대상이에요.\n\n바르고 고운 말로, 함께 만드는 따뜻한 게시판이 되었으면 좋겠어요. 😊",
          author:"게시판 운영진", authorId:"admin", pinned:true,
          created:t, views:512, likes:47, likedBy:[], comments:[] },
        { id:uid(), cat:"공지", title:"2학기 개학 및 여름방학 안전 수칙 안내",
          body:"즐거운 여름방학 보내고 있나요?\n\n방학 중 물놀이 안전, 교통 안전에 꼭 유의해 주세요. 2학기 개학은 8월 21일(금)입니다. 개학날 준비물은 학급 알림장을 확인해 주세요.\n\n건강하게 다시 만나요!",
          author:"교장 선생님", authorId:"admin", pinned:true,
          created:t-2*day, views:342, likes:24, likedBy:[], comments:[
            {who:"3학년 이서준", text:"넵! 안전하게 놀다 올게요 :)", time:t-1.5*day},
            {who:"5학년 박하은", text:"개학 기다려져요~", time:t-1*day}
          ]},
        { id:uid(), cat:"공지", title:"도서관 운영 시간 변경 안내",
          body:"방학 동안 도서관은 오전 9시~오후 1시까지 운영합니다. 책 반납은 1층 반납함을 이용해 주세요.",
          author:"도서관", authorId:"admin", pinned:false,
          created:t-5*day, views:120, likes:8, likedBy:[], comments:[] },

        { id:uid(), cat:"자유게시판", title:"오늘 급식 진짜 최고였음 🍚",
          body:"돈까스에 크림스프까지... 오늘 급식 드신 분 손!! 다음에 또 나왔으면 좋겠어요.",
          author:"4학년 김하랑", authorId:"u_harang", pinned:false,
          created:t-6*3600000, views:88, likes:12, likedBy:[], comments:[
            {who:"4학년 최민서", text:"인정.. 돈까스 두 개 먹음", time:t-5*3600000},
            {who:"6학년 정예린", text:"부럽다 우리반은 다 떨어졌었는데", time:t-3*3600000},
            {who:"4학년 김하랑", text:"헐 일찍 가야됨 ㅋㅋ", time:t-2*3600000}
          ]},
        { id:uid(), cat:"자유게시판", title:"방학숙제 다 한 사람 있어요?",
          body:"저는 독후감만 남았는데.. 다들 어디까지 했나요? 같이 힘내요 💪",
          author:"5학년 한지우", authorId:"u_jiwoo", pinned:false,
          created:t-1*day, views:64, likes:5, likedBy:[], comments:[
            {who:"5학년 오지호", text:"저는 아직 시작도 못했어요 ㅠㅠ", time:t-20*3600000}
          ]},

        { id:uid(), cat:"건의함", title:"운동장에 그늘막을 설치해 주세요",
          body:"점심시간에 운동장에서 놀 때 너무 더워요. 벤치 쪽에 그늘막이 있으면 좋겠습니다. 많은 친구들이 원하고 있어요!",
          author:"6학년 강도윤", authorId:"u_doyoon", pinned:false,
          created:t-3*day, views:156, likes:31, likedBy:[], comments:[
            {who:"학생회", text:"좋은 의견 감사합니다. 회의 때 안건으로 올릴게요!", time:t-2*day}
          ]},
        { id:uid(), cat:"건의함", title:"화장실 비누를 자주 채워주세요",
          body:"손 씻으려는데 비누가 자주 비어 있어요. 위생을 위해 신경 써주시면 감사하겠습니다.",
          author:"3학년 윤서아", authorId:"u_seoa", pinned:false,
          created:t-4*day, views:98, likes:19, likedBy:[], comments:[] },

        { id:uid(), cat:"투표", title:"[투표] 가을 학예회 반 공연 주제 정하기",
          body:"우리 반 학예회 공연 무엇으로 할까요? 익명 투표예요. 의견은 댓글로 남겨주세요!",
          author:"학생회장", authorId:"u_president", pinned:false,
          created:t-12*3600000, views:210, likes:15, likedBy:[],
          options:[{text:"합창",votes:5},{text:"연극",votes:8},{text:"댄스",votes:14},{text:"사물놀이",votes:3}], votedBy:[],
          comments:[
            {who:"5학년 임채원", text:"댄스 가자!!", time:t-10*3600000},
            {who:"5학년 서준우", text:"저는 연극이요 🎭", time:t-8*3600000}
          ]}
      ],
      reports:[],      // AI 오판 신고 (관리자만 열람)
      session:null     // 로그인 사용자
    };
  }

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw){ const s = seed(); save(s); return s; }
      return JSON.parse(raw);
    }catch(e){ const s = seed(); save(s); return s; }
  }
  function save(db){ localStorage.setItem(KEY, JSON.stringify(db)); }

  let db = load();

  const Store = {
    CATS,
    reset(){ db = seed(); save(db); },

    /* 세션 */
    currentUser(){ return db.session; },
    login(name, sid){
      db.session = { name, sid, id:"u_"+sid };
      save(db); return db.session;
    },
    logout(){ db.session = null; save(db); },

    /* 글 */
    postsByCat(cat, includeHidden){
      return db.posts
        .filter(p=>p.cat===cat && (includeHidden || !p.hidden))
        .sort((a,b)=> (b.pinned?1:0)-(a.pinned?1:0) || b.created-a.created);
    },
    /* 한 글에 대한 서로 다른 신고자 수 */
    reportCountForPost(postId){
      return new Set(db.reports.filter(r=>r.type==="post" && r.postId===postId).map(r=>r.reporter)).size;
    },
    restorePost(id){ const p=this.get(id); if(p){ p.hidden=false; } save(db); },
    get(id){ return db.posts.find(p=>p.id===id); },
    countByCat(cat){ return db.posts.filter(p=>p.cat===cat).length; },
    totalPosts(){ return db.posts.length; },
    totalComments(){ return db.posts.reduce((n,p)=>n+p.comments.length,0); },

    addPost({cat,title,body,author,authorId,options}){
      const p = { id:uid(), cat, title, body, author, authorId,
        pinned:false, created:now(), views:0, likes:0, likedBy:[], comments:[] };
      if(options && options.length){ p.options = options.map(t=>({text:t, votes:0})); p.votedBy = []; }
      db.posts.unshift(p); save(db); return p;
    },

    /* 익명 투표 — 1인 1표, 누가 뭘 골랐는지는 저장하지 않고 집계만 */
    vote(id, idx, userId){
      const p=this.get(id);
      if(!p || !p.options) return {ok:false};
      p.votedBy = p.votedBy || [];
      if(p.votedBy.includes(userId)) return {ok:false, already:true};
      if(idx<0 || idx>=p.options.length) return {ok:false};
      p.options[idx].votes++; p.votedBy.push(userId); save(db);
      return {ok:true};
    },
    hasVoted(id, userId){ const p=this.get(id); return !!(p && p.votedBy && p.votedBy.includes(userId)); },
    deletePost(id){ db.posts = db.posts.filter(p=>p.id!==id); save(db); },

    addView(id){ const p=this.get(id); if(p){ p.views++; save(db);} },
    toggleLike(id, userId){
      const p=this.get(id); if(!p) return;
      p.likedBy = p.likedBy||[];
      const i = p.likedBy.indexOf(userId);
      if(i>=0){ p.likedBy.splice(i,1); p.likes=Math.max(0,p.likes-1); }
      else{ p.likedBy.push(userId); p.likes++; }
      save(db); return i<0;
    },
    hasLiked(id, userId){ const p=this.get(id); return p && (p.likedBy||[]).includes(userId); },

    addComment(id, who, text){
      const p=this.get(id); if(!p) return;
      p.comments.push({who, text, time:now()}); save(db);
    },

    /* AI 오판 신고 (관리자 전용) */
    addReport({title, body, cat, category, reason, author, authorId, options}){
      db.reports.unshift({
        id:uid(), type:"ai", title, body, cat, options:options||null,
        aiCategory:category, aiReason:reason,
        author, authorId:authorId||"", time:now(), status:"대기"
      });
      save(db);
    },
    /* 관리자가 오판 신고를 승인 → 막혔던 글을 실제로 게시 */
    approveReport(id){
      const r = db.reports.find(x=>x.id===id);
      if(!r || r.type!=="ai") return null;
      const p = this.addPost({ cat:r.cat, title:r.title, body:r.body,
        author:r.author||"작성자", authorId:r.authorId||"admin", options:r.options });
      r.status = "게시됨";
      save(db);
      return p;
    },
    /* 오판 신고 반려 (차단 유지) */
    rejectReport(id){ const r=db.reports.find(x=>x.id===id); if(r){ r.status="차단유지"; } save(db); },
    /* 학생이 올라온 글을 직접 신고 (AI가 놓친 경우) */
    addPostReport({postId, title, cat, reason, reporter}){
      db.reports.unshift({
        id:uid(), type:"post", postId, title, cat, reportReason:reason,
        reporter, time:now(), status:"대기"
      });
      // 서로 다른 신고자 3명 이상이면 자동으로 글 숨김
      const count = this.reportCountForPost(postId);
      const p = this.get(postId);
      if(p && count>=3){ p.hidden = true; }
      save(db);
      return { count, hidden: !!(p && p.hidden) };
    },
    reports(){ return db.reports; },
    resolveReport(id){ const r=db.reports.find(x=>x.id===id); if(r){r.status="확인";} save(db); },
    deleteReport(id){ db.reports = db.reports.filter(x=>x.id!==id); save(db); }
  };

  global.Store = Store;
})(window);
