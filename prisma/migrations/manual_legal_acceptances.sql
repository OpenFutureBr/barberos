CREATE TABLE "legal_acceptances" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "legal_name" TEXT,
    "cnpj" TEXT,
    "email" TEXT,
    "responsible_name" TEXT,
    "document_version" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_legal_acceptances_organizationId" ON "legal_acceptances"("organization_id");

ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
