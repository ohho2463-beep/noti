export type SiteLang = "ko" | "en" | "es";

const STORAGE_KEY = "noti_site_lang";

export function readStoredLang(): SiteLang | null {
  if (typeof window === "undefined") {
    return null;
  }
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === "ko" || v === "en" || v === "es") {
    return v;
  }
  return null;
}

export function writeStoredLang(lang: SiteLang) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, lang);
}

export type SiteCopy = {
  nav: { signIn: string; startFree: string; openApp: string };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  pills: string[];
  pillars: { kicker: string; title: string; body: string }[];
  /** 랜딩 하단 미니 링크(대시보드·운영 등) */
  teasers: { title: string; body: string; href: string }[];
  stack: { title: string; items: string[] };
  footer: string;
  legal: { terms: string; privacy: string };
  /** 회원가입 필수 동의 문구(체크박스 옆) */
  signupAgree: string;
  signupAgreeRequired: string;
  authLogin: {
    kicker: string;
    title: string;
    lead: string;
    bullets: string[];
    formTitle: string;
    formHint: string;
    noAccount: string;
    register: string;
  };
  authSignup: {
    kicker: string;
    title: string;
    lead: string;
    bullets: string[];
    formTitle: string;
    formHint: string;
    hasAccount: string;
    signIn: string;
  };
};

export const SITE_COPY: Record<SiteLang, SiteCopy> = {
  ko: {
    nav: {
      signIn: "로그인",
      startFree: "무료로 시작",
      openApp: "앱 열기",
    },
    hero: {
      eyebrow: "NOTI WORKSPACE",
      title: "범용 문서가 아니라, 실행·마감까지 잇는 팀 운영 허브.",
      subtitle:
        "Noti는 문서를 자유 조합하는 범용 워크스페이스가 아니라, 조직·프로젝트·일정·태스크가 같은 타임라인과 감사 로그로 이어지는 운영 허브입니다. 대시보드에서 한눈에 상태를 보고, 운영 센터에서는 자동화 성공률·미해결 일정 충돌·다가오는 경매 일정을 같은 화면에서 다루며, Executive 뷰로 주간 리스크와 실행 지표를 묶어 봅니다. 워크스페이스 단위 구독·좌석으로 팀 규모와 비용을 정렬할 수 있어, “페이지를 많이 만든다”가 아니라 실행·마감·정리까지 이어지는 팀 운영에 초점을 둡니다.",
      ctaPrimary: "NOTI로 시작",
      ctaSecondary: "로그인",
    },
    pills: [
      "대시보드 스냅샷",
      "활동 타임라인·감사",
      "운영 센터",
      "Executive 뷰",
      "일정 충돌·자동화",
      "경매 일정",
      "캘린더",
      "워크스페이스 플랜·좌석(프리뷰)",
      "조직·프로젝트",
      "문서·칸반·검색",
      "RLS 보안",
    ],
    pillars: [
      {
        kicker: "Pulse",
        title: "대시보드와 활동 타임라인",
        body: "문서·일정·프로젝트·태스크·감사 로그를 한 흐름으로 묶어 상태를 놓치지 않습니다.",
      },
      {
        kicker: "Ops",
        title: "운영 센터 · Executive",
        body: "자동화 성공률, 미해결 일정 충돌, 주간 리스크와 실행 지표로 운영·SLA 관점을 붙입니다.",
      },
      {
        kicker: "Field",
        title: "일정 · 경매 · 캘린더",
        body: "입찰·경매 일정을 스케줄에 두고 캘린더로 가시화합니다. 플랜·좌석은 팀 규모에 맞출 수 있으며, 결제 연동 전에는 프리뷰 전환을 제공합니다.",
      },
    ],
    teasers: [
      {
        title: "대시보드",
        body: "스냅샷과 활동 타임라인으로 한눈에.",
        href: "/dashboard",
      },
      {
        title: "운영 센터",
        body: "자동화·충돌·경매 일정을 한 화면에서.",
        href: "/dashboard/ops",
      },
      {
        title: "캘린더",
        body: "일정 유형(경매 등)과 주간 뷰.",
        href: "/dashboard/calendar",
      },
    ],
    stack: {
      title: "기술 스택",
      items: ["Next.js 15", "Supabase Auth · RLS", "Tailwind · shadcn 스타일", "한글 Pretendard"],
    },
    footer: "Noti · Next + Supabase",
    legal: {
      terms: "이용약관",
      privacy: "개인정보 처리방침",
    },
    signupAgree: "이용약관 및 개인정보 처리방침을 읽었으며 이에 동의합니다.",
    signupAgreeRequired: "약관 및 개인정보 처리방침에 동의해 주세요.",
    authLogin: {
      kicker: "WELCOME BACK",
      title: "다시 오신 것을 환영합니다.",
      lead: "대시보드·운영·일정을 한 워크스페이스에서 이어가세요.",
      bullets: [
        "Pulse · 스냅샷과 활동 타임라인",
        "Ops · 운영 센터와 Executive 지표",
        "기본기 · 문서·칸반·검색·알림",
      ],
      formTitle: "로그인",
      formHint: "이메일과 비밀번호로 계속합니다.",
      noAccount: "아직 계정이 없나요?",
      register: "회원가입",
    },
    authSignup: {
      kicker: "CREATE YOUR HUB",
      title: "지금 바로 허브를 만드세요.",
      lead: "가입 후 대시보드·운영·일정·조직·프로젝트를 바로 쓸 수 있습니다.",
      bullets: [
        "팀 운영 · 타임라인과 감사 로그",
        "스타터 · 무료로 시작",
        "프라이버시 · Supabase와 RLS",
      ],
      formTitle: "회원가입",
      formHint: "이름·이메일·비밀번호로 계정을 만듭니다.",
      hasAccount: "이미 계정이 있나요?",
      signIn: "로그인",
    },
  },
  en: {
    nav: {
      signIn: "Sign in",
      startFree: "Start free",
      openApp: "Open app",
    },
    hero: {
      eyebrow: "NOTI WORKSPACE",
      title: "Not a generic doc canvas—a hub for running the team.",
      subtitle:
        "Noti is not an everything-bucket workspace. Orgs, projects, schedules, and tasks connect through one timeline and audit trail. See status on the dashboard; in Ops, track automation success, open schedule conflicts, and upcoming auction events together; use Executive for weekly risk and execution signals. Workspace plans and seats align cost with team size—focused on shipping and closing work, not on page count.",
      ctaPrimary: "Start with NOTI",
      ctaSecondary: "Sign in",
    },
    pills: [
      "Dashboard snapshot",
      "Activity timeline & audit",
      "Ops center",
      "Executive view",
      "Schedule conflicts & automation",
      "Auction events",
      "Calendar",
      "Workspace plan & seats (preview)",
      "Orgs & projects",
      "Docs, kanban & search",
      "RLS security",
    ],
    pillars: [
      {
        kicker: "Pulse",
        title: "Dashboard & activity timeline",
        body: "Docs, schedules, projects, tasks, and audit events roll into one feed so nothing slips.",
      },
      {
        kicker: "Ops",
        title: "Ops center · Executive",
        body: "Automation health, unresolved conflicts, weekly risk, and run metrics—an operations and SLA-friendly lens.",
      },
      {
        kicker: "Field",
        title: "Schedules · auctions · calendar",
        body: "Bid and auction moments live as first-class schedules. Plans and seats match team size; billing stays in preview mode until PSP integration.",
      },
    ],
    teasers: [
      {
        title: "Dashboard",
        body: "Snapshot and activity timeline at a glance.",
        href: "/dashboard",
      },
      {
        title: "Ops center",
        body: "Automation, conflicts, and auction timeline.",
        href: "/dashboard/ops",
      },
      {
        title: "Calendar",
        body: "Schedule types—including auctions—and weekly view.",
        href: "/dashboard/calendar",
      },
    ],
    stack: {
      title: "Stack",
      items: ["Next.js 15", "Supabase Auth · RLS", "Tailwind · shadcn-style UI", "Pretendard (Korean)"],
    },
    footer: "Noti · Next + Supabase",
    legal: {
      terms: "Terms of Service",
      privacy: "Privacy Policy",
    },
    signupAgree: "I have read and agree to the Terms of Service and Privacy Policy.",
    signupAgreeRequired: "Please agree to the Terms of Service and Privacy Policy.",
    authLogin: {
      kicker: "WELCOME BACK",
      title: "Welcome back to NOTI.",
      lead: "Continue with dashboard, ops, and schedules in one workspace.",
      bullets: [
        "Pulse · snapshot & activity timeline",
        "Ops · Ops center and Executive metrics",
        "Basics · docs, kanban, search, notices",
      ],
      formTitle: "Sign in",
      formHint: "Use your email and password to continue.",
      noAccount: "No account yet?",
      register: "Register",
    },
    authSignup: {
      kicker: "CREATE YOUR HUB",
      title: "Start using NOTI right now.",
      lead: "After sign-up, use dashboard, ops, schedules, orgs, and projects right away.",
      bullets: [
        "Team ops · timeline and audit trail",
        "Starter · free tier mindset",
        "Privacy · Supabase and RLS",
      ],
      formTitle: "Create account",
      formHint: "Name, email, and password.",
      hasAccount: "Already have an account?",
      signIn: "Sign in",
    },
  },
  es: {
    nav: {
      signIn: "Entrar",
      startFree: "Empezar gratis",
      openApp: "Abrir app",
    },
    hero: {
      eyebrow: "NOTI WORKSPACE",
      title: "No es un lienzo de docs genérico: un hub para operar el equipo.",
      subtitle:
        "Noti no es un workspace infinito. Organizaciones, proyectos, calendario y tareas comparten una línea de tiempo y auditoría. El dashboard resume el estado; en Operaciones ves éxito de automatización, conflictos de agenda y subastas próximas; Executive agrupa riesgo semanal y señales de ejecución. Planes y plazas alinean coste y tamaño del equipo—prioridad en cerrar trabajo, no en acumular páginas.",
      ctaPrimary: "Empezar con NOTI",
      ctaSecondary: "Entrar",
    },
    pills: [
      "Snapshot del dashboard",
      "Línea de tiempo y auditoría",
      "Centro de operaciones",
      "Vista Executive",
      "Conflictos y automatización",
      "Eventos de subasta",
      "Calendario",
      "Plan y plazas (preview)",
      "Orgs y proyectos",
      "Docs, kanban y búsqueda",
      "Seguridad RLS",
    ],
    pillars: [
      {
        kicker: "Pulse",
        title: "Dashboard y línea de actividad",
        body: "Documentos, agendas, proyectos, tareas y auditoría en un solo flujo.",
      },
      {
        kicker: "Ops",
        title: "Centro de ops · Executive",
        body: "Salud de automatización, conflictos abiertos, riesgo semanal y métricas de ejecución.",
      },
      {
        kicker: "Field",
        title: "Agendas · subastas · calendario",
        body: "Licitaciones y subastas como tipos de agenda. Planes y plazas según el equipo; cobro en modo preview hasta integrar la pasarela.",
      },
    ],
    teasers: [
      {
        title: "Dashboard",
        body: "Snapshot y línea de actividad.",
        href: "/dashboard",
      },
      {
        title: "Centro de ops",
        body: "Automatización, conflictos y subastas.",
        href: "/dashboard/ops",
      },
      {
        title: "Calendario",
        body: "Tipos de evento (p. ej. subastas) y vista semanal.",
        href: "/dashboard/calendar",
      },
    ],
    stack: {
      title: "Stack",
      items: ["Next.js 15", "Supabase Auth · RLS", "Tailwind · estilo shadcn", "Pretendard (coreano)"],
    },
    footer: "Noti · Next + Supabase",
    legal: {
      terms: "Términos del servicio",
      privacy: "Política de privacidad",
    },
    signupAgree: "He leído y acepto los Términos del servicio y la Política de privacidad.",
    signupAgreeRequired: "Debes aceptar los Términos y la Política de privacidad.",
    authLogin: {
      kicker: "BIENVENIDO",
      title: "Bienvenido de nuevo a NOTI.",
      lead: "Dashboard, operaciones y agendas en un workspace.",
      bullets: [
        "Pulse · snapshot y línea de actividad",
        "Ops · centro de ops y Executive",
        "Base · docs, kanban, búsqueda",
      ],
      formTitle: "Entrar",
      formHint: "Email y contraseña.",
      noAccount: "¿Sin cuenta?",
      register: "Registrarse",
    },
    authSignup: {
      kicker: "CREA TU HUB",
      title: "Empieza ya con NOTI.",
      lead: "Tras registrarte: dashboard, ops, agendas, orgs y proyectos.",
      bullets: [
        "Operación de equipo · línea de tiempo y auditoría",
        "Starter · enfoque gratuito",
        "Privacidad · Supabase y RLS",
      ],
      formTitle: "Crear cuenta",
      formHint: "Nombre, email y contraseña.",
      hasAccount: "¿Ya tienes cuenta?",
      signIn: "Entrar",
    },
  },
};
