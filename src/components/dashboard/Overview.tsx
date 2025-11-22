import StatCard from './StatCard';

export default function Overview() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">系统概览</h3>
        <p className="text-sm text-muted-foreground">
          查看系统关键指标和数据统计
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="总商家数"
          value={128}
          trend={{
            value: "+12.5%",
            isPositive: true
          }}
          footer={{
            label: "本月新增稳定增长",
            description: "相比上月增长 12.5%"
          }}
        />

        <StatCard
          title="消息通知开启"
          value={86}
          trend={{
            value: "+8.2%",
            isPositive: true
          }}
          footer={{
            label: "开启率持续提升",
            description: "67% 的商家已开启通知"
          }}
        />

        <StatCard
          title="今日新增"
          value={12}
          trend={{
            value: "-3.1%",
            isPositive: false
          }}
          footer={{
            label: "较昨日略有下降",
            description: "周末活跃度降低属正常现象"
          }}
        />
      </div>
    </div>
  );
} 