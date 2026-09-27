const assert = require('node:assert/strict');

global.CustomEvent = class CustomEvent {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
};
global.window = { dispatchEvent() {} };

const initial = {
  company: { id: 'company_demo', name: 'Demo' },
  session: { activeMemberId: 'manager' },
  settings: { edition: 'ultra' },
  members: [
    { id: 'manager', name: 'Conducteur', role: 'site_manager', status: 'active', projectAccessMode: 'all', projectAccessIds: [], availability: { weeklyHours: 39, workingDays: [1,2,3,4,5], unavailablePeriods: [] } },
    { id: 'worker', name: 'Ouvrier', role: 'worker', status: 'active', projectAccessMode: 'assigned', projectAccessIds: [], availability: { weeklyHours: 35, workingDays: [1,2,3,4,5], unavailablePeriods: [] } }
  ],
  projects: [{ id: 'p1', name: 'Chantier 1', status: 'planned' }],
  assignments: [{ id: 'a1', projectId: 'p1', memberIds: ['worker'], crewIds: [], title: 'Couverture', start: '2026-09-27T08:00:00Z', end: '2026-09-27T16:00:00Z' }],
  crews: [],
  reports: [{ id: 'r1', projectId: 'p1', authorId: 'worker', date: '2026-09-27T15:00:00Z', progress: 50, summary: 'Travaux avancés', problems: '', materials: '' }],
  messages: [],
  requests: [],
  notifications: [],
  planningV17: { weather: [], milestones: [], needs: [] }
};

const store = {
  state: structuredClone(initial),
  getState() { return structuredClone(this.state); },
  update(mutator) { mutator(this.state); },
};
window.__SpeedArtiDemo = { store };

require('../planning-v18-core.js');
const core = window.SpeedArtiConductor;
assert.ok(core, 'API Conducteur absente');

const point = core.createPoint({ projectId: 'p1', type: 'non_conformity', description: 'Fixation à reprendre', priority: 'high' });
assert.equal(point.status, 'open');
core.transitionPoint(point.id, 'corrective_action', 'Reprendre les fixations');
core.transitionPoint(point.id, 'corrected');
core.transitionPoint(point.id, 'controlled');
const validatedPoint = core.transitionPoint(point.id, 'validated');
assert.equal(validatedPoint.status, 'validated');

const template = core.createChecklistTemplate({
  name: 'Contrôle support',
  blocking: true,
  items: [{ label: 'Support conforme', required: true, requiresPhoto: false }]
});
const run = core.startChecklist({ projectId: 'p1', templateId: template.id });
core.answerChecklist(run.id, run.answers[0].itemId, { answer: 'no', comment: 'À reprendre' });
const completed = core.completeChecklist(run.id);
assert.equal(completed.status, 'completed_with_issues');
let state = store.getState();
assert.ok(state.conductorV18.validations.some(v => v.entityType === 'checklist_run' && v.status === 'pending'));

const meeting = core.createMeeting({ projectId: 'p1', title: 'Réunion hebdo', participantIds: ['manager','worker'], notes: 'Décision à prendre' });
core.updateMeeting(meeting.id, { decisions: [{ text: 'Valider la reprise' }], actions: [{ text: 'Corriger', assigneeId: 'worker', dueAt: '2026-09-28' }] });
core.prepareMeetingMinutes(meeting.id);
state = store.getState();
const meetingValidation = state.conductorV18.validations.find(v => v.entityType === 'meeting_minutes' && v.entityId === meeting.id && v.status === 'pending');
assert.ok(meetingValidation);
core.reviewValidation(meetingValidation.id, 'approved');
state = store.getState();
assert.equal(state.conductorV18.meetings.find(m => m.id === meeting.id).minutesStatus, 'approved');

const journal = core.prepareDailyJournal('p1', '2026-09-27T12:00:00Z');
state = store.getState();
const journalValidation = state.conductorV18.validations.find(v => v.entityType === 'site_journal' && v.entityId === journal.id && v.status === 'pending');
assert.ok(journalValidation);
core.reviewValidation(journalValidation.id, 'approved');
state = store.getState();
assert.equal(state.conductorV18.journals.find(j => j.id === journal.id).status, 'approved');

const planA = core.registerPlan({ projectId: 'p1', name: 'Plan toiture', revisionLabel: 'A', status: 'active', fileName: 'a.pdf', mimeType: 'application/pdf', documentId: 'docA' });
const planB = core.registerPlan({ projectId: 'p1', name: 'Plan toiture', revisionLabel: 'B', status: 'validated', fileName: 'b.pdf', mimeType: 'application/pdf', documentId: 'docB' });
core.setPlanStatus(planB.id, 'active');
state = store.getState();
assert.equal(state.conductorV18.plans.find(p => p.id === planB.id).active, true);
assert.equal(state.conductorV18.plans.find(p => p.id === planA.id).status, 'replaced');
assert.ok(state.notifications.some(n => n.title === 'Nouvelle révision active'));

console.log(JSON.stringify({ ok: true, points: state.conductorV18.points.length, validations: state.conductorV18.validations.length, plans: state.conductorV18.plans.length }));