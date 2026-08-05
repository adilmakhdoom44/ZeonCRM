"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition, DragEvent } from "react";
import {
  moveProjectStageAction,
  updateProjectTermsAction,
  addProjectTaskAction,
  toggleProjectTaskAction,
  deleteProjectTaskAction,
  deleteProjectAction,
} from "@/lib/actions/projects";
import { createInvoiceFromProjectAction } from "@/lib/actions/invoices";

export type KanbanTask = {
  id: string;
  title: string;
  isDone: boolean;
};

export type KanbanProject = {
  id: string;
  name: string;
  description: string | null;
  stage: string;
  price: number | null;
  dueDate: string | null;
  completedAt: string | null;
  customerId: string;
  customerName: string;
  tasks: KanbanTask[];
};

export const STAGE_COLUMNS = [
  { key: "QUOTED", label: "Quoted", dot: "bg-sky-400" },
  { key: "CONFIRMED", label: "Confirmed", dot: "bg-violet-400" },
  { key: "IN_PROGRESS", label: "In progress", dot: "bg-brand-500" },
  { key: "REVIEW", label: "Review", dot: "bg-amber-400" },
  { key: "COMPLETED", label: "Completed", dot: "bg-emerald-500" },
  { key: "CANCELLED", label: "Cancelled", dot: "bg-slate-300" },
] as const;

function formatPrice(price: number | null) {
  if (price === null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(project: KanbanProject) {
  return (
    project.dueDate !== null &&
    new Date(project.dueDate) < new Date() &&
    project.stage !== "COMPLETED" &&
    project.stage !== "CANCELLED"
  );
}

function ProgressBar({ tasks }: { tasks: KanbanTask[] }) {
  if (tasks.length === 0) return null;
  const done = tasks.filter((t) => t.isDone).length;
  const pct = Math.round((done / tasks.length) * 100);
  return (
    <div className="mt-2.5">
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>
          {done}/{tasks.length} steps
        </span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Card({
  project,
  onOpen,
}: {
  project: KanbanProject;
  onOpen: () => void;
}) {
  const price = formatPrice(project.price);
  const due = formatDate(project.dueDate);
  const cancelled = project.stage === "CANCELLED";

  return (
    <button
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", project.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onOpen}
      className={`w-full cursor-grab rounded-lg border border-slate-200 bg-white p-3 text-left shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-shadow hover:shadow-md active:cursor-grabbing ${
        cancelled ? "opacity-60" : ""
      }`}
    >
      <p
        className={`text-sm font-medium text-slate-900 ${
          cancelled ? "line-through" : ""
        }`}
      >
        {project.name}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">{project.customerName}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {price && <span className="font-semibold text-slate-700">{price}</span>}
        {due && (
          <span className={isOverdue(project) ? "font-medium text-red-500" : "text-slate-400"}>
            {isOverdue(project) ? "Overdue · " : "Due "}
            {due}
          </span>
        )}
      </div>
      <ProgressBar tasks={project.tasks} />
    </button>
  );
}

function Column({
  stage,
  projects,
  onOpen,
  onDropProject,
}: {
  stage: (typeof STAGE_COLUMNS)[number];
  projects: KanbanProject[];
  onOpen: (id: string) => void;
  onDropProject: (projectId: string, stage: string) => void;
}) {
  const [over, setOver] = useState(false);
  const total = projects.reduce((sum, p) => sum + (p.price ?? 0), 0);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    const id = e.dataTransfer.getData("text/plain");
    if (id) onDropProject(id, stage.key);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={`flex w-64 shrink-0 flex-col rounded-xl border p-2 transition-colors ${
        over ? "border-brand-500 bg-brand-50" : "border-transparent bg-slate-100/70"
      }`}
    >
      <div className="flex items-center justify-between px-2 py-1.5">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            {stage.label}
          </span>
          <span className="text-xs text-slate-400">{projects.length}</span>
        </div>
        {total > 0 && (
          <span className="text-[11px] font-medium text-slate-400">
            {formatPrice(total)}
          </span>
        )}
      </div>
      <div className="flex min-h-24 flex-col gap-2 p-1">
        {projects.map((p) => (
          <Card key={p.id} project={p} onOpen={() => onOpen(p.id)} />
        ))}
        {projects.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-slate-400">
            Drop projects here
          </p>
        )}
      </div>
    </div>
  );
}

function ProjectOverlay({
  project,
  onClose,
  onMove,
}: {
  project: KanbanProject;
  onClose: () => void;
  onMove: (projectId: string, stage: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [taskTitle, setTaskTitle] = useState("");
  const terminal = project.stage === "COMPLETED" || project.stage === "CANCELLED";

  function move(stage: string) {
    onMove(project.id, stage);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-16 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2
              className={`text-lg font-semibold text-slate-900 ${
                project.stage === "CANCELLED" ? "line-through" : ""
              }`}
            >
              {project.name}
            </h2>
            <Link
              href={`/customers/${project.customerId}`}
              className="text-sm text-slate-500 hover:text-brand-600"
            >
              {project.customerName}
            </Link>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {project.description && (
            <p className="text-sm whitespace-pre-wrap text-slate-600">{project.description}</p>
          )}

          {/* Stage */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Stage
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STAGE_COLUMNS.map((s) => (
                <button
                  key={s.key}
                  disabled={isPending}
                  onClick={() => move(s.key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                    project.stage === s.key
                      ? "bg-ink-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {project.completedAt && (
              <p className="mt-2 text-xs text-emerald-600">
                Completed on {formatDate(project.completedAt)}
              </p>
            )}
          </div>

          {/* Price & deadline */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Terms
            </p>
            <form
              action={(fd) => startTransition(() => updateProjectTermsAction(project.id, fd))}
              className="flex flex-wrap items-end gap-3"
            >
              <label className="block">
                <span className="mb-1 block text-xs text-slate-500">Fixed price (USD)</span>
                <input
                  name="price"
                  inputMode="decimal"
                  defaultValue={project.price ?? ""}
                  placeholder="e.g. 12000"
                  className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-2 focus:outline-brand-100"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-500">Deadline</span>
                <input
                  name="dueDate"
                  type="date"
                  defaultValue={project.dueDate ? project.dueDate.slice(0, 10) : ""}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-2 focus:outline-brand-100"
                />
              </label>
              <button
                disabled={isPending}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Save
              </button>
              {isOverdue(project) && (
                <span className="pb-2 text-xs font-medium text-red-500">Overdue</span>
              )}
            </form>
          </div>

          {/* Steps */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Steps
            </p>
            <ul className="space-y-1">
              {project.tasks.map((task) => (
                <li key={task.id} className="group flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={task.isDone}
                    disabled={isPending}
                    onChange={() => startTransition(() => toggleProjectTaskAction(task.id))}
                    className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                  />
                  <span
                    className={`flex-1 text-sm ${
                      task.isDone ? "text-slate-400 line-through" : "text-slate-700"
                    }`}
                  >
                    {task.title}
                  </span>
                  <button
                    disabled={isPending}
                    onClick={() => startTransition(() => deleteProjectTaskAction(task.id))}
                    className="text-slate-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                    aria-label={`Remove step ${task.title}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
              {project.tasks.length === 0 && (
                <li className="text-sm text-slate-400">No steps yet — break the work down below.</li>
              )}
            </ul>
            <form
              action={(fd) => {
                setTaskTitle("");
                startTransition(() => addProjectTaskAction(project.id, fd));
              }}
              className="mt-2.5 flex gap-2"
            >
              <input
                name="title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Add a step…"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-2 focus:outline-brand-100"
              />
              <button
                disabled={isPending || !taskTitle.trim()}
                className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Add
              </button>
            </form>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
          <div className="flex gap-2">
            {!terminal && (
              <>
                <button
                  disabled={isPending}
                  onClick={() => move("COMPLETED")}
                  className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  ✓ Mark completed
                </button>
                <button
                  disabled={isPending}
                  onClick={() => move("CANCELLED")}
                  className="rounded-lg border border-red-200 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Cancel project
                </button>
              </>
            )}
            {terminal && (
              <button
                disabled={isPending}
                onClick={() => move("IN_PROGRESS")}
                className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Reopen
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <form action={createInvoiceFromProjectAction}>
              <input type="hidden" name="projectId" value={project.id} />
              <button
                disabled={isPending}
                className="text-sm font-medium text-slate-500 hover:text-brand-600 disabled:opacity-50"
              >
                Invoice this
              </button>
            </form>
            <Link
              href={`/projects/${project.id}/edit`}
              className="text-sm font-medium text-slate-500 hover:text-brand-600"
            >
              Full edit
            </Link>
            <form
              action={(fd) => {
                onClose();
                startTransition(() => deleteProjectAction(fd));
              }}
            >
              <input type="hidden" name="id" value={project.id} />
              <button
                disabled={isPending}
                className="text-sm font-medium text-slate-400 hover:text-red-500"
              >
                Delete
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export function KanbanBoard({
  projects,
  focusId,
}: {
  projects: KanbanProject[];
  focusId?: string;
}) {
  // Opening straight onto a card lets other pages (a converted proposal, say)
  // hand the user to the project they just created.
  const [selectedId, setSelectedId] = useState<string | null>(focusId ?? null);
  const [, startTransition] = useTransition();
  // Cards move instantly; the optimistic state reverts to server data once the
  // action's revalidation lands, so it can never mask fresher server state.
  const [effective, applyMove] = useOptimistic(
    projects,
    (state, { id, stage }: { id: string; stage: string }) =>
      state.map((p) => (p.id === id ? { ...p, stage } : p))
  );
  const selected = effective.find((p) => p.id === selectedId) ?? null;

  function moveProject(projectId: string, stage: string) {
    startTransition(async () => {
      applyMove({ id: projectId, stage });
      await moveProjectStageAction(projectId, stage);
    });
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGE_COLUMNS.map((stage) => (
          <Column
            key={stage.key}
            stage={stage}
            projects={effective.filter((p) => p.stage === stage.key)}
            onOpen={setSelectedId}
            onDropProject={moveProject}
          />
        ))}
      </div>
      {selected && (
        <ProjectOverlay
          project={selected}
          onClose={() => setSelectedId(null)}
          onMove={moveProject}
        />
      )}
    </>
  );
}
