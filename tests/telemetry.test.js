/**
 * tests/telemetry.test.js
 * Comprehensive Unit and Integration Test Suite for Telemetry Sync & Multi-PC Aggregation (Feature F20).
 * Tests offline syncQueue, auto-POST on network recovery, queue retention on failure,
 * backup bundle export, and non-destructive deep merge.
 */

'use strict';

const assertHelper = require('./helpers/assert');
const {
  assert,
  assertEquals,
  assertDeepEquals,
  assertTrue,
  assertFalse,
  assertNotNull,
  assertContains
} = assertHelper;

const { setupBrowserEnv, teardownBrowserEnv } = require('./helpers/dom_env');
const Telemetry = require('../modules/telemetry');

describe('Milestone 4 — Telemetry & Progress Sync (Feature F20)', () => {

  let env;

  beforeEach(() => {
    env = setupBrowserEnv({ loadApp: true });
    localStorage.clear();
  });

  afterEach(() => {
    teardownBrowserEnv();
  });

  describe('1. Sync Queue Management', () => {
    test('enqueueProgress buffers structured events into localStorage["sync_queue"]', () => {
      assertEquals(Telemetry.getQueueLength(), 0);

      const evt = Telemetry.enqueueProgress('7A-01', 'typing', { speed: 120, accuracy: 98 }, { xp: 150 });
      assertNotNull(evt);
      assertEquals(evt.studentId, '7A-01');
      assertEquals(evt.module, 'typing');
      assertEquals(evt.data.speed, 120);

      assertEquals(Telemetry.getQueueLength(), 1);
      const queue = Telemetry.getSyncQueue();
      assertEquals(queue.length, 1);
      assertEquals(queue[0].id, evt.id);
    });

    test('Queue is preserved when offline or endpoint is unconfigured', async () => {
      env.setOnline(false);
      Telemetry.setEndpoint('https://school.ru/api/sync');
      Telemetry.enqueueProgress('7A-02', 'mouse', { score: 100 });

      const res = await Telemetry.processQueue(true);
      assertFalse(res.success);
      assertEquals(res.reason, 'offline');
      assertEquals(Telemetry.getQueueLength(), 1, 'Queue must remain intact');
    });
  });

  describe('2. Network Dispatch and Queue Drain', () => {
    test('Successful POST clears the sync queue and records last sync timestamp', async () => {
      env.setOnline(true);
      Telemetry.setEndpoint('https://school.ru/api/sync');
      Telemetry.enqueueProgress('7A-03', 'typing', { speed: 130 });
      Telemetry.enqueueProgress('7A-03', 'tests', { score: 5, total: 5 });

      assertEquals(Telemetry.getQueueLength(), 2);

      let capturedPayload = null;
      env.setFetchMock((url, opts) => {
        if (url === 'https://school.ru/api/sync') {
          capturedPayload = JSON.parse(opts.body);
          return {
            ok: true,
            status: 200,
            json: async () => ({ status: 'success', received: capturedPayload.eventsCount })
          };
        }
      });

      const res = await Telemetry.processQueue(true);
      assertTrue(res.success);
      assertEquals(res.sentCount, 2);
      assertEquals(Telemetry.getQueueLength(), 0, 'Queue must be cleared on success');
      assertNotNull(Telemetry.getLastSyncTime(), 'Last sync time must be recorded');
      assertNotNull(capturedPayload, 'Payload must be sent');
      assertEquals(capturedPayload.events.length, 2);
    });

    test('HTTP failure retains all events in queue without data loss', async () => {
      env.setOnline(true);
      Telemetry.setEndpoint('https://school.ru/api/sync');
      Telemetry.enqueueProgress('7A-04', 'typing', { speed: 90 });

      env.setFetchMock(() => {
        return {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        };
      });

      const res = await Telemetry.processQueue(true);
      assertFalse(res.success);
      assertEquals(Telemetry.getQueueLength(), 1, 'Queue must be retained on 500 response');
    });
  });

  describe('3. Multi-PC Non-Destructive Deep Merge', () => {
    test('mergeProgress combines sessions, takes max stats, and unions achievements', () => {
      const local = {
        '7A-05': {
          studentId: '7A-05',
          name: 'Иванов Иван',
          typing: {
            bestSpeed: 100,
            bestAccuracy: 90,
            totalSessions: 1,
            sessions: [{ date: '10.11.2026', speed: 100, accuracy: 90, level: 1, duration: 60 }]
          },
          mouse: {
            totalStars: 6,
            totalScore: 200,
            totalSessions: 2,
            sessions: [{ date: '10.11.2026', taskId: 'ex1_click', score: 100, stars: 3, time: 20 }],
            completedTasks: {
              ex1_click: { taskId: 'ex1_click', bestScore: 100, bestStars: 3, bestTime: 20 }
            }
          },
          gamification: {
            xp: 200,
            level: 2,
            levelTitle: 'Пользователь ПК',
            achievements: ['first_step']
          },
          focusViolations: 1
        }
      };

      const imported = {
        app: 'computer-trainer',
        version: '1.1.0',
        progress: {
          // Same student worked on PC-2: higher typing speed, new mouse task, new achievement
          '7A-05': {
            studentId: '7A-05',
            name: 'Иванов Иван',
            typing: {
              bestSpeed: 140,
              bestAccuracy: 95,
              totalSessions: 1,
              sessions: [{ date: '11.11.2026', speed: 140, accuracy: 95, level: 2, duration: 55 }]
            },
            mouse: {
              totalStars: 6,
              totalScore: 180,
              totalSessions: 2,
              sessions: [{ date: '11.11.2026', taskId: 'ex2_dblclick', score: 180, stars: 3, time: 15 }],
              completedTasks: {
                ex2_dblclick: { taskId: 'ex2_dblclick', bestScore: 180, bestStars: 3, bestTime: 15 }
              }
            },
            gamification: {
              xp: 350,
              level: 3,
              levelTitle: 'Опытный практик',
              achievements: ['first_step', 'quick_fingers']
            },
            focusViolations: 2
          },
          // New student only on PC-2
          '7A-06': {
            studentId: '7A-06',
            name: 'Петров Пётр',
            gamification: { xp: 120, level: 2, levelTitle: 'Пользователь ПК', achievements: ['first_step'] },
            focusViolations: 0
          }
        }
      };

      const result = Telemetry.mergeProgress(local, imported);
      assertEquals(result.addedCount, 1, '1 new student added');
      assertEquals(result.updatedCount, 1, '1 existing student merged');

      const mergedSt5 = result.merged['7A-05'];
      // Max typing stats
      assertEquals(mergedSt5.typing.bestSpeed, 140);
      assertEquals(mergedSt5.typing.bestAccuracy, 95);
      assertEquals(mergedSt5.typing.sessions.length, 2, 'Typing sessions combined');

      // Merged mouse completed tasks
      assertEquals(Object.keys(mergedSt5.mouse.completedTasks).length, 2);
      assertEquals(mergedSt5.mouse.totalStars, 6);
      assertEquals(mergedSt5.mouse.totalScore, 280);

      // Max gamification XP & union of achievements
      assertEquals(mergedSt5.gamification.xp, 350);
      assertEquals(mergedSt5.gamification.level, 3);
      assertEquals(mergedSt5.gamification.levelTitle, 'Опытный практик');
      assertContains(mergedSt5.gamification.achievements, 'first_step');
      assertContains(mergedSt5.gamification.achievements, 'quick_fingers');

      // Cumulative focus violations
      assertEquals(mergedSt5.focusViolations, 3);

      // New student added cleanly
      assertNotNull(result.merged['7A-06']);
      assertEquals(result.merged['7A-06'].name, 'Петров Пётр');
    });

    test('importBundle parses JSON string and updates localStorage', () => {
      const bundle = {
        progress: {
          '7B-01': {
            studentId: '7B-01',
            name: 'Сидоров Сидор',
            gamification: { xp: 100, level: 2, levelTitle: 'Пользователь ПК', achievements: [] }
          }
        }
      };

      Telemetry.importBundle(JSON.stringify(bundle));
      const all = JSON.parse(localStorage.getItem('trainer_progress') || '{}');
      assertNotNull(all['7B-01']);
      assertEquals(all['7B-01'].name, 'Сидоров Сидор');
    });

    test('exportBundle produces valid backup structure', () => {
      localStorage.setItem('trainer_progress', JSON.stringify({
        '7C-01': {
          typing: { totalSessions: 2 }
        }
      }));

      const bundle = Telemetry.exportBundle();
      assertEquals(bundle.app, 'computer-trainer');
      assertEquals(bundle.version, '1.1.0');
      assertNotNull(bundle.progress['7C-01']);
      assertEquals(bundle.totalStudentsWithData, 1);
    });
  });
});
