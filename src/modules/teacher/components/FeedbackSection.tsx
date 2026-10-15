import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { Input, Select, TextArea } from '../../../shared/ui/Input';
import { Feedback } from '../../../shared/types';
import { interventionService } from '../../../shared/services/interventionService';
import { useAuth } from '../../core/AuthContext';
import { useToast } from '../../../shared/ui/Toast';
import { MessageSquare, Lock, Eye, AlertCircle, Clock, ShieldCheck } from 'lucide-react';

interface FeedbackSectionProps {
  studentId: string;
  studentName?: string;
}

export const FeedbackSection: React.FC<FeedbackSectionProps> = ({ studentId, studentName }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Feedback['category']>('academic');
  const [comment, setComment] = useState('');
  const [isPrivateToFaculty, setIsPrivateToFaculty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const list = await interventionService.listFeedback(studentId, true);
      setFeedbackList(list);
    } catch (err) {
      console.warn('Error loading feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, [studentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Please provide feedback comments.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await interventionService.addFeedback(
        {
          studentId,
          teacherId: user?.id || 'teacher',
          teacherName: user?.displayName || user?.email || 'Faculty Advisor',
          courseId: null,
          category,
          comment: comment.trim(),
          isPrivateToFaculty,
          createdBy: user?.id || 'teacher',
        },
        user ? { uid: user.id, role: 'teacher' } : undefined
      );

      showToast('Advisor feedback note appended to history.', 'success');
      setComment('');
      setIsPrivateToFaculty(false);
      await loadFeedback();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record feedback note.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Composer */}
      <Card className="border border-slate-200">
        <CardHeader
          title="Add Advisor Feedback Note"
          subtitle={`Log advising notes for ${studentName || studentId}. Append-only audit record.`}
        />
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Category" required>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Feedback['category'])}
                >
                  <option value="academic">Academic Performance</option>
                  <option value="attendance">Attendance & Punctuality</option>
                  <option value="behavioral">Advising & Engagement</option>
                  <option value="general">General Advising Note</option>
                </Select>
              </FormField>

              <div className="flex flex-col justify-end pb-1">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrivateToFaculty}
                    onChange={(e) => setIsPrivateToFaculty(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex items-center gap-1.5">
                    {isPrivateToFaculty ? (
                      <Lock size={14} className="text-amber-600" />
                    ) : (
                      <Eye size={14} className="text-slate-400" />
                    )}
                    <span>Faculty & Advisor Private Note (Hidden from Student)</span>
                  </span>
                </label>
                <span className="text-[10px] text-slate-500 pl-6 mt-0.5">
                  {isPrivateToFaculty
                    ? 'Only teachers and admins can view this note.'
                    : 'Visible on the student advising dashboard.'}
                </span>
              </div>
            </div>

            <FormField label="Advisor Feedback / Meeting Comments" required>
              <TextArea
                rows={3}
                placeholder="e.g., Met with student regarding midterm preparation. Encouraged participation in peer study groups and office hours."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
              />
            </FormField>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-600" />
                <span>Notes are append-only; silent overwrite or deletion is strictly prohibited.</span>
              </span>
              <Button type="submit" size="sm" isLoading={isSubmitting}>
                Save Feedback Note
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Feedback History Log */}
      <Card className="border border-slate-200">
        <CardHeader
          title="Advising Feedback History"
          subtitle={`Chronological log (${feedbackList.length} total entries)`}
        />
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
              Loading advising history...
            </div>
          ) : feedbackList.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No advising feedback notes recorded for this advisee yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {feedbackList.map((fb) => (
                <div key={fb.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {fb.teacherName || 'Faculty Advisor'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 capitalize">
                        {fb.category}
                      </span>
                      {fb.isPrivateToFaculty && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          <Lock size={10} /> Faculty Private
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <Clock size={11} />
                      {fb.createdAt ? new Date(fb.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }) : ''}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed pl-2 border-l-2 border-slate-200">
                    {fb.comment}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
