import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/features/PageHeader';
import { DataTable } from '@/components/features/DataTable';
import { StatusBadge } from '@/components/features/StatusBadge';
import { useSystemConfigs, useFeatureFlags, useAuditLogs, useSystemHealth } from '@/hooks/use-fleet-data';
import { api } from '@/services/mock-api';
import { toast } from '@/hooks/use-toast';
import type { AuditLog, SystemConfig, FeatureFlag } from '@/types';

export default function AdminPage() {
  const [auditPage, setAuditPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: configs, isLoading: configsLoading } = useSystemConfigs();
  const { data: flags, isLoading: flagsLoading } = useFeatureFlags();
  const { data: auditData, isLoading: auditLoading } = useAuditLogs(auditPage, 15);
  const { data: health } = useSystemHealth();

  const configMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) => api.admin.updateConfig(id, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-configs'] });
      toast({ title: 'Configuration updated' });
    },
  });

  const flagMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => api.admin.toggleFlag(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      toast({ title: 'Feature flag updated' });
    },
  });

  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null);

  const auditColumns = [
    { key: 'action', header: 'Action', render: (a: AuditLog) => (
      <StatusBadge variant={a.action.includes('FAIL') ? 'destructive' : a.action.includes('LOGIN') ? 'success' : 'secondary'} dot={false}>
        {a.action}
      </StatusBadge>
    )},
    { key: 'userId', header: 'User ID', render: (a: AuditLog) => a.userId || '—' },
    { key: 'ip', header: 'IP Address' },
    { key: 'createdAt', header: 'Timestamp', render: (a: AuditLog) => new Date(a.createdAt).toLocaleString() },
    { key: 'metadata', header: 'Details', render: (a: AuditLog) => (
      a.metadata ? (
        <button onClick={(e) => { e.stopPropagation(); setExpandedAudit(expandedAudit === a.id ? null : a.id); }}
          className="text-xs text-primary hover:underline">
          {expandedAudit === a.id ? 'Hide' : 'View'}
        </button>
      ) : '—'
    )},
  ];

  const healthStatus = (status: string) => {
    if (status === 'healthy') return 'success';
    if (status === 'degraded') return 'warning';
    return 'destructive';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Admin Panel" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Admin' }]} />

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">System Config</TabsTrigger>
          <TabsTrigger value="flags">Feature Flags</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
        </TabsList>

        {/* System Config */}
        <TabsContent value="config" className="mt-4">
          {configsLoading ? <Skeleton className="h-64" /> : (
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {configs?.map(cfg => (
                <div key={cfg.id} className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-card-foreground">{cfg.key}</p>
                    <p className="text-xs text-muted-foreground">{cfg.description}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Input
                      className="w-24"
                      value={editValues[cfg.id] ?? cfg.value}
                      onChange={e => setEditValues({ ...editValues, [cfg.id]: e.target.value })}
                    />
                    <Button
                      size="sm" variant="outline"
                      disabled={!(editValues[cfg.id]) || editValues[cfg.id] === cfg.value}
                      onClick={() => configMutation.mutate({ id: cfg.id, value: editValues[cfg.id] })}
                    >
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Feature Flags */}
        <TabsContent value="flags" className="mt-4">
          {flagsLoading ? <Skeleton className="h-64" /> : (
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {flags?.map(flag => (
                <div key={flag.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{flag.name}</p>
                    <p className="text-xs text-muted-foreground">{flag.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Last changed by: {flag.lastChangedBy || 'N/A'}</p>
                  </div>
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={(checked) => flagMutation.mutate({ id: flag.id, enabled: checked })}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Audit Log */}
        <TabsContent value="audit" className="mt-4 space-y-4">
          <DataTable<AuditLog>
            columns={auditColumns}
            data={auditData?.data || []}
            isLoading={auditLoading}
            page={auditPage}
            totalPages={auditData?.totalPages || 1}
            onPageChange={setAuditPage}
          />
          {expandedAudit && (
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                {JSON.stringify(auditData?.data.find(a => a.id === expandedAudit)?.metadata, null, 2)}
              </p>
            </div>
          )}
        </TabsContent>

        {/* System Health */}
        <TabsContent value="health" className="mt-4">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
            <span className="text-xs text-muted-foreground">Auto-refresh: 10s</span>
          </div>
          {health ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border bg-card p-5">
                <p className="text-xs text-muted-foreground mb-2">Database</p>
                <StatusBadge variant={healthStatus(health.database) as 'success' | 'warning' | 'destructive'}>
                  {health.database.toUpperCase()}
                </StatusBadge>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <p className="text-xs text-muted-foreground mb-2">API Latency</p>
                <p className="text-2xl font-bold text-card-foreground">{health.apiLatency}ms</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <p className="text-xs text-muted-foreground mb-2">Active Sessions</p>
                <p className="text-2xl font-bold text-card-foreground">{health.activeSessions}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <p className="text-xs text-muted-foreground mb-2">Uptime</p>
                <p className="text-2xl font-bold text-card-foreground">{health.uptime}</p>
              </div>
            </div>
          ) : <Skeleton className="h-32" />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
