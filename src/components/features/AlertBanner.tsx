import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useState } from 'react';

interface AlertBannerProps {
  severity: 'warning' | 'error' | 'info';
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const severityConfig = {
  warning: { icon: AlertTriangle, bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning', iconColor: 'text-warning' },
  error: { icon: AlertCircle, bg: 'bg-destructive/10', border: 'border-destructive/30', text: 'text-destructive', iconColor: 'text-destructive' },
  info: { icon: Info, bg: 'bg-info/10', border: 'border-info/30', text: 'text-info', iconColor: 'text-info' },
};

export function AlertBanner({ severity, message, dismissible = true, onDismiss }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-3 rounded-lg border ${config.border} ${config.bg} px-4 py-3 animate-fade-in`}>
      <Icon className={`h-4 w-4 shrink-0 ${config.iconColor}`} />
      <p className={`flex-1 text-sm font-medium ${config.text}`}>{message}</p>
      {dismissible && (
        <button
          onClick={() => { setDismissed(true); onDismiss?.(); }}
          className={`shrink-0 rounded p-0.5 ${config.text} hover:bg-background/50`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
