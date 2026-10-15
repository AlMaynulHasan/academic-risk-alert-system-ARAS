import React, { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { Input, Select } from '../../../shared/ui/Input';
import { Course, Semester, User, CourseOffering } from '../../../shared/types';
import { academicRecordService } from '../../../shared/services/academicRecordService';
import { useAuth } from '../../core/AuthContext';
import { useToast } from '../../../shared/ui/Toast';
import { AlertCircle, Layers } from 'lucide-react';

interface CreateCourseOfferingModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  semesters: Semester[];
  teachers: User[];
  onCreated: () => void;
}

export const CreateCourseOfferingModal: React.FC<CreateCourseOfferingModalProps> = ({
  isOpen,
  onClose,
  courses,
  semesters,
  teachers,
  onCreated,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [semesterId, setSemesterId] = useState(
    semesters.find((s) => s.isCurrent)?.id || semesters[0]?.id || ''
  );
  const [section, setSection] = useState('A');
  const [teacherId, setTeacherId] = useState(teachers[0]?.id || '');
  const [capacity, setCapacity] = useState('50');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!courseId) {
      setError('Please select a course.');
      return;
    }
    if (!semesterId) {
      setError('Please select a semester.');
      return;
    }
    if (!section.trim()) {
      setError('Section is required (e.g., A).');
      return;
    }

    const selectedCourse = courses.find((c) => c.id === courseId);
    const parsedCapacity = Number(capacity) || 50;

    setIsSubmitting(true);

    try {
      await academicRecordService.createCourseOffering(
        {
          courseId,
          courseCode: selectedCourse?.code || '',
          courseTitle: selectedCourse?.title || '',
          semesterId,
          section: section.trim().toUpperCase(),
          teacherIds: teacherId ? [teacherId] : [],
          capacity: parsedCapacity,
          status: 'active',
          createdBy: user?.id || 'admin',
        },
        { uid: user?.id || 'admin', role: user?.role || 'admin' }
      );

      showToast('Course offering created successfully!', 'success');
      onCreated();
      onClose();
    } catch (err: unknown) {
      console.error('Create course offering error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create course offering.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Term Course Offering">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <FormField label="Catalog Course" required>
          <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}: {c.title} ({c.credits} cr)
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Academic Term / Semester" required>
            <Select value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Offering Section" required hint="e.g. A, B, C">
            <Input
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="A"
              className="uppercase"
              required
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Assigned Course Teacher" hint="Responsible faculty">
            <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">-- Assign Later --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.displayName} ({t.email})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Student Capacity" hint="Maximum section seats">
            <Input
              type="number"
              min="5"
              max="200"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="50"
            />
          </FormField>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create Offering
          </Button>
        </div>
      </form>
    </Modal>
  );
};
