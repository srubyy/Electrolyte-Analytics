import { Lot } from '../models/Lot.js';
import { Panel } from '../models/Panel.js';

const STEP_NAMES = [
  "Inward",
  "Segregation",
  "Programming",
  "1st Testing",
  "Debug",
  "Entry",
  "Cleaning",
  "QC After Cleaning",
  "Marking & Coating",
  "Final Testing",
  "Packing",
  "Final Entry"
];

export const getDashboard = async (req, res) => {
  const { lot_no } = req.query;

  try {
    // 1. Fetch lots
    const filters = {};
    if (lot_no) {
      filters.search = String(lot_no); // search by lot_no
    }
    
    // If user provided a specific lot_no, find that exact lot, otherwise get all
    let lotsList;
    if (lot_no) {
      const singleLot = await Lot.findByLotNo(Number(lot_no));
      lotsList = singleLot ? [singleLot] : [];
    } else {
      lotsList = await Lot.getAll();
    }

    let totalLots = lotsList.length;
    let totalReceived = 0;
    let totalDispatched = 0;
    let totalAvailable = 0;
    let totalPending = 0;
    const bottleneckAlerts = [];

    // 2. Accumulate metrics per lot
    for (const lot of lotsList) {
      totalReceived += lot.received_qty;

      // Count dispatched panels for this lot (current_step = 12, not scrap)
      const dispCount = await Panel.countForLot(lot.id, {
        current_step: 12,
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
    for (let i = 1; i <= 12; i++) {
      const countVal = await Panel.countAtStep(i, lot_no || null);

      stepBreakdown.push({
        step_no: i,
        step_name: STEP_NAMES[i - 1],
        count: countVal
      });

      // Bottleneck alert if > 10 panels are clogging a step
      if (i !== 12 && countVal > 10) {
        bottleneckAlerts.push({
          type: "bottleneck",
          step_no: i,
          step_name: STEP_NAMES[i - 1],
          count: countVal,
          message: `Bottleneck detected at Step ${i} (${STEP_NAMES[i - 1]}): ${countVal} panels pending.`
        });
      }
    }

    totalPending = stepBreakdown.reduce((sum, item) => sum + (item.step_no !== 12 ? item.count : 0), 0);

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
