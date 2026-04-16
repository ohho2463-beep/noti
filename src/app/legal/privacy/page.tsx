import type { Metadata } from "next";

import { SupportContact } from "@/components/legal/support-contact";

export const metadata: Metadata = {
  title: "개인정보 처리방침",
  description: "NOTI 서비스 개인정보 처리방침",
};

export default function PrivacyPolicyPage() {
  return (
    <article className="space-y-8 text-sm leading-relaxed text-foreground">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">개인정보 처리방침</h1>
        <p className="text-muted-foreground">
          시행일: 배포일 기준 · 본 문서는 일반적인 SaaS 관행에 맞춘 <strong className="font-medium">표준 안내</strong>
          입니다. 실제 상용 서비스 전에 법무 검토 후 회사명·연락처·보관 기간 등을 반드시 맞춤 수정하세요.
        </p>
        <SupportContact />
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">1. 처리 목적</h2>
        <p className="text-muted-foreground">
          회원 식별, 서비스 제공·유지·개선, 고객 지원, 보안·부정 이용 방지, 법령상 의무 이행, 통계·품질 분석(가명
          또는 집계 형태로 한정 가능).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">2. 수집 항목</h2>
        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          <li>필수: 이메일 주소, 비밀번호(해시 저장), 표시 이름 등 계정 정보</li>
          <li>자동: 접속 로그, IP·쿠키·기기 정보, 오류 로그(보안·안정성 목적)</li>
          <li>서비스 이용 과정에서 사용자가 입력·업로드하는 문서·일정·프로젝트 데이터</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">3. 보관 및 파기</h2>
        <p className="text-muted-foreground">
          관계 법령 또는 이용약관에 따라 보관이 필요한 경우를 제외하고, 목적 달성 후 지체 없이 파기합니다. 전자적
          파일은 복구 불가 방식으로 삭제합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">4. 처리 위탁 및 국외 이전</h2>
        <p className="text-muted-foreground">
          호스팅·인증·이메일 발송 등에 제3자 서비스(예: Supabase, Vercel, Resend)를 사용할 수 있습니다. 해당
          사업자의 개인정보 처리방침을 함께 확인하세요. 국외 이전이 있는 경우 법적 요건(고지·동의 등)을 갖춥니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">5. 이용자 권리</h2>
        <p className="text-muted-foreground">
          개인정보 열람·정정·삭제·처리 정지 요구, 동의 철회, 데이터 이동권(해당 시)을 요청할 수 있습니다. 설정
          화면 또는 지원 채널로 연락해 주세요.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">6. 안전성 확보</h2>
        <p className="text-muted-foreground">
          전송 구간 암호화(HTTPS), 접근 통제, 최소 권한 원칙, 데이터베이스 수준 보안 정책(RLS 등)을 적용합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">7. 고지의 변경</h2>
        <p className="text-muted-foreground">
          법령·서비스 변경 시 본 방침을 개정할 수 있으며, 중요한 변경은 서비스 내 공지 등 합리적인 방법으로
          안내합니다.
        </p>
      </section>
    </article>
  );
}
