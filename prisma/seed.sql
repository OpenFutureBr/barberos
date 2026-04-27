INSERT INTO users (id, name, email, role, "employmentType", "isActive", "serviceZoneAreas", "createdAt", "updatedAt")
VALUES ('admin001', 'Admin BarberOS', 'admin@barberos.com', 'ADMIN', 'CLT', true, '{}', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;