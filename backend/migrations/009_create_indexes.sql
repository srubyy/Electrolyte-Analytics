CREATE INDEX IF NOT EXISTS idx_panels_lot_id ON panels(lot_id);
CREATE INDEX IF NOT EXISTS idx_panels_barcode ON panels(barcode);
CREATE INDEX IF NOT EXISTS idx_panels_assigned_engineer ON panels(assigned_engineer_id);
CREATE INDEX IF NOT EXISTS idx_panel_logs_panel_id ON panel_logs(panel_id);
CREATE INDEX IF NOT EXISTS idx_panel_logs_engineer_id ON panel_logs(engineer_id);
CREATE INDEX IF NOT EXISTS idx_panel_logs_step_id ON panel_logs(step_id);
CREATE INDEX IF NOT EXISTS idx_lots_lot_no ON lots(lot_no);
