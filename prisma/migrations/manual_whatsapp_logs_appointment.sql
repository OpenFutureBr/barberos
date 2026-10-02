ALTER TABLE "whatsapp_logs" ADD COLUMN "appointment_id" TEXT;

CREATE INDEX "idx_whatsapp_logs_appointment_automation" ON "whatsapp_logs"("appointment_id", "automation_type");

ALTER TABLE "whatsapp_logs" ADD CONSTRAINT "whatsapp_logs_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
