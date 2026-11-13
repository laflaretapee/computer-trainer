/**
 * tests/gamification.test.js
 * Comprehensive Unit and Integration Test Suite for Gamification System (Feature F14).
 * Tests XP calculation across typing, mouse, and tests, 5 progressive levels,
 * 5 core achievements, badge awarding, getUserStats, and UI rendering.
 */

'use strict';

const assertHelper = require('./helpers/assert');
const {
  assert,
  assertEquals,
  assertNotEquals,
  assertDeepEquals,
  assertTrue,
  assertFalse,
  assertNotNull,
  assertContains
} = assertHelper;

const { setupBrowserEnv, teardownBrowserEnv, MockEvent } = require('./helpers/dom_env');
const Gamification = require('../modules/gamification');

describe('Milestone 4 — Gamification System (Feature F14)', () => {

  let env;

  beforeEach(() => {
    env = setupBrowserEnv();
    env.loadAppStack();
    localStorage.clear();
  });

  afterEach(() => {
    teardownBrowserEnv();
  });

  describe('1. XP Calculation Engine', () => {
    test('Typing XP calculates base, speed bonus, and accuracy tiers correctly', () => {
      // 100 CPM, 100% accuracy: base(15) + speed(30) + acc(20) = 65 XP
      const xpPerfect = Gamification.calculateActivityXp('typing', { speed: 100, accuracy: 100 });
      assertEquals(xpPerfect, 65, '100 CPM and 100% accuracy should yield 65 XP');

      // 50 CPM, 95% accuracy: base(15) + speed(15) + acc(10) = 40 XP
      const xpGood = Gamification.calculateActivityXp('typing', { speed: 50, accuracy: 95 });
      assertEquals(xpGood, 40, '50 CPM and 95% accuracy should yield 40 XP');

      // 200 CPM, 80% accuracy: base(15) + speed(max 50) + acc(0) = 65 XP
      const xpFast = Gamification.calculateActivityXp('typing', { speed: 200, accuracy: 80 });
      assertEquals(xpFast, 65, '200 CPM (capped at 50) and 80% accuracy should yield 65 XP');
    });

    test('Mouse XP calculates base, stars bonus, and score bonus correctly', () => {
      // 3 stars, 150 score: base(15) + stars(30) + score(15) = 60 XP
      const xp3Stars = Gamification.calculateActivityXp('mouse', { stars: 3, score: 150 });
      assertEquals(xp3Stars, 60, '3 stars and 150 score should yield 60 XP');

      // 1 star, 50 score: base(15) + stars(10) + score(5) = 30 XP
      const xp1Star = Gamification.calculateActivityXp('mouse', { stars: 1, score: 50 });
      assertEquals(xp1Star, 30, '1 star and 50 score should yield 30 XP');

      // 3 stars, 500 score: base(15) + stars(30) + score(capped at 30) = 75 XP
      const xpMax = Gamification.calculateActivityXp('mouse', { stars: 3, score: 500 });
      assertEquals(xpMax, 75, '3 stars and 500 score (capped at 30) should yield 75 XP');
    });

    test('Tests XP calculates base, ratio bonus, and perfect score bonus correctly', () => {
      // 5/5 perfect: base(10) + ratio(50) + perfect(15) = 75 XP
      const xpPerfect = Gamification.calculateActivityXp('tests', { score: 5, total: 5 });
      assertEquals(xpPerfect, 75, '5/5 score should yield 75 XP');

      // 3/5 score: base(10) + ratio(30) + perfect(0) = 40 XP
      const xpPass = Gamification.calculateActivityXp('tests', { score: 3, total: 5 });
      assertEquals(xpPass, 40, '3/5 score should yield 40 XP');

      // 0/5 score: base(10) + ratio(0) + perfect(0) = 10 XP
      const xpZero = Gamification.calculateActivityXp('tests', { score: 0, total: 5 });
      assertEquals(xpZero, 10, '0/5 score should yield 10 base XP');
    });
  });

  describe('2. 5 Progressive Levels Progression', () => {
    test('Level 1: Новичок (0–99 XP)', () => {
      const l0 = Gamification.calculateLevel(0);
      assertEquals(l0.level, 1);
      assertEquals(l0.title, 'Новичок');
      assertEquals(l0.minXp, 0);
      assertEquals(l0.nextXp, 100);
      assertEquals(l0.progressPercent, 0);
      assertEquals(l0.xpRemaining, 100);

      const l50 = Gamification.calculateLevel(50);
      assertEquals(l50.level, 1);
      assertEquals(l50.progressPercent, 50);
      assertEquals(l50.xpRemaining, 50);
    });

    test('Level 2: Пользователь ПК (100–299 XP)', () => {
      const l100 = Gamification.calculateLevel(100);
      assertEquals(l100.level, 2);
      assertEquals(l100.title, 'Пользователь ПК');
      assertEquals(l100.minXp, 100);
      assertEquals(l100.nextXp, 300);
      assertEquals(l100.progressPercent, 0);

      const l200 = Gamification.calculateLevel(200);
      assertEquals(l200.level, 2);
      assertEquals(l200.progressPercent, 50);
      assertEquals(l200.xpRemaining, 100);
    });

    test('Level 3: Опытный практик (300–599 XP)', () => {
      const l300 = Gamification.calculateLevel(300);
      assertEquals(l300.level, 3);
      assertEquals(l300.title, 'Опытный практик');
      assertEquals(l300.minXp, 300);
      assertEquals(l300.nextXp, 600);
      assertEquals(l300.progressPercent, 0);
    });

    test('Level 4: Мастер мыши и клавиатуры (600–999 XP)', () => {
      const l600 = Gamification.calculateLevel(600);
      assertEquals(l600.level, 4);
      assertEquals(l600.title, 'Мастер мыши и клавиатуры');
      assertEquals(l600.minXp, 600);
      assertEquals(l600.nextXp, 1000);
      assertEquals(l600.progressPercent, 0);
    });

    test('Level 5: Гуру информатики (1000+ XP)', () => {
      const l1000 = Gamification.calculateLevel(1000);
      assertEquals(l1000.level, 5);
      assertEquals(l1000.title, 'Гуру информатики');
      assertEquals(l1000.nextXp, null);
      assertEquals(l1000.progressPercent, 100);
      assertEquals(l1000.xpRemaining, 0);

      const l2500 = Gamification.calculateLevel(2500);
      assertEquals(l2500.level, 5);
      assertEquals(l2500.progressPercent, 100);
    });
  });

  describe('3. Core Achievement Badges', () => {
    test('Badges registry contains 5 core achievements', () => {
      const badges = Gamification.getBadges();
      assertEquals(badges.length, 5);
      const ids = badges.map(b => b.id);
      assertContains(ids, 'first_step');
      assertContains(ids, 'quick_fingers');
      assertContains(ids, 'mouse_master');
      assertContains(ids, 'theory_expert');
      assertContains(ids, 'speed_demon');
    });

    test('first_step triggers upon completion of any first session', () => {
      const record = {
        typing: { totalSessions: 1, sessions: [{ speed: 50, accuracy: 80 }] },
        gamification: { xp: 0, level: 1, levelTitle: 'Новичок', achievements: [] }
      };
      const unlocked = Gamification.checkAchievements(record);
      const uIds = unlocked.map(b => b.id);
      assertContains(uIds, 'first_step');
    });

    test('quick_fingers triggers when typing speed > 100 and accuracy >= 90', () => {
      const record = {
        typing: {
          totalSessions: 1,
          sessions: [{ speed: 110, accuracy: 95 }]
        },
        gamification: { xp: 0, level: 1, levelTitle: 'Новичок', achievements: [] }
      };
      const unlocked = Gamification.checkAchievements(record);
      const uIds = unlocked.map(b => b.id);
      assertContains(uIds, 'quick_fingers');
    });

    test('mouse_master triggers when all 5 mouse tasks have 3 stars', () => {
      const record = {
        mouse: {
          totalSessions: 5,
          completedTasks: {
            t1: { bestStars: 3 },
            t2: { bestStars: 3 },
            t3: { bestStars: 3 },
            t4: { bestStars: 3 },
            t5: { bestStars: 3 }
          }
        },
        gamification: { xp: 0, level: 1, levelTitle: 'Новичок', achievements: [] }
      };
      const unlocked = Gamification.checkAchievements(record);
      const uIds = unlocked.map(b => b.id);
      assertContains(uIds, 'mouse_master');
    });

    test('theory_expert triggers on 100% test score', () => {
      const record = {
        tests: {
          totalSessions: 1,
          sessions: [{ topic: 'Файлы', score: 3, total: 3 }]
        },
        gamification: { xp: 0, level: 1, levelTitle: 'Новичок', achievements: [] }
      };
      const unlocked = Gamification.checkAchievements(record);
      const uIds = unlocked.map(b => b.id);
      assertContains(uIds, 'theory_expert');
    });

    test('speed_demon triggers when total XP >= 500', () => {
      const record = {
        gamification: { xp: 520, level: 3, levelTitle: 'Опытный практик', achievements: [] }
      };
      const unlocked = Gamification.checkAchievements(record);
      const uIds = unlocked.map(b => b.id);
      assertContains(uIds, 'speed_demon');
    });
  });

  describe('4. addXP and Progression Flow', () => {
    test('addXP accumulates XP, awards badge bonus, and promotes level', () => {
      const stId = '7A-01';
      // First typing session: 120 speed, 95% accuracy
      // Activity XP: 15 + min(50, 36) + 10 = 61 XP
      // Newly unlocked badges: 'first_step' (+50 XP) and 'quick_fingers' (+50 XP)
      // Total XP should be 61 + 50 + 50 = 161 XP -> Level 2: "Пользователь ПК"
      const res = Gamification.addXP({
        studentId: stId,
        module: 'typing',
        data: { speed: 120, accuracy: 95, duration: 40 }
      });

      assertEquals(res.earnedXp, 61);
      assertEquals(res.totalXp, 161);
      assertEquals(res.level, 2);
      assertEquals(res.levelTitle, 'Пользователь ПК');
      assertEquals(res.newBadges.length, 2);

      // Verify persistent storage
      const stats = Gamification.getUserStats(stId);
      assertEquals(stats.xp, 161);
      assertEquals(stats.level, 2);
      assertEquals(stats.achievements.length, 2);
    });

    test('awardBadge manually grants badge and bonus XP without duplication', () => {
      const stId = '7A-02';
      const res1 = Gamification.awardBadge(stId, 'theory_expert');
      assertTrue(res1.success);
      assertEquals(res1.newXp, 50);

      // Second attempt to award same badge should be rejected
      const res2 = Gamification.awardBadge(stId, 'theory_expert');
      assertFalse(res2.success);
      assertEquals(res2.reason, 'already_awarded');
    });
  });

  describe('5. UI Rendering & Integration', () => {
    test('Menu HUD reflects student gamification level, XP progress bar, and badges', () => {
      const AppInstance = window.App || global.App;
      assertNotNull(AppInstance, 'App must be loaded');

      // Setup student in App
      AppInstance.state.currentStudent = { id: '7A-03', name: 'Иванов Иван', class: '7-А' };
      Gamification.addXP('7A-03', 'typing', { speed: 100, accuracy: 90 }); // earn XP

      AppInstance.showScreen('screen-menu');
      document.dispatchEvent(new MockEvent('DOMContentLoaded'));

      // Check level badge and XP badge
      const lvlBadge = document.getElementById('menu-level-badge');
      assertNotNull(lvlBadge, '#menu-level-badge must exist in DOM');
      assertContains(lvlBadge.textContent, 'Уровень');

      const xpBadge = document.getElementById('menu-xp-badge');
      assertNotNull(xpBadge, '#menu-xp-badge must exist in DOM');
      assertContains(xpBadge.textContent, 'XP');

      const fill = document.getElementById('menu-xp-fill');
      assertNotNull(fill, '#menu-xp-fill progress bar must exist');

      const badgesStrip = document.getElementById('menu-badges-strip');
      assertNotNull(badgesStrip, '#menu-badges-strip must exist');
      const badgeItems = badgesStrip.querySelectorAll('.menu-badge-item');
      assertEquals(badgeItems.length, 5, 'Menu badges strip must render all 5 achievements');
    });
  });
});
