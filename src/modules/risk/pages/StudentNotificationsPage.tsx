import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Info,
  BookOpen,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../core/AuthContext';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { RiskBadge } from '../../../shared/ui/RiskBadge';
import { EmptyState } from '../../../shared/ui/EmptyState';
import {
  alertService,
  notificationService,
  MONTHLY_ALERT_LIMIT,
} from '../../../shared/services/alertService';
import { riskService, CurrentRiskStatus, RecommendationItem } from '../../../shared/services/riskService';
import { AlertDelivery, Notification } from '../../../shared/types';
import { formatDhakaDateTime } from '../../../shared/utils/date';

type TabType = 'all' | 'alerts' | 'deadlines' | 'recommendations' | 'history';

export const StudentNotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [alerts, setAlerts] = useState<AlertDelivery[]>([]);
  const [riskStatus, setRiskStatus] = useState<CurrentRiskStatus | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [quota, setQuota] = useState({
    period: '',
    count: 0,
    limit: MONTHLY_ALERT_LIMIT,
    remaining: MONTHLY_ALERT_LIMIT,
  });

  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = async (isSilent = false) => {
    if (!user) return;
    if (!isSilent) setLoading(true);

    try {
      const [notifs, alertList, currentRisk, recs, quotaStatus] = await Promise.all([
        notificationService.listNotifications(user.id),
        alertService.listAlerts(user.id),
        riskService.getCurrentRisk(user.id),
        riskService.getRecommendations(user.id),
        alertService.getMonthlyQuotaStatus(user.id),
      ]);

      setNotifications(notifs);
      setAlerts(alertList);
      setRiskStatus(currentRisk);
      setRecommendations(recs);
      setQuota(quotaStatus);
    } catch (err) {
      console.error('Error loading notification center data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleManualReassessment = async () => {
    if (!user) return;
    setRefreshing(true);
    setActionMessage(null);
    try {
      const result = await riskService.assessStudent(user.id, 'manual_review');
      setRiskStatus(result);
      await loadData(true);
      setActionMessage(`Academic status successfully re-evaluated. Standing: ${result.riskLevel} Risk.`);
    } catch (err) {
      console.error('Reassessment failed:', err);
      setActionMessage('Failed to trigger reassessment. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleDispatchDeadlines = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const count = await notificationService.dispatchDeadlineReminders(user.id);
      await loadData(true);
      setActionMessage(
        count > 0
          ? `Dispatched ${count} deadline reminder(s) for upcoming assignments.`
          : 'All deadline reminders for today are already up-to-date.'
      );
    } catch (err) {
      console.error('Dispatch deadlines error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    if (!user) return;
    setAcknowledgingId(alertId);
    try {
      await alertService.acknowledgeAlert(alertId, user.id);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? { ...a, status: 'acknowledged', acknowledgedAt: new Date().toISOString() }
            : a
        )
      );
      setActionMessage('Alert acknowledged. Your advisor will be notified.');
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    } finally {
      setAcknowledgingId(null);
    }
  };

  const handleMarkNotificationRead = async (notifId: string) => {
    if (!user) return;
    try {
      await notificationService.markRead(notifId, user.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await notificationService.markAllRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setActionMessage('All notifications marked as read.');
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // Filtered views
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const deadlineNotifs = notifications.filter((n) => n.category === 'assignment');
  const riskNotifs = notifications.filter((n) => n.category === 'risk_alert');
  const pendingAlerts = alerts.filter((a) => a.status !== 'acknowledged');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts & Notifications"
        description="Monitor automated academic risk warnings, advisory follow-ups, and upcoming deliverable deadlines."
        breadcrumbs={[{ label: 'Student', href: '/student/dashboard' }, { label: 'Notifications' }]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDispatchDeadlines}
              disabled={refreshing}
            >
              <Calendar className="w-4 h-4 mr-1.5" />
              Check Deadlines
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualReassessment}
              isLoading={refreshing}
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Reassess Standing
            </Button>
          </div>
        }
      />

      {/* Action feedback toast/banner */}
      {actionMessage && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs text-blue-700 hover:underline font-medium ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Quota & Policy Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-slate-900 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">
              <span>Monthly Alert Rate Limit</span>
              <span className="text-slate-300">Period: {quota.period || 'Current'}</span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-white mt-1">
              {quota.count} / {quota.limit} Alerts
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Strictly enforced in <strong className="text-slate-100">Asia/Dhaka</strong> timezone to eliminate alert fatigue. Only delivered high/medium risk notifications count against this quota.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Remaining Quota:</span>
            <span className="font-semibold text-emerald-400">{quota.remaining} available</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">
              <span>Current Academic Risk Status</span>
              {riskStatus && <RiskBadge level={riskStatus.riskLevel} size="sm" />}
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              {riskStatus?.score !== null && riskStatus?.score !== undefined ? `${riskStatus.score} / 100` : 'Sufficient Data Pending'}
            </div>
            <p className="text-xs text-slate-600 mt-2 line-clamp-2">
              {riskStatus?.reasons && riskStatus.reasons.length > 0
                ? riskStatus.reasons[0]
                : 'No critical risk flags detected across attendance or continuous evaluations.'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Evaluated: {formatDhakaDateTime(riskStatus?.computedAt)}</span>
            <span className="font-mono text-[11px] text-slate-400">v{riskStatus?.configVersion || '1.0.0'}</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">
              Active Action Items
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              {recommendations.length} Recommendations
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Generated by the deterministic rule engine from observed attendance, quiz marks, and missing deliverables.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setActiveTab('recommendations')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View Guidance Plan <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </Card>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <nav className="flex space-x-2 -mb-px">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-2.5 px-3.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bell className="w-4 h-4" />
            All Notifications
            {unreadCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 font-semibold rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-2.5 px-3.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'alerts'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Risk Alerts
            {pendingAlerts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-800 font-semibold rounded-full">
                {pendingAlerts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('deadlines')}
            className={`py-2.5 px-3.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'deadlines'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-500" />
            Deadlines ({deadlineNotifs.length})
          </button>

          <button
            onClick={() => setActiveTab('recommendations')}
            className={`py-2.5 px-3.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'recommendations'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            Action Plan ({recommendations.length})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-2.5 px-3.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4 text-slate-500" />
            Delivery History ({alerts.length})
          </button>
        </nav>

        {unreadCount > 0 && activeTab === 'all' && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
            <CheckCircle className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="py-16 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-slate-400 mb-3" />
          <p className="text-sm">Loading notification center...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: ALL NOTIFICATIONS */}
          {activeTab === 'all' && (
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <EmptyState
                  title="No Notifications Yet"
                  description="You are caught up! Academic alerts, deadline reminders, and faculty follow-ups will appear here."
                />
              ) : (
                notifications.map((n) => (
                  <Card
                    key={n.id}
                    className={`p-4 border transition-shadow hover:shadow-xs ${
                      n.isRead ? 'bg-white border-slate-200' : 'bg-blue-50/40 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 p-2 rounded-lg flex-shrink-0 ${
                            n.category === 'risk_alert'
                              ? 'bg-rose-100 text-rose-700'
                              : n.category === 'assignment'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {n.category === 'risk_alert' ? (
                            <AlertOctagon className="w-4 h-4" />
                          ) : n.category === 'assignment' ? (
                            <Clock className="w-4 h-4" />
                          ) : (
                            <Bell className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-slate-900">{n.title}</h4>
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                            <span>{formatDhakaDateTime(n.createdAt)}</span>
                            <span>•</span>
                            <span className="capitalize">{n.category.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!n.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkNotificationRead(n.id)}
                            className="text-xs text-slate-600"
                          >
                            Mark read
                          </Button>
                        )}
                        {n.link && (
                          <a
                            href={n.link}
                            className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
                          >
                            View <ArrowRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* TAB 2: RISK ALERTS */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {pendingAlerts.length === 0 ? (
                <EmptyState
                  title="No Pending Risk Alerts"
                  description="You have acknowledged all active risk alerts or your academic standing is within nominal low-risk boundaries."
                />
              ) : (
                pendingAlerts.map((alert) => (
                  <Card
                    key={alert.id}
                    className="p-5 border-l-4 border-l-rose-500 bg-white border-slate-200 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
                          <AlertOctagon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-900">
                              Urgent Academic Standing Advisory
                            </h3>
                            <RiskBadge level={alert.riskLevel} size="sm" />
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Delivered: {formatDhakaDateTime(alert.createdAt)} via {alert.channel.replace('_', ' ')}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        isLoading={acknowledgingId === alert.id}
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        Acknowledge Alert
                      </Button>
                    </div>

                    {/* Breakdown Reasons */}
                    <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-100 text-sm">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Transparent Evaluation Reasons:
                      </h4>
                      {riskStatus?.reasons && riskStatus.reasons.length > 0 ? (
                        <ul className="space-y-1.5">
                          {riskStatus.reasons.map((reason, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-slate-700 text-xs">
                              <span className="text-rose-500 font-bold">•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-600">Standing evaluated based on ongoing semester indicators.</p>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* TAB 3: DEADLINES */}
          {activeTab === 'deadlines' && (
            <div className="space-y-3">
              {deadlineNotifs.length === 0 ? (
                <EmptyState
                  title="No Imminent Deadlines"
                  description="You have no urgent deliverables due within 72 hours. Check your enrolled courses for the full semester schedule."
                />
              ) : (
                deadlineNotifs.map((d) => (
                  <Card key={d.id} className="p-4 border border-slate-200 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">{d.title}</h4>
                          <p className="text-xs text-slate-600 mt-0.5">{d.message}</p>
                          <span className="text-[11px] text-slate-400 mt-1 inline-block">
                            Reminder logged: {formatDhakaDateTime(d.createdAt)}
                          </span>
                        </div>
                      </div>

                      <a
                        href="/student/courses"
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        View Deliverable <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* TAB 4: RECOMMENDATIONS */}
          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              <div className="bg-purple-50/70 border border-purple-200 p-4 rounded-xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-purple-900 leading-relaxed">
                  <strong className="font-semibold block text-sm mb-0.5 text-purple-950">
                    Rule-Based Action Recommendations
                  </strong>
                  These actions are computed directly from your current academic indicators (attendance %, continuous quiz marks, and missing assignments). Following them will systematically reduce your evaluated risk score.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.map((rec) => (
                  <Card
                    key={rec.id}
                    className="p-4 border border-slate-200 bg-white flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            rec.priority === 'high'
                              ? 'bg-rose-100 text-rose-800'
                              : rec.priority === 'medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {rec.priority} Priority
                        </span>
                        <span className="text-xs text-slate-400 capitalize">{rec.category}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900">{rec.title}</h4>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                        {rec.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Deterministic Guidance</span>
                      <a
                        href="/student/attendance"
                        className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
                      >
                        Action Record <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: HISTORY & AUDIT TRAIL */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <EmptyState
                  title="No Alert History"
                  description="No risk alerts have been dispatched to your profile yet."
                />
              ) : (
                <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Dispatched (Dhaka)</th>
                        <th className="px-4 py-3 font-semibold">Risk Level</th>
                        <th className="px-4 py-3 font-semibold">Channel</th>
                        <th className="px-4 py-3 font-semibold">Delivery Status</th>
                        <th className="px-4 py-3 font-semibold">Acknowledged At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {alerts.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {formatDhakaDateTime(a.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <RiskBadge level={a.riskLevel} size="sm" />
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px]">
                            {a.channel}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full font-medium ${
                                a.status === 'acknowledged'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : a.status === 'delivered'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {a.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {a.acknowledgedAt ? formatDhakaDateTime(a.acknowledgedAt) : 'Pending acknowledgement'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
