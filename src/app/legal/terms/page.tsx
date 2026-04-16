import type { Metadata } from "next";

import { SupportContact } from "@/components/legal/support-contact";

export const metadata: Metadata = {
  title: "이용약관",
  description: "NOTI 서비스 이용약관",
};

export default function TermsOfServicePage() {
  return (
    <article className="space-y-8 text-sm leading-relaxed text-foreground">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">이용약관</h1>
        <p className="text-muted-foreground">
          시행일: 배포일 기준 · 본 약관은 <strong className="font-medium">일반적인 웹 서비스 약관 초안</strong>
          입니다. 상용 전 운영 주체·요금·책임 한도 등을 법무와 협의해 수정하세요.
        </p>
        <SupportContact />
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">1. 목적 및 정의</h2>
        <p className="text-muted-foreground">
          본 약관은 NOTI(이하 &quot;서비스&quot;)의 이용 조건 및 절차, 이용자와 운영자의 권리·의무를 규정합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">2. 계정 및 가입</h2>
        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          <li>정확한 정보를 제공해야 하며, 타인의 정보를 도용해서는 안 됩니다.</li>
          <li>계정 자격은 본인에게 한정되며, 무단 공유·양도를 금지합니다.</li>
          <li>만 14세 미만은 법정대리인 동의 등 관련 법령을 준수해야 합니다.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">3. 서비스 제공</h2>
        <p className="text-muted-foreground">
          운영자는 안정적인 서비스 제공을 위해 노력하나, 점검·장애·제휴사 장애 등으로 일시 중단될 수 있습니다.
          유료 플랜이 있는 경우 별도 정책 또는 계약이 우선할 수 있습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">4. 이용자 의무</h2>
        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          <li>법령·공서양속에 반하는 행위, 타인의 권리 침해, 시스템 부정 접근·자동화 남용을 금지합니다.</li>
          <li>악성 코드 유포, 스팸, 불법 콘텐츠 저장·공유를 금지합니다.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">5. 콘텐츠 및 지식재산</h2>
        <p className="text-muted-foreground">
          이용자가 업로드·작성한 데이터의 지식재산권은 이용자에게 귀속됩니다. 서비스 운영·표시·백업·보안을 위해
          필요한 범위의 비독점적 사용·저장 라이선스를 부여합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">6. 계약 해지</h2>
        <p className="text-muted-foreground">
          이용자는 언제든지 탈퇴·해지를 요청할 수 있고, 운영자는 약관 위반·법령 위반 시 이용을 제한하거나 해지할 수
          있습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">7. 면책</h2>
        <p className="text-muted-foreground">
          법령이 허용하는 한, 간접·특별·결과적 손해에 대해 운영자의 책임은 제한될 수 있습니다. 서비스는 &quot;있는
          그대로&quot; 제공됩니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">8. 준거법 및 분쟁</h2>
        <p className="text-muted-foreground">
          대한민국 법을 준거법으로 하며, 분쟁은 관할 법원에 따릅니다(실제 사업 소재에 맞게 수정).
        </p>
      </section>
    </article>
  );
}
