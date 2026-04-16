import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityFeedItem } from "@/lib/dashboard/activity-feed";
import type { DashboardSnapshot } from "@/lib/dashboard/snapshot";

import { ActivityTimelineVirtualList } from "./activity-timeline-virtual-list";
import { DashboardCardsLive } from "./dashboard-cards-live";

export function DashboardCardsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2 animate-pulse">
      {Array.from({ length: 4 }).map((_, idx) => (
        <Card key={idx}>
          <CardHeader className="space-y-2">
            <div className="h-4 w-24 rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-muted/70" />
              <div className="h-3 w-4/5 rounded bg-muted/60" />
              <div className="h-3 w-3/5 rounded bg-muted/50" />
            </div>
          </CardContent>
        </Card>
      ))}
      <Card className="lg:col-span-2">
        <CardContent className="pt-6">
          <div className="h-28 rounded-lg bg-muted/60" />
        </CardContent>
      </Card>
    </div>
  );
}

export async function DashboardCardsSection({
  snapshotPromise,
  hasWorkspace,
}: {
  snapshotPromise: Promise<DashboardSnapshot>;
  hasWorkspace: boolean;
}) {
  if (!hasWorkspace) {
    return null;
  }
  const snapshot = await snapshotPromise;
  return <DashboardCardsLive initialSnapshot={snapshot} />;
}

export function ActivityTimelineSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-4 w-44 rounded bg-muted animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[74px] rounded-lg border border-border/50 bg-muted/30" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export async function ActivityTimelineSection({
  feedPromise,
  hasWorkspace,
}: {
  feedPromise: Promise<ActivityFeedItem[]>;
  hasWorkspace: boolean;
}) {
  if (!hasWorkspace) {
    return null;
  }
  const feed = await feedPromise;
  return (
    <Card>
      <CardHeader>
        <CardTitle>활동 타임라인</CardTitle>
        <CardDescription>감사 로그·문서·일정·프로젝트·태스크를 한 줄로 모았습니다.</CardDescription>
      </CardHeader>
      <CardContent>
        {!feed.length ? (
          <p className="text-sm text-muted-foreground">아직 표시할 활동이 없습니다.</p>
        ) : (
          <ActivityTimelineVirtualList items={feed} />
        )}
      </CardContent>
    </Card>
  );
}
