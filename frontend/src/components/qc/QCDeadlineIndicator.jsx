import { 
  Clock, Zap, AlertCircle, Timer, Target, Calendar, 
  TrendingUp, CheckCircle 
} from 'lucide-react';

/**
 * QC Deadline Indicator Component
 * Displays the deadline status and urgency level for QC inspections
 * 
 * Usage:
 * <QCDeadlineIndicator 
 *   hasDeadline={inspection.has_deadline}
 *   deadlineType={inspection.deadline_type}
 *   dueDate={inspection.due_date}
 *   urgencyLevel={inspection.urgency_level}
 *   daysRemaining={inspection.days_remaining}
 *   compact={false}
 * />
 */
export default function QCDeadlineIndicator({ 
  hasDeadline,
  deadlineType,
  dueDate,
  urgencyLevel,
  daysRemaining,
  deadlineReason,
  compact = false,
  showReason = false
}) {
  // If no deadline
  if (!hasDeadline || deadlineType === 'NONE') {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 ${
        compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'
      } font-medium text-slate-600`}>
        <Target size={compact ? 14 : 16} />
        <span>No Deadline</span>
      </div>
    );
  }

  // Determine urgency styling
  const getUrgencyConfig = () => {
    switch (urgencyLevel) {
      case 'OVERDUE':
        return {
          Icon: AlertCircle,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-300',
          textColor: 'text-red-700',
          label: `${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? 'day' : 'days'} overdue`,
          pulse: true
        };
      
      case 'URGENT':
        return {
          Icon: Zap,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-300',
          textColor: 'text-red-700',
          label: `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left - URGENT`,
          pulse: true
        };
      
      case 'SOON':
        return {
          Icon: Timer,
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-300',
          textColor: 'text-amber-700',
          label: `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left`,
          pulse: false
        };
      
      case 'NORMAL':
        return {
          Icon: Clock,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-300',
          textColor: 'text-green-700',
          label: `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left`,
          pulse: false
        };
      
      default:
        return {
          Icon: Clock,
          bgColor: 'bg-slate-50',
          borderColor: 'border-slate-300',
          textColor: 'text-slate-600',
          label: 'Deadline set',
          pulse: false
        };
    }
  };

  const config = getUrgencyConfig();
  const Icon = config.Icon;

  if (compact) {
    return (
      <div className={`relative inline-flex items-center gap-1.5 rounded-full border ${config.borderColor} ${config.bgColor} px-2 py-1 text-xs font-semibold ${config.textColor}`}>
        {config.pulse && (
          <span className="absolute inset-0 animate-ping rounded-full border-2 border-current opacity-20" />
        )}
        <Icon size={14} className="shrink-0" />
        <span>{config.label}</span>
      </div>
    );
  }

  // Full display with optional details
  return (
    <div className="flex flex-col gap-2">
      <div className={`relative inline-flex items-center gap-2 rounded-lg border ${config.borderColor} ${config.bgColor} px-3 py-2 text-sm font-medium ${config.textColor}`}>
        {config.pulse && (
          <span className="absolute inset-0 animate-ping rounded-lg border-2 border-current opacity-20" />
        )}
        <Icon size={16} className="shrink-0" />
        <div className="flex flex-col">
          <span className="font-semibold">{config.label}</span>
          {dueDate && (
            <span className="text-xs opacity-80">
              Due: {new Date(dueDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </span>
          )}
        </div>
      </div>

      {/* Show deadline reason if provided */}
      {showReason && deadlineReason && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
          <span className="font-medium">Reason:</span> {deadlineReason}
        </div>
      )}

      {/* Deadline type badge */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Calendar size={12} />
        <span>
          {deadlineType === 'STANDARD' && 'Standard deadline (15 days)'}
          {deadlineType === 'CUSTOM' && 'Custom deadline'}
          {deadlineType === 'NONE' && 'No deadline set'}
        </span>
      </div>
    </div>
  );
}

/**
 * Simplified inline version for tables
 */
export function QCDeadlineBadge({ urgencyLevel, daysRemaining, hasDeadline, deadlineType }) {
  if (!hasDeadline || deadlineType === 'NONE') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
        <Target size={12} />
        No Deadline
      </span>
    );
  }

  const getBadgeClass = () => {
    switch (urgencyLevel) {
      case 'OVERDUE':
        return 'bg-red-100 text-red-700 animate-pulse';
      case 'URGENT':
        return 'bg-red-100 text-red-700';
      case 'SOON':
        return 'bg-amber-100 text-amber-700';
      case 'NORMAL':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getIcon = () => {
    switch (urgencyLevel) {
      case 'OVERDUE': return <AlertCircle size={12} />;
      case 'URGENT': return <Zap size={12} />;
      case 'SOON': return <Timer size={12} />;
      case 'NORMAL': return <Clock size={12} />;
      default: return <Clock size={12} />;
    }
  };

  const getLabel = () => {
    if (urgencyLevel === 'OVERDUE') {
      return `${Math.abs(daysRemaining)}d overdue`;
    }
    return `${daysRemaining}d left`;
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${getBadgeClass()}`}>
      {getIcon()}
      {getLabel()}
    </span>
  );
}
