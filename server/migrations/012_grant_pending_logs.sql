-- Grant permissions on pending_logs and its sequence to the electrolyte_app role for RLS testing
GRANT ALL PRIVILEGES ON TABLE pending_logs TO electrolyte_app;
GRANT ALL PRIVILEGES ON SEQUENCE pending_logs_id_seq TO electrolyte_app;
