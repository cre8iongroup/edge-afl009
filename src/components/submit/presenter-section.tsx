'use client';

import { useState, useRef, useCallback } from 'react';
import type { Submission, Presenter } from '@/lib/types';
import { useSubmissions } from '@/components/submissions-provider';
import { useStorage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isAfterJuly1 } from '@/lib/utils';
import {
  UserPlus,
  Pencil,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_PRESENTERS = 6;
const MAX_BIO_WORDS = 150;
const MIN_HEADSHOT_BYTES = 75 * 1024;          // 75 KB
const MAX_HEADSHOT_BYTES = 10 * 1024 * 1024;  // 10 MB
const ACCEPTED_MIME = ['image/jpeg', 'image/png'];
const LOCK_DATE = new Date(new Date().getFullYear(), 6, 1); // July 1

function isLocked(): boolean {
  return isAfterJuly1();
}

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ─── Blank presenter factory ──────────────────────────────────────────────────

function blankPresenter(): Omit<Presenter, 'savedAt' | 'headshotUrl'> & {
  headshotUrl: string;
  savedAt: string;
  _file?: File;
  _preview?: string;
} {
  return {
    id: generateId(),
    name: '',
    title: '',
    company: '',
    bio: '',
    email: '',
    headshotUrl: '',
    savedAt: '',
  };
}

// ─── Types for local draft state ─────────────────────────────────────────────

type DraftPresenter = Presenter & {
  _file?: File;       // pending upload (not yet in Storage)
  _preview?: string;  // data URL for preview before upload
  _open: boolean;     // card expanded?
  _saving: boolean;   // save in progress?
  _confirmDelete: boolean; // inline delete confirmation shown?
  _errors: Record<string, string>; // field-level validation errors
};

// ─── Headshot validation ──────────────────────────────────────────────────────

function validateHeadshot(file: File): string | null {
  if (!ACCEPTED_MIME.includes(file.type)) {
    return 'Only JPEG and PNG files are accepted. PDF files are not accepted.';
  }
  if (file.size < MIN_HEADSHOT_BYTES) {
    return `File is too small (${(file.size / 1024).toFixed(0)} KB). Minimum size is 75 KB.`;
  }
  if (file.size > MAX_HEADSHOT_BYTES) {
    return `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum size is 10 MB.`;
  }
  return null;
}

// ─── PresenterCard ────────────────────────────────────────────────────────────

type PresenterCardProps = {
  draft: DraftPresenter;
  index: number;
  locked: boolean;
  onUpdate: (id: string, patch: Partial<DraftPresenter>) => void;
  onSave: (id: string) => Promise<void>;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

function PresenterCard({ draft, index, locked, onUpdate, onSave, onEdit, onDelete }: PresenterCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wordCount = countWords(draft.bio);
  const bioOver = wordCount > MAX_BIO_WORDS;

  const isComplete =
    draft.name.trim() !== '' &&
    draft.title.trim() !== '' &&
    draft.company.trim() !== '' &&
    draft.bio.trim() !== '' &&
    !bioOver &&
    (draft.headshotUrl !== '' || !!draft._file);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const error = validateHeadshot(file);
    if (error) {
      onUpdate(draft.id, { _errors: { ...draft._errors, headshot: error } });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      onUpdate(draft.id, {
        _file: file,
        _preview: ev.target?.result as string,
        _errors: { ...draft._errors, headshot: '' },
      });
    };
    reader.readAsDataURL(file);
  };

  // — Collapsed summary —
  if (!draft._open && draft.savedAt) {
    return (
      <Card className={cn('border-border', draft._confirmDelete && 'border-red-300 bg-red-50/50')}>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3 min-w-0">
            {draft.headshotUrl || draft._preview ? (
              <img
                src={draft._preview ?? draft.headshotUrl}
                alt={draft.name}
                className="h-9 w-9 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                <span className="text-xs font-medium text-muted-foreground">
                  {draft.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              {draft._confirmDelete ? (
                <p className="text-sm font-medium text-red-600">
                  Remove {draft.name}? This cannot be undone.
                </p>
              ) : (
                <>
                  <p className="text-sm font-semibold truncate">{draft.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {draft.title} · {draft.company}
                  </p>
                </>
              )}
            </div>
          </div>

          {!locked && (
            <div className="flex items-center gap-2 shrink-0">
              {draft._confirmDelete ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUpdate(draft.id, { _confirmDelete: false })}
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(draft.id)}
                    className="h-8 px-2 bg-red-500 text-white hover:bg-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(draft.id)}
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUpdate(draft.id, { _confirmDelete: true })}
                    className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // — Expanded form —
  return (
    <Card className="border-primary/30">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-muted-foreground shrink-0">
            Presenter {index + 1}
          </p>
          {!locked && (
            draft.savedAt ? (
              // Saved card — X collapses to summary (trash + confirmation appear there)
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUpdate(draft.id, { _open: false })}
                className="h-7 w-7 p-0 text-muted-foreground shrink-0"
                title="Collapse"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : draft._confirmDelete ? (
              // Unsaved card — confirmation step
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-red-600 font-medium">Discard this presenter?</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUpdate(draft.id, { _confirmDelete: false })}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(draft.id)}
                  className="h-7 px-2 text-xs bg-red-500 text-white hover:bg-red-600"
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Discard
                </Button>
              </div>
            ) : (
              // Unsaved card — first click sets confirmation
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUpdate(draft.id, { _confirmDelete: true })}
                className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 text-xs shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
              </Button>
            )
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              value={draft.name}
              onChange={(e) => onUpdate(draft.id, { name: e.target.value })}
              placeholder="Jane Smith"
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                draft._errors?.name ? 'border-red-400' : 'border-border'
              )}
              disabled={locked}
            />
            {draft._errors?.name && (
              <p className="text-xs text-red-500">{draft._errors.name}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              value={draft.title}
              onChange={(e) => onUpdate(draft.id, { title: e.target.value })}
              placeholder="VP of Finance"
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                draft._errors?.title ? 'border-red-400' : 'border-border'
              )}
              disabled={locked}
            />
            {draft._errors?.title && (
              <p className="text-xs text-red-500">{draft._errors.title}</p>
            )}
          </div>

          {/* Company */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              Company <span className="text-red-500">*</span>
            </label>
            <input
              value={draft.company}
              onChange={(e) => onUpdate(draft.id, { company: e.target.value })}
              placeholder="Acme Corp"
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                draft._errors?.company ? 'border-red-400' : 'border-border'
              )}
              disabled={locked}
            />
            {draft._errors?.company && (
              <p className="text-xs text-red-500">{draft._errors.company}</p>
            )}
          </div>

          {/* Email (optional) */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              Email <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="email"
              value={draft.email ?? ''}
              onChange={(e) => onUpdate(draft.id, { email: e.target.value })}
              placeholder="jane@company.com"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={locked}
            />
          </div>

          {/* Bio */}
          <div className="space-y-1 sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                Bio <span className="text-red-500">*</span>
              </label>
              <span className={cn('text-xs tabular-nums', bioOver ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
                {wordCount} / {MAX_BIO_WORDS} words
              </span>
            </div>
            <textarea
              value={draft.bio}
              onChange={(e) => onUpdate(draft.id, { bio: e.target.value })}
              placeholder="A brief professional biography highlighting relevant experience and expertise."
              rows={4}
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none',
                bioOver ? 'border-red-400' : 'border-border'
              )}
              disabled={locked}
            />
            {bioOver && (
              <p className="text-xs text-red-500">
                Bio exceeds {MAX_BIO_WORDS} words. Please shorten it.
              </p>
            )}
          </div>

          {/* Headshot */}
          <div className="space-y-1 sm:col-span-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-foreground">
                Headshot <span className="text-red-500">*</span>
              </label>
              {/* Tooltip */}
              <span
                className="cursor-help text-muted-foreground"
                title="Must be at least 75KB. Passport-style or professional headshot recommended. PDF files are not accepted."
              >
                <AlertCircle className="h-3.5 w-3.5" />
              </span>
            </div>

            {(draft._preview || draft.headshotUrl) ? (
              <div className="flex items-center gap-3">
                <img
                  src={draft._preview ?? draft.headshotUrl}
                  alt="Headshot preview"
                  className="h-16 w-16 rounded-lg object-cover border"
                />
                {!locked && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" /> Replace
                  </Button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => !locked && fileInputRef.current?.click()}
                disabled={locked}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                  locked
                    ? 'border-border cursor-not-allowed opacity-50'
                    : 'border-border hover:border-primary/50 hover:bg-accent/30 cursor-pointer'
                )}
              >
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Click to upload headshot
                </span>
                <span className="text-xs text-muted-foreground">
                  JPEG or PNG · 75 KB – 10 MB
                </span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleFileChange}
            />

            {draft._errors?.headshot && (
              <p className="flex items-center gap-1.5 text-xs text-red-500">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {draft._errors.headshot}
              </p>
            )}
          </div>
        </div>

        {/* Save button */}
        {!locked && (
          <Button
            className="w-full"
            onClick={() => onSave(draft.id)}
            disabled={!isComplete || draft._saving}
          >
            {draft._saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {draft.savedAt ? 'Update Presenter' : 'Save Presenter'}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── PresenterSection (main export) ──────────────────────────────────────────

type PresenterSectionProps = {
  submission: Submission;
};

export default function PresenterSection({ submission }: PresenterSectionProps) {
  const { updateSubmission } = useSubmissions();
  const storage = useStorage();
  const { toast } = useToast();
  const locked = isLocked();

  // Initialise local drafts from Firestore data (or empty first card)
  const [drafts, setDrafts] = useState<DraftPresenter[]>(() => {
    if (submission.presenters && submission.presenters.length > 0) {
      return submission.presenters.map((p) => ({
        ...p,
        _open: false,
        _saving: false,
        _confirmDelete: false,
        _errors: {},
      }));
    }
    return locked
      ? []
      : [{ ...blankPresenter(), _open: true, _saving: false, _confirmDelete: false, _errors: {} }];
  });

  const updateDraft = useCallback((id: string, patch: Partial<DraftPresenter>) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
    );
  }, []);

  const handleEdit = useCallback((id: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, _open: true } : d))
    );
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const updated = drafts.filter((d) => d.id !== id);
      setDrafts(updated);
      const firestorePresenters = updated.map(({ _open, _saving, _confirmDelete, _errors, _file, _preview, ...p }) => p);
      await updateSubmission({
        ...submission,
        presenters: firestorePresenters,
        // presentersAdded stays as-is — never reverts
      });
    },
    [drafts, submission, updateSubmission]
  );

  const handleSave = useCallback(
    async (id: string) => {
      const draft = drafts.find((d) => d.id === id);
      if (!draft) return;

      // Validate required fields
      const errors: Record<string, string> = {};
      if (!draft.name.trim()) errors.name = 'Full name is required.';
      if (!draft.title.trim()) errors.title = 'Title is required.';
      if (!draft.company.trim()) errors.company = 'Company is required.';
      if (!draft.bio.trim()) errors.bio = 'Bio is required.';
      if (countWords(draft.bio) > MAX_BIO_WORDS) errors.bio = `Bio must be ${MAX_BIO_WORDS} words or fewer.`;
      if (!draft.headshotUrl && !draft._file) errors.headshot = 'A headshot is required.';

      if (Object.keys(errors).length > 0) {
        updateDraft(id, { _errors: errors });
        return;
      }

      updateDraft(id, { _saving: true, _errors: {} });

      try {
        let headshotUrl = draft.headshotUrl;

        // Upload headshot if a new file was selected
        if (draft._file) {
          const path = `headshots/${submission.id}/${draft.id}`;
          const storageRef = ref(storage, path);
          await uploadBytes(storageRef, draft._file);
          headshotUrl = await getDownloadURL(storageRef);
        }

        const savedPresenter: Presenter = {
          id: draft.id,
          name: draft.name.trim(),
          title: draft.title.trim(),
          company: draft.company.trim(),
          bio: draft.bio.trim(),
          headshotUrl,
          // Omit email entirely if empty — Firestore rejects undefined values
          ...(draft.email?.trim() ? { email: draft.email.trim() } : {}),
          savedAt: new Date().toISOString(),
        };

        // Update local drafts
        const updatedDrafts = drafts.map((d) =>
          d.id === id
            ? { ...savedPresenter, _open: false, _saving: false, _confirmDelete: false, _errors: {}, _file: undefined, _preview: undefined }
            : d
        );
        setDrafts(updatedDrafts);

        // Build Firestore payload
        const firestorePresenters = updatedDrafts.map(({ _open, _saving, _confirmDelete, _errors, _file, _preview, ...p }) => p);

        // presentersAdded flips to true the moment we have at least one saved presenter.
        // Read from firestorePresenters (ground truth for this write) not the stale submission prop.
        const shouldSetPresentersAdded = !submission.presentersAdded && firestorePresenters.length > 0;

        await updateSubmission({
          ...submission,
          presenters: firestorePresenters,
          ...(shouldSetPresentersAdded ? { presentersAdded: true } : {}),
        });

        toast({
          title: shouldSetPresentersAdded ? 'Presenter saved' : 'Presenter updated',
          description: `${savedPresenter.name}'s information has been ${shouldSetPresentersAdded ? 'saved' : 'updated'}.`,
        });
      } catch (err) {
        console.error('Presenter save error:', err);
        updateDraft(id, { _saving: false });
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description: 'Could not save presenter information. Please try again.',
        });
      }
    },
    [drafts, submission, storage, updateSubmission, updateDraft, toast]
  );

  const handleAddPresenter = () => {
    if (drafts.length >= MAX_PRESENTERS) return;
    setDrafts((prev) => [
      ...prev,
      { ...blankPresenter(), _open: true, _saving: false, _confirmDelete: false, _errors: {} },
    ]);
  };

  return (
    <div className="space-y-4">
      {/* Presenter cards */}
      {drafts.map((draft, idx) => (
        <PresenterCard
          key={draft.id}
          draft={draft}
          index={idx}
          locked={locked}
          onUpdate={updateDraft}
          onSave={handleSave}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}

      {/* Empty state when locked with no presenters */}
      {locked && drafts.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No presenters were added before the July 6 deadline.
        </p>
      )}

      {/* Add presenter button */}
      {!locked && drafts.length < MAX_PRESENTERS && (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleAddPresenter}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Presenter {drafts.length > 0 ? `(${drafts.length}/${MAX_PRESENTERS})` : ''}
        </Button>
      )}

      {/* Footer note */}
      <p className="text-xs text-muted-foreground pt-1">
        Presenter information can be updated until July 6, {LOCK_DATE.getFullYear()}.{' '}
        After that date, contact{' '}
        <a
          href="mailto:connect@cre8iongroup.com"
          className="font-medium text-primary hover:underline"
        >
          connect@cre8iongroup.com
        </a>{' '}
        to request changes.
      </p>
    </div>
  );
}
