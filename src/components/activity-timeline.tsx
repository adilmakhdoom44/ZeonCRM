"use client";

import { useRef, useState, useTransition } from "react";
import {
  completeFollowUpAction,
  deleteActivityAction,
  logActivityAction,
  reopenFollowUpAction,
} from "@/lib/actions/activities";
import { Card, CardHeader, EmptyState } from "@/components/ui";

export type TimelineActivity = {
  id: string;
  type: string;
  subject: string;
  body: string | null;
  occurredAt: string;
  followUpAt: string | null;
  followUpDoneAt: string | null;
  contactName: string | null;
  projectName: string | null;
  userName: string | null;
};

const TYPE_META: Record<string, { label: string; dot: string; chip: string }> = {
  NOTE: { label: "Note", dot: "bg-slate-300", chip: "bg-slate-100 text-slate-600" },
  CALL: { label: "Call", dot: "bg-brand-500", chip: "bg-brand-50 text-brand-700" },
  MEETING: { label: "Meeting", dot: "bg-violet-500", chip: "bg-violet-50 text-violet-700" },
  EMAIL: { label: "Email", dot: "bg-sky-500", chip: "bg-sky-50 text-sky-700" },
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const fieldCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-2 focus:outline-brand-100";

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/** Due today or already past — both need doing now, so they read the same. */
function isDue(activity: TimelineActivity) {
  if (!activity.followUpAt || activity.followUpDoneAt) return false;
  const due = new Date(activity.followUpAt);
  due.setHours(23, 59, 59, 999);
  return due <= new Date(startOfToday().getTime() + 86_399_999);
}

function FollowUpChip({ activity }: { activity: TimelineActivity }) {
  if (!activity.followUpAt) return null;

  if (activity.followUpDoneAt) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        ✓ Followed up {dateFmt.format(new Date(activity.followUpDoneAt))}
      </span>
    );
  }

  const due = isDue(activity);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        due ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
      }`}
    >
      Follow up {dateFmt.format(new Date(activity.followUpAt))}
    </span>
  );
}

export function ActivityTimeline({
  customerId,
  activities,
  contacts,
  projects,
}: {
  customerId: string;
  activities: TimelineActivity[];
  contacts: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();

  function log(formData: FormData) {
    startTransition(async () => {
      const result = await logActivityAction(customerId, formData);
      if (result.ok) {
        setError(null);
        setExpanded(false);
        formRef.current?.reset();
      } else {
        setError(result.error);
      }
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader
        title="Activity"
        description="Calls, meetings and notes on this account — newest first."
      />

      <form ref={formRef} action={log} className="space-y-3 border-b border-slate-100 p-5">
        <div className="flex flex-wrap gap-3">
          <select name="type" defaultValue="NOTE" className={`${fieldCls} w-32`}>
            {Object.entries(TYPE_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <input
            name="subject"
            required
            placeholder="What happened?"
            onFocus={() => setExpanded(true)}
            className={`${fieldCls} min-w-48 flex-1`}
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Log"}
          </button>
        </div>

        {expanded && (
          <div className="space-y-3">
            <textarea
              name="body"
              rows={3}
              placeholder="Details — what was discussed, what was agreed…"
              className={`${fieldCls} w-full`}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                  When
                </span>
                <input name="occurredAt" type="date" defaultValue={today} className={`${fieldCls} w-full`} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                  Follow up
                </span>
                <input name="followUpAt" type="date" className={`${fieldCls} w-full`} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                  Contact
                </span>
                <select name="contactId" defaultValue="" className={`${fieldCls} w-full`}>
                  <option value="">Anyone</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                  Project
                </span>
                <select name="projectId" defaultValue="" className={`${fieldCls} w-full`}>
                  <option value="">None</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {activities.length === 0 ? (
        <EmptyState
          title="Nothing logged yet"
          hint="Record a call, a meeting or a note and it will show up here."
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {activities.map((activity) => {
            const meta = TYPE_META[activity.type] ?? TYPE_META.NOTE;
            return (
              <li key={activity.id} className="flex gap-3 px-5 py-4">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.chip}`}
                    >
                      {meta.label}
                    </span>
                    <p className="text-sm font-medium text-slate-900">{activity.subject}</p>
                    <FollowUpChip activity={activity} />
                  </div>

                  {activity.body && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{activity.body}</p>
                  )}

                  <p className="mt-1 text-xs text-slate-400">
                    {dateFmt.format(new Date(activity.occurredAt))}
                    {activity.contactName && <> · {activity.contactName}</>}
                    {activity.projectName && <> · {activity.projectName}</>}
                    {activity.userName && <> · logged by {activity.userName}</>}
                  </p>
                </div>

                <div className="flex shrink-0 items-start gap-3">
                  {activity.followUpAt && !activity.followUpDoneAt && (
                    <form action={completeFollowUpAction}>
                      <input type="hidden" name="id" value={activity.id} />
                      <button className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                        Mark done
                      </button>
                    </form>
                  )}
                  {activity.followUpDoneAt && (
                    <form action={reopenFollowUpAction}>
                      <input type="hidden" name="id" value={activity.id} />
                      <button className="text-xs font-medium text-slate-400 hover:text-brand-600">
                        Reopen
                      </button>
                    </form>
                  )}
                  <form
                    action={deleteActivityAction}
                    onSubmit={(e) => {
                      if (!confirm("Delete this entry? This cannot be undone.")) e.preventDefault();
                    }}
                  >
                    <input type="hidden" name="id" value={activity.id} />
                    <button
                      title="Delete entry"
                      aria-label="Delete entry"
                      className="text-slate-300 transition-colors hover:text-red-500"
                    >
                      ✕
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
