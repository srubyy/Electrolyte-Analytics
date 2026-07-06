import { Lot } from '../models/Lot.js';
import { Panel } from '../models/Panel.js';
import { Client } from '../models/Client.js';
import { RepairStep } from '../models/RepairStep.js';

export const getDashboard = async (req, res) => {
  const { lot_no, client_name } = req.query;

  try {
    // 1. Fetch lots
    const filters = {};
    if (lot_no) {
      filters.search = String(lot_no); // search by lot_no
    }
    
    // If user provided a specific lot_no, find that exact lot, otherwise get all
    let lotsList;
    let clientId = null;

    if (lot_no) {
      const singleLot = await Lot.findByLotNo(Number(lot_no));
      lotsList = singleLot ? [singleLot] : [];
      if (singleLot) {
        clientId = singleLot.client_id;
      }
    } else {
      lotsList = await Lot.getAll();
    }

    if (client_name) {
      lotsList = lotsList.filter(l => l.client_name && l.client_name.toLowerCase().includes(client_name.toLowerCase()));
      const client = await Client.findByName(client_name);
      if (client) {
        clientId = client.id;
      }
    }

    // Load custom steps list (falls back to global defaults)
    const steps = await RepairStep.getAllForClient(clientId);
    const stepsCount = steps.length;

    let totalLots = lotsList.length;
    let totalReceived = 0;
    let totalDispatched = 0;
    let totalAvailable = 0;
    let totalPending = 0;
    const bottleneckAlerts = [];

    // 2. Accumulate metrics per lot
    for (const lot of lotsList) {
      totalReceived += lot.received_qty;

      // Count dispatched panels for this lot (current_step = stepsCount, not scrap)
      const dispCount = await Panel.countForLot(lot.id, {
        current_step: stepsCount,
        notStatus: 'Scrap'
      });
      totalDispatched += dispCount;

      // Count scrap panels for this lot
      const scrapCount = await Panel.countForLot(lot.id, {
        status: 'Scrap'
      });

      totalAvailable += (lot.received_qty - dispCount - scrapCount);
    }

    // 3. Pipeline step breakdown
    const stepBreakdown = [];
    for (const step of steps) {
      const i = step.step_no;
      let countVal = 0;
      if (lot_no) {
        countVal = await Panel.countAtStep(i, lot_no);
      } else if (client_name) {
        for (const lot of lotsList) {
          countVal += await Panel.countAtStep(i, lot.lot_no);
        }
      } else {
        countVal = await Panel.countAtStep(i, null);
      }

      stepBreakdown.push({
        step_no: i,
        step_name: step.name,
        count: countVal
      });

      // Bottleneck alert if > 10 panels are clogging a step
      if (i !== stepsCount && countVal > 10) {
        bottleneckAlerts.push({
          type: "bottleneck",
          step_no: i,
          step_name: step.name,
          count: countVal,
          message: `Bottleneck detected at Step ${i} (${step.name}): ${countVal} panels pending.`
        });
      }
    }

    totalPending = stepBreakdown.reduce((sum, item) => sum + (item.step_no !== stepsCount ? item.count : 0), 0);

    // 4. Client discrepancy alerts
    for (const lot of lotsList) {
      const shortage = lot.qty_sent - lot.received_qty;
      if (shortage > 10) {
        bottleneckAlerts.push({
          type: "discrepancy",
          lot_no: lot.lot_no,
          message: `Shortage discrepancy detected on Lot ${lot.lot_no}: Client sent ${lot.qty_sent} vs ${lot.received_qty} received (${shortage} missing).`
        });
      }
    }

    // 5. Daily activity trend (passes req.user for RLS filtering if applicable)
    const trendRows = await Panel.getDailyActivityTrend(req.user);

    res.json({
      metrics: {
        total_lots: totalLots,
        total_received: totalReceived,
        total_dispatched: totalDispatched,
        total_available: totalAvailable,
        total_pending: totalPending
      },
      pipeline: stepBreakdown,
      alerts: bottleneckAlerts,
      trend: trendRows
    });

  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: "Failed to load dashboard data." });
  }
};
