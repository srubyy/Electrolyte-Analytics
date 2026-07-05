import pool, { isFallback } from '../config/db.js';
import { User } from '../models/User.js';
import * as memoryDb from '../services/memoryDb.js';

export const getEngineers = async (req, res) => {
  try {
    const list = await User.getEmployees();
    res.json(list);
  } catch (err) {
    console.error('Engineers list fetch error:', err);
    res.status(500).json({ error: "Failed to fetch engineer profiles." });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const employees = await User.getEmployees();
    const scores = [];

    // Helper step_id resolver for SQL mode
    let stepId11 = null;
    if (!isFallback()) {
      const stepRes = await pool.query('SELECT id FROM repair_steps WHERE step_no = 11');
      if (stepRes.rowCount > 0) stepId11 = stepRes.rows[0].id;
    }

    for (const eng of employees) {
      let pcbsRepaired = 0;
      let faultyCount = 0;
      let totalCount = 0;
      let speedCount = 0;

      if (isFallback()) {
        const logs = memoryDb.tables.panel_logs.filter(l => l.engineer_id === eng.id);
        
        // 1. PCBs Repaired (Step 11 complete)
        const step11Logs = logs.filter(l => {
          const step = memoryDb.tables.repair_steps.find(s => s.id === l.step_id);
          return step && step.step_no === 11;
        });
        const uniquePanelsRep = new Set(step11Logs.map(l => l.panel_id));
        pcbsRepaired = uniquePanelsRep.size;

        // 2. First-pass Yield
        faultyCount = logs.filter(l => l.status === 'Faulty').length;
        totalCount = logs.length;

        // 3. Speed Score (Logs in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        speedCount = logs.filter(l => new Date(l.timestamp) >= thirtyDaysAgo).length;

      } else {
        // 1. PCBs Repaired (Step 11 complete)
        const repRes = await pool.query(`
          SELECT COUNT(DISTINCT panel_id) FROM panel_logs 
          WHERE engineer_id = $1 AND step_id = $2
        `, [eng.id, stepId11 || 11]);
        pcbsRepaired = parseInt(repRes.rows[0].count);

        // 2. First-pass Yield
        const qualRes = await pool.query(`
          SELECT 
            COUNT(CASE WHEN status = 'Faulty' THEN 1 END) as faulty_count,
            COUNT(*) as total_count
          FROM panel_logs
          WHERE engineer_id = $1
        `, [eng.id]);
        faultyCount = parseInt(qualRes.rows[0].faulty_count || 0);
        totalCount = parseInt(qualRes.rows[0].total_count || 0);

        // 3. Speed Score
        const speedRes = await pool.query(`
          SELECT COUNT(*) FROM panel_logs 
          WHERE engineer_id = $1 AND timestamp >= NOW() - INTERVAL '30 days'
        `, [eng.id]);
        speedCount = parseInt(speedRes.rows[0].count);
      }

      // Calculations matching exact specs
      const pcbRepairedPoints = Math.min((pcbsRepaired / 15) * 100, 100);
      const firstPassYield = totalCount > 0 ? ((totalCount - faultyCount) / totalCount) * 100 : 100.0;
      const speedScorePoints = Math.min((speedCount / 40) * 100, 100);
      const attendancePct = parseFloat(eng.attendance_rate || 95.0);

      // Composite Score: (PCBs Repaired x 35%) + (First-pass Yield x 30%) + (Speed Score x 20%) + (Attendance x 15%)
      const overallScore = Math.round(
        (pcbRepairedPoints * 0.35) +
        (firstPassYield * 0.30) +
        (speedScorePoints * 0.20) +
        (attendancePct * 0.15)
      );

      scores.push({
        id: eng.id,
        name: eng.name,
        avatar: eng.avatar,
        speed: speedCount,
        quality: Math.round(firstPassYield),
        attendance: eng.attendance_rate,
        score: overallScore
      });
    }

    scores.sort((a, b) => b.score - a.score);
    res.json(scores);

  } catch (err) {
    console.error('Leaderboard calculation error:', err);
    res.status(500).json({ error: "Failed to calculate leaderboard." });
  }
};
