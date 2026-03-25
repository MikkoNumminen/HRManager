-- Performance indexes: add missing indexes on foreign keys and frequently queried columns.
-- These indexes eliminate sequential scans on large tables (10k+ rows) and speed up
-- JOIN, WHERE, and ORDER BY operations across the application.

-- Person: email lookups (login linking, uniqueness checks) and name ordering
CREATE INDEX "Person_email_idx" ON "Person"("email");
CREATE INDEX "Person_name_idx" ON "Person"("name");

-- Department: headId FK (queried when listing departments with head info)
CREATE INDEX "Department_headId_idx" ON "Department"("headId");

-- Team: FK indexes for manager and department lookups
CREATE INDEX "Team_teamManagerId_idx" ON "Team"("teamManagerId");
CREATE INDEX "Team_departmentId_idx" ON "Team"("departmentId");

-- TeamMember: standalone indexes on FKs (unique constraint exists on composite, but
-- individual column indexes are needed for single-column WHERE clauses)
CREATE INDEX "TeamMember_personId_idx" ON "TeamMember"("personId");
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");

-- ReviewCycle: templateId FK
CREATE INDEX "ReviewCycle_templateId_idx" ON "ReviewCycle"("templateId");

-- ReviewRequest: subjectId for "my reviews" queries, sessionId for session filtering
CREATE INDEX "ReviewRequest_subjectId_idx" ON "ReviewRequest"("subjectId");
CREATE INDEX "ReviewRequest_sessionId_idx" ON "ReviewRequest"("sessionId");

-- LeaveRequest: date range for overlap checks, reviewerId for reviewer lookups
CREATE INDEX "LeaveRequest_startDate_endDate_idx" ON "LeaveRequest"("startDate", "endDate");
CREATE INDEX "LeaveRequest_reviewerId_idx" ON "LeaveRequest"("reviewerId");

-- LeaveBalance: leaveTypeId FK for balance lookups by type
CREATE INDEX "LeaveBalance_leaveTypeId_idx" ON "LeaveBalance"("leaveTypeId");
