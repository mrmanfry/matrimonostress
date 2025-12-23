import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Phone,
  PhoneOff,
  Baby,
  Briefcase,
  UserPlus,
  Mail,
  Send,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Utensils,
  AlertTriangle,
  BarChart3,
  PieChartIcon,
  TrendingUp,
  Target,
} from "lucide-react";
import {
  calculateGuestAnalytics,
  GuestForAnalytics,
  PartyForAnalytics,
  GuestAnalytics,
} from "@/lib/guestAnalytics";

export type AnalyticsFilterType = 
  | { type: 'rsvp'; value: 'confirmed' | 'pending' | 'declined' }
  | { type: 'composition'; value: 'adults' | 'children' | 'staff' }
  | { type: 'contact'; value: 'with_phone' | 'without_phone' }
  | { type: 'menu'; value: string }
  | { type: 'dietary'; value: boolean }
  | { type: 'plusOne'; value: 'allowed' | 'confirmed' }
  | { type: 'funnel'; value: 'draft' | 'std_sent' | 'invited' | 'confirmed' }
  | { type: 'group'; value: string };

interface GuestAnalyticsDashboardProps {
  guests: GuestForAnalytics[];
  parties: PartyForAnalytics[];
  onGroupClick?: (groupName: string) => void;
  onFilterClick?: (filter: AnalyticsFilterType) => void;
}

// Color palette using semantic tokens
const COLORS = {
  confirmed: "hsl(142.1 76.2% 36.3%)", // green
  pending: "hsl(24.6 95% 53.1%)", // orange
  declined: "hsl(346.8 77.2% 49.8%)", // red
  adults: "hsl(221.2 83.2% 53.3%)", // blue
  children: "hsl(280 65% 60%)", // purple
  staff: "hsl(45 93% 47%)", // yellow
  primary: "hsl(var(--primary))",
  muted: "hsl(var(--muted-foreground))",
};

const CHART_COLORS = [
  "hsl(221.2 83.2% 53.3%)",
  "hsl(262.1 83.3% 57.8%)",
  "hsl(142.1 76.2% 36.3%)",
  "hsl(24.6 95% 53.1%)",
  "hsl(346.8 77.2% 49.8%)",
  "hsl(45 93% 47%)",
  "hsl(199 89% 48%)",
  "hsl(328 85% 70%)",
];

function KPICard({
  title,
  value,
  percentage,
  subtitle,
  icon: Icon,
  trend,
  color,
}: {
  title: string;
  value: number | string;
  percentage?: number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  color?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold" style={{ color }}>
                {value}
              </span>
              {percentage !== undefined && (
                <span className="text-sm text-muted-foreground">
                  ({percentage.toFixed(1)}%)
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: color ? `${color}20` : "hsl(var(--muted))" }}
          >
            <Icon className="w-5 h-5" style={{ color: color || "currentColor" }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PercentageBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">
          {value} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function GuestAnalyticsDashboard({
  guests,
  parties,
  onGroupClick,
  onFilterClick,
}: GuestAnalyticsDashboardProps) {
  const analytics = useMemo(
    () => calculateGuestAnalytics(guests, parties),
    [guests, parties]
  );

  if (analytics.totalGuests === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nessun dato disponibile per le analytics.</p>
          <p className="text-sm mt-2">Aggiungi degli invitati per vedere le statistiche.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Analytics Invitati
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {analytics.totalGuests} invitati · {analytics.totalParties} nuclei
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              <PieChartIcon className="w-4 h-4 mr-1 hidden sm:inline" />
              Panoramica
            </TabsTrigger>
            <TabsTrigger value="composition" className="text-xs sm:text-sm">
              <Users className="w-4 h-4 mr-1 hidden sm:inline" />
              Composizione
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="text-xs sm:text-sm">
              <Send className="w-4 h-4 mr-1 hidden sm:inline" />
              Campagne
            </TabsTrigger>
            <TabsTrigger value="menu" className="text-xs sm:text-sm">
              <Utensils className="w-4 h-4 mr-1 hidden sm:inline" />
              Menu
            </TabsTrigger>
          </TabsList>

          {/* TAB: PANORAMICA */}
          <TabsContent value="overview" className="space-y-4">
            <OverviewTab analytics={analytics} onGroupClick={onGroupClick} onFilterClick={onFilterClick} />
          </TabsContent>

          {/* TAB: COMPOSIZIONE */}
          <TabsContent value="composition" className="space-y-4">
            <CompositionTab analytics={analytics} onFilterClick={onFilterClick} />
          </TabsContent>

          {/* TAB: CAMPAGNE */}
          <TabsContent value="campaigns" className="space-y-4">
            <CampaignsTab analytics={analytics} onFilterClick={onFilterClick} />
          </TabsContent>

          {/* TAB: MENU */}
          <TabsContent value="menu" className="space-y-4">
            <MenuTab analytics={analytics} onFilterClick={onFilterClick} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ============ TAB COMPONENTS ============

function OverviewTab({
  analytics,
  onGroupClick,
  onFilterClick,
}: {
  analytics: GuestAnalytics;
  onGroupClick?: (groupName: string) => void;
  onFilterClick?: (filter: AnalyticsFilterType) => void;
}) {
  const rsvpData = [
    { name: "Confermati", value: analytics.confirmedCount, color: COLORS.confirmed, filterValue: 'confirmed' as const },
    { name: "In Attesa", value: analytics.pendingCount, color: COLORS.pending, filterValue: 'pending' as const },
    { name: "Rifiutati", value: analytics.declinedCount, color: COLORS.declined, filterValue: 'declined' as const },
  ].filter((d) => d.value > 0);

  const groupData = analytics.groupsBreakdown.slice(0, 8).map((g, i) => ({
    name: g.name.length > 15 ? g.name.slice(0, 15) + "..." : g.name,
    fullName: g.name,
    count: g.count,
    percentage: g.percentage,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <>
      {/* KPI Grid - Clickable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => onFilterClick?.({ type: 'rsvp', value: 'confirmed' })}>
          <KPICard
            title="Confermati"
            value={analytics.confirmedCount}
            percentage={analytics.confirmedPercentage}
            icon={UserCheck}
            color={COLORS.confirmed}
          />
        </div>
        <div className="cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => onFilterClick?.({ type: 'rsvp', value: 'pending' })}>
          <KPICard
            title="In Attesa"
            value={analytics.pendingCount}
            percentage={analytics.pendingPercentage}
            icon={Clock}
            color={COLORS.pending}
          />
        </div>
        <div className="cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => onFilterClick?.({ type: 'rsvp', value: 'declined' })}>
          <KPICard
            title="Rifiutati"
            value={analytics.declinedCount}
            percentage={analytics.declinedPercentage}
            icon={UserX}
            color={COLORS.declined}
          />
        </div>
        <div className="cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => onFilterClick?.({ type: 'contact', value: 'with_phone' })}>
          <KPICard
            title="Copertura Tel."
            value={analytics.withPhone}
            percentage={analytics.withPhonePercentage}
            subtitle={`${analytics.withoutPhone} senza telefono`}
            icon={Phone}
            color="hsl(199 89% 48%)"
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* RSVP Donut */}
        <Card className="p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4" />
            Stato RSVP
          </h4>
          {rsvpData.length > 0 ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rsvpData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={(data: any) => {
                      if (data && data.filterValue) {
                        onFilterClick?.({ type: 'rsvp', value: data.filterValue });
                      }
                    }}
                    cursor="pointer"
                  >
                    {rsvpData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value} (${((value / analytics.totalGuests) * 100).toFixed(1)}%)`,
                      name,
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Tutti in attesa</p>
              </div>
            </div>
          )}
          
          {/* Legend with percentages */}
          <div className="mt-3 space-y-1.5">
            <PercentageBar
              label="Confermati"
              value={analytics.confirmedCount}
              total={analytics.totalGuests}
              color={COLORS.confirmed}
            />
            <PercentageBar
              label="In Attesa"
              value={analytics.pendingCount}
              total={analytics.totalGuests}
              color={COLORS.pending}
            />
            <PercentageBar
              label="Rifiutati"
              value={analytics.declinedCount}
              total={analytics.totalGuests}
              color={COLORS.declined}
            />
          </div>
        </Card>

        {/* Group Distribution */}
        <Card className="p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Distribuzione per Gruppo
          </h4>
          {groupData.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis type="number" fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      `${value} (${props.payload.percentage.toFixed(1)}%)`,
                      props.payload.fullName,
                    ]}
                  />
                  <Bar
                    dataKey="count"
                    radius={[0, 4, 4, 0]}
                    onClick={(data: any) => onGroupClick?.(data.fullName)}
                    cursor="pointer"
                  >
                    {groupData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground">
              <p className="text-sm">Nessun gruppo definito</p>
            </div>
          )}
          {analytics.ungroupedCount > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              + {analytics.ungroupedCount} invitati senza gruppo ({analytics.ungroupedPercentage.toFixed(1)}%)
            </p>
          )}
        </Card>
      </div>
    </>
  );
}

function CompositionTab({ analytics, onFilterClick }: { analytics: GuestAnalytics; onFilterClick?: (filter: AnalyticsFilterType) => void }) {
  const compositionData = [
    { name: "Adulti", value: analytics.adultsCount, color: COLORS.adults },
    { name: "Bambini", value: analytics.childrenCount, color: COLORS.children },
    { name: "Staff", value: analytics.staffCount, color: COLORS.staff },
  ].filter((d) => d.value > 0);

  const partySizeData = analytics.partySizeDistribution.filter((d) => d.count > 0);

  return (
    <>
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          title="Adulti"
          value={analytics.adultsCount}
          percentage={analytics.adultsPercentage}
          icon={Users}
          color={COLORS.adults}
        />
        <KPICard
          title="Bambini"
          value={analytics.childrenCount}
          percentage={analytics.childrenPercentage}
          icon={Baby}
          color={COLORS.children}
        />
        <KPICard
          title="Staff"
          value={analytics.staffCount}
          percentage={analytics.staffPercentage}
          icon={Briefcase}
          color={COLORS.staff}
        />
        <KPICard
          title="+1 Confermati"
          value={`${analytics.plusOnesConfirmed}/${analytics.plusOnesPotential}`}
          percentage={analytics.plusOnesConversionRate}
          subtitle="tasso conversione"
          icon={UserPlus}
          color="hsl(280 65% 60%)"
        />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Composition Pie */}
        <Card className="p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4" />
            Composizione Invitati
          </h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={compositionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {compositionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value} (${((value / analytics.totalGuests) * 100).toFixed(1)}%)`,
                    name,
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Party Size Distribution */}
        <Card className="p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Dimensione Nuclei
          </h4>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Media per nucleo</span>
              <span className="font-medium text-foreground">{analytics.avgPartySize} membri</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Nucleo più grande</span>
              <span className="font-medium text-foreground">{analytics.maxPartySize} membri</span>
            </div>
          </div>
          {partySizeData.length > 0 ? (
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={partySizeData}>
                  <XAxis dataKey="size" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      `${value} nuclei (${props.payload.percentage.toFixed(1)}%)`,
                      `${props.payload.size} membri`,
                    ]}
                  />
                  <Bar dataKey="count" fill={COLORS.adults} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[150px] flex items-center justify-center text-muted-foreground">
              <p className="text-sm">Nessun nucleo definito</p>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function CampaignsTab({ analytics, onFilterClick }: { analytics: GuestAnalytics; onFilterClick?: (filter: AnalyticsFilterType) => void }) {
  const stdResponseData = [
    { name: "Sì probabile", value: analytics.stdLikelyYes, color: COLORS.confirmed },
    { name: "Incerto", value: analytics.stdUnsure, color: COLORS.pending },
    { name: "No probabile", value: analytics.stdLikelyNo, color: COLORS.declined },
  ].filter((d) => d.value > 0);

  const funnelStages = [
    {
      label: "Da Lavorare",
      value: analytics.draftCount,
      percentage: analytics.draftPercentage,
      icon: Clock,
      color: "hsl(var(--muted-foreground))",
    },
    {
      label: "STD Inviati",
      value: analytics.stdSentCount,
      percentage: analytics.stdSentPercentage,
      icon: Mail,
      color: COLORS.pending,
    },
    {
      label: "Inviti Formali",
      value: analytics.invitedCount,
      percentage: analytics.invitedPercentage,
      icon: Send,
      color: COLORS.adults,
    },
    {
      label: "Confermati",
      value: analytics.confirmedCount,
      percentage: analytics.confirmedPercentage,
      icon: CheckCircle2,
      color: COLORS.confirmed,
    },
  ];

  return (
    <>
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          title="Copertura Tel."
          value={analytics.withPhone}
          percentage={analytics.withPhonePercentage}
          icon={Phone}
          color="hsl(199 89% 48%)"
        />
        <KPICard
          title="Senza Telefono"
          value={analytics.withoutPhone}
          percentage={analytics.withoutPhonePercentage}
          icon={PhoneOff}
          color={COLORS.declined}
        />
        <KPICard
          title="STD Risposte"
          value={analytics.stdRespondedCount}
          percentage={analytics.stdResponseRate}
          subtitle="tasso risposta"
          icon={CheckCircle2}
          color={COLORS.confirmed}
        />
        <KPICard
          title="Inviti Inviati"
          value={analytics.invitedCount}
          percentage={analytics.invitedPercentage}
          icon={Send}
          color={COLORS.adults}
        />
      </div>

      {/* Funnel Visualization */}
      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Funnel Campagne
        </h4>
        <div className="space-y-3">
              {funnelStages.map((stage) => {
                const StageIcon = stage.icon;
                const widthPercent = Math.max(
                  20,
                  analytics.totalGuests > 0 ? (stage.value / analytics.totalGuests) * 100 : 0
                );
            return (
              <div key={stage.label} className="flex items-center gap-3">
                <div className="w-28 flex items-center gap-2 text-sm">
                  <StageIcon className="w-4 h-4" style={{ color: stage.color }} />
                  <span className="truncate">{stage.label}</span>
                </div>
                <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden relative">
                  <div
                    className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-3"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: stage.color,
                    }}
                  >
                    <span className="text-xs font-bold text-white drop-shadow">
                      {stage.value}
                    </span>
                  </div>
                </div>
                <span className="w-14 text-right text-sm font-medium">
                  {stage.percentage.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* STD Responses Breakdown */}
      {stdResponseData.length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Risposte Save The Date
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-green-600" />
              <div className="text-2xl font-bold text-green-600">{analytics.stdLikelyYes}</div>
              <div className="text-xs text-muted-foreground">Sì probabile</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
              <HelpCircle className="w-6 h-6 mx-auto mb-1 text-orange-500" />
              <div className="text-2xl font-bold text-orange-500">{analytics.stdUnsure}</div>
              <div className="text-xs text-muted-foreground">Incerto</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
              <XCircle className="w-6 h-6 mx-auto mb-1 text-red-500" />
              <div className="text-2xl font-bold text-red-500">{analytics.stdLikelyNo}</div>
              <div className="text-xs text-muted-foreground">No probabile</div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}

function MenuTab({ analytics, onFilterClick }: { analytics: GuestAnalytics; onFilterClick?: (filter: AnalyticsFilterType) => void }) {
  const menuData = analytics.menuBreakdown.map((m, i) => ({
    name: m.choice,
    value: m.count,
    percentage: m.percentage,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <>
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KPICard
          title="Con Scelta Menu"
          value={analytics.withMenuChoice}
          percentage={analytics.withMenuChoicePercentage}
          icon={Utensils}
          color={COLORS.confirmed}
        />
        <KPICard
          title="Senza Scelta"
          value={analytics.totalGuests - analytics.withMenuChoice}
          percentage={100 - analytics.withMenuChoicePercentage}
          icon={Clock}
          color={COLORS.pending}
        />
        <KPICard
          title="Esigenze Speciali"
          value={analytics.withDietaryCount}
          percentage={analytics.withDietaryPercentage}
          icon={AlertTriangle}
          color={COLORS.declined}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Menu Breakdown */}
        <Card className="p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4" />
            Distribuzione Menu
          </h4>
          {menuData.length > 0 ? (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={menuData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {menuData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string, props: any) => [
                        `${value} (${props.payload.percentage.toFixed(1)}%)`,
                        name,
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1.5">
                {menuData.map((m) => (
                  <PercentageBar
                    key={m.name}
                    label={m.name}
                    value={m.value}
                    total={analytics.totalGuests}
                    color={m.fill}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Utensils className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nessuna scelta menu registrata</p>
              </div>
            </div>
          )}
        </Card>

        {/* Dietary Restrictions */}
        <Card className="p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Restrizioni Alimentari
          </h4>
          {analytics.dietaryRestrictions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                {analytics.withDietaryCount} invitati con esigenze speciali
              </p>
              <div className="flex flex-wrap gap-2">
                {analytics.dietaryRestrictions.map((restriction) => (
                  <Badge key={restriction} variant="outline" className="text-xs">
                    {restriction}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[150px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50 text-green-500" />
                <p className="text-sm">Nessuna restrizione alimentare</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
