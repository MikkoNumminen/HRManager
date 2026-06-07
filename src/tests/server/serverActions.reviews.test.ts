import { testPrisma, cleanDb } from "./testDb";

// Mock @/db to use the test database
jest.mock("@/db", () => ({
  prisma: require("./testDb").testPrisma,
}));

// Mock next-auth — it uses ESM imports that Jest can't parse in CJS mode.
// The auth module is imported transitively via permissions.ts → auth.ts → next-auth.
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

// Mock permissions — requirePermission is a no-op so server action tests focus
// on data logic. Permission resolution is tested separately in permissions.test.ts.
jest.mock("@/permissions", () => ({
  requirePermission: jest.fn(),
  seedPermissions: jest.fn(),
}));

// Mock audit logging — logAudit/deferAudit call auth() and after() which need request scope.
// Audit log behavior is tested separately.
jest.mock("@/auditLog", () => ({
  logAudit: jest.fn(),
  captureAuditContext: jest.fn().mockResolvedValue({
    userId: null,
    userEmail: null,
    sessionId: null,
  }),
  deferAudit: jest.fn(),
  deferAuditLog: jest.fn(),
}));

// Mock rate limiting — rateLimit uses next/headers which doesn't exist in tests.
// Rate limiting behavior is tested separately in rateLimit.test.ts.
jest.mock("@/rateLimit", () => ({
  rateLimit: jest.fn(),
  RateLimitError: class RateLimitError extends Error {
    constructor() {
      super("Too many requests");
      this.name = "RateLimitError";
    }
  },
}));

// Mock demo session — defaults to null (production mode).
// Individual tests override mockGetDemoSessionId to simulate demo sessions.
const mockGetDemoSessionId = jest.fn().mockResolvedValue(null);
jest.mock("@/demoSession", () => ({
  getDemoSessionId: () => mockGetDemoSessionId(),
}));

// Mock Next.js server functions — these don't exist in a test environment,
// but the server actions call them after every mutation.
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import {
  createReviewTemplate,
  deleteReviewTemplate,
  addReviewQuestion,
  removeReviewQuestion,
  createReviewCycle,
  deleteReviewCycle,
  openReviewCycle,
  closeReviewCycle,
  addReviewRequest,
  removeReviewRequest,
  submitReview,
} from "@/features/reviews/actions";

// Helper to build FormData — server actions receive form submissions,
// so we simulate that by packing key-value pairs into a FormData object.
function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.append(key, value);
  }
  return fd;
}

describe("createReviewTemplate", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // Happy path: create a template with just a name and confirm it lands in the DB
  // with an empty questions array.
  test("creates a template with name", async () => {
    await createReviewTemplate(formData({ name: "Q1 Review" }));

    const templates = await testPrisma.reviewTemplate.findMany();
    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe("Q1 Review");
    expect(templates[0].questions).toEqual([]);
  });

  // A template can optionally carry a human-readable description.
  test("creates template with description", async () => {
    await createReviewTemplate(
      formData({ name: "Annual Review", description: "Yearly performance cycle" }),
    );

    const templates = await testPrisma.reviewTemplate.findMany();
    expect(templates).toHaveLength(1);
    expect(templates[0].description).toBe("Yearly performance cycle");
  });

  // An empty name string must be rejected — the template would be unidentifiable.
  test("returns error on empty name", async () => {
    const result = await createReviewTemplate(formData({ name: "" }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Submitting the form without a name field at all must also be rejected.
  test("returns error on missing name", async () => {
    const result = await createReviewTemplate(formData({}));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // A name exceeding MAX_NAME_LENGTH characters must be rejected with nameTooLong error.
  test("returns error when name exceeds max length", async () => {
    const result = await createReviewTemplate(formData({ name: "a".repeat(256) }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

describe("deleteReviewTemplate", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // Soft-delete sets deletedAt so records are preserved for audit history.
  test("soft-deletes a template", async () => {
    const template = await testPrisma.reviewTemplate.create({
      data: { name: "To Delete", questions: [], sessionId: null },
    });

    await deleteReviewTemplate(formData({ templateId: template.id }));

    const found = await testPrisma.reviewTemplate.findUnique({ where: { id: template.id } });
    expect(found!.deletedAt).not.toBeNull();
  });

  // Attempting to delete a template that doesn't exist should return a clear error.
  test("returns error when not found", async () => {
    const result = await deleteReviewTemplate(
      formData({ templateId: "00000000-0000-0000-0000-000000000000" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Missing templateId field must be rejected with an error.
  test("returns error when templateId is missing", async () => {
    const result = await deleteReviewTemplate(formData({}));
    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

describe("addReviewQuestion", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // A RATING question stores scaleMin/scaleMax; after adding it the questions
  // array on the template should contain exactly one item.
  test("adds a RATING question", async () => {
    const template = await testPrisma.reviewTemplate.create({
      data: { name: "Template", questions: [], sessionId: null },
    });

    await addReviewQuestion(
      formData({
        templateId: template.id,
        text: "Q1",
        type: "RATING",
        scaleMin: "1",
        scaleMax: "5",
      }),
    );

    const updated = await testPrisma.reviewTemplate.findUnique({ where: { id: template.id } });
    const questions = updated!.questions as unknown[];
    expect(questions).toHaveLength(1);
  });

  // A TEXT question doesn't need a numeric scale — it should still be accepted.
  test("adds a TEXT question", async () => {
    const template = await testPrisma.reviewTemplate.create({
      data: { name: "Template", questions: [], sessionId: null },
    });

    await addReviewQuestion(
      formData({
        templateId: template.id,
        text: "Describe your achievements",
        type: "TEXT",
      }),
    );

    const updated = await testPrisma.reviewTemplate.findUnique({ where: { id: template.id } });
    const questions = updated!.questions as unknown[];
    expect(questions).toHaveLength(1);
  });

  // A non-existent templateId must produce an error, not a silent no-op.
  test("returns error when template not found", async () => {
    const result = await addReviewQuestion(
      formData({
        templateId: "00000000-0000-0000-0000-000000000000",
        text: "Q",
        type: "RATING",
      }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Only RATING and TEXT are valid question types; anything else is rejected.
  test("returns error on invalid type", async () => {
    const template = await testPrisma.reviewTemplate.create({
      data: { name: "Template", questions: [], sessionId: null },
    });

    const result = await addReviewQuestion(
      formData({ templateId: template.id, text: "Q", type: "INVALID" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Missing templateId field must be rejected with an error.
  test("returns error when templateId is missing", async () => {
    const result = await addReviewQuestion(formData({ text: "Q", type: "TEXT" }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Missing text field must be rejected with an error.
  test("returns error when text is empty", async () => {
    const template = await testPrisma.reviewTemplate.create({
      data: { name: "Template", questions: [], sessionId: null },
    });
    const result = await addReviewQuestion(
      formData({ templateId: template.id, text: "", type: "TEXT" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

describe("removeReviewQuestion", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // After adding a question and then removing it by its generated ID,
  // the questions array should be empty again.
  test("removes a question from template", async () => {
    const template = await testPrisma.reviewTemplate.create({
      data: { name: "Template", questions: [], sessionId: null },
    });

    await addReviewQuestion(formData({ templateId: template.id, text: "To Remove", type: "TEXT" }));

    const withQuestion = await testPrisma.reviewTemplate.findUnique({
      where: { id: template.id },
    });
    const questions = withQuestion!.questions as Array<{ id: string }>;
    expect(questions).toHaveLength(1);
    const questionId = questions[0].id;

    await removeReviewQuestion(formData({ templateId: template.id, questionId }));

    const updated = await testPrisma.reviewTemplate.findUnique({ where: { id: template.id } });
    const remaining = updated!.questions as unknown[];
    expect(remaining).toHaveLength(0);
  });

  // Removes one of two questions — the remaining question gets reordered (line 202 map branch).
  test("reorders remaining questions after removing one of two", async () => {
    const template = await testPrisma.reviewTemplate.create({
      data: { name: "Two-Q Template", questions: [], sessionId: null },
    });

    await addReviewQuestion(formData({ templateId: template.id, text: "First Q", type: "TEXT" }));
    await addReviewQuestion(formData({ templateId: template.id, text: "Second Q", type: "TEXT" }));

    const withTwo = await testPrisma.reviewTemplate.findUnique({ where: { id: template.id } });
    const qs = withTwo!.questions as Array<{ id: string; text: string }>;
    expect(qs).toHaveLength(2);

    // Remove the first question — second should remain and be reordered to order:0.
    await removeReviewQuestion(formData({ templateId: template.id, questionId: qs[0].id }));

    const updated = await testPrisma.reviewTemplate.findUnique({ where: { id: template.id } });
    const remaining = updated!.questions as Array<{ id: string; text: string; order: number }>;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].text).toBe("Second Q");
    expect(remaining[0].order).toBe(0);
  });

  // Supplying a templateId that doesn't exist should return an error.
  test("returns error when template not found", async () => {
    const result = await removeReviewQuestion(
      formData({
        templateId: "00000000-0000-0000-0000-000000000000",
        questionId: "00000000-0000-0000-0000-000000000001",
      }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Missing templateId field must be rejected with an error.
  test("returns error when templateId is missing", async () => {
    const result = await removeReviewQuestion(
      formData({ questionId: "00000000-0000-0000-0000-000000000001" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Missing questionId field must be rejected with an error.
  test("returns error when questionId is missing", async () => {
    const template = await testPrisma.reviewTemplate.create({
      data: { name: "Template", questions: [], sessionId: null },
    });
    const result = await removeReviewQuestion(formData({ templateId: template.id }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // When the questions field is a non-array JSON, removeReviewQuestion treats it as empty
  // and produces an empty filtered array — covers the non-array branch (line 199 false, line 202).
  test("removes question gracefully when questions is a non-array JSON", async () => {
    const template = await testPrisma.reviewTemplate.create({
      data: {
        name: "Non-array Template",
        questions: { unexpected: "data" } as unknown as [],
        sessionId: null,
      },
    });

    const result = await removeReviewQuestion(
      formData({ templateId: template.id, questionId: "some-question-id" }),
    );
    // Should succeed (no error) — nothing to remove, questions is treated as [].
    expect(result).toBeUndefined();
    const updated = await testPrisma.reviewTemplate.findUnique({ where: { id: template.id } });
    expect(Array.isArray(updated!.questions)).toBe(true);
    expect((updated!.questions as unknown[]).length).toBe(0);
  });
});

describe("createReviewCycle", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // A newly created cycle must always start in DRAFT so it can be reviewed
  // before participants are notified.
  test("creates a cycle in DRAFT status", async () => {
    await createReviewCycle(
      formData({ name: "Q1 Cycle", startDate: "2026-01-01", endDate: "2026-03-31" }),
    );

    const cycles = await testPrisma.reviewCycle.findMany();
    expect(cycles).toHaveLength(1);
    expect(cycles[0].name).toBe("Q1 Cycle");
    expect(cycles[0].status).toBe("DRAFT");
  });

  // A cycle without a name can't be meaningfully identified; reject it.
  test("returns error on missing name", async () => {
    const result = await createReviewCycle(
      formData({ startDate: "2026-01-01", endDate: "2026-03-31" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // A name exceeding MAX_NAME_LENGTH characters must be rejected.
  test("returns error when name exceeds max length", async () => {
    const result = await createReviewCycle(
      formData({ name: "a".repeat(256), startDate: "2026-01-01", endDate: "2026-03-31" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // An invalid startDate string must be rejected.
  test("returns error when startDate is invalid", async () => {
    const result = await createReviewCycle(
      formData({ name: "Cycle", startDate: "not-a-date", endDate: "2026-03-31" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // An invalid endDate string must be rejected.
  test("returns error when endDate is invalid", async () => {
    const result = await createReviewCycle(
      formData({ name: "Cycle", startDate: "2026-01-01", endDate: "bad-date" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Providing a non-existent templateId must return a reviewTemplateNotFound error.
  test("returns error when templateId references non-existent template", async () => {
    const result = await createReviewCycle(
      formData({
        name: "Cycle",
        startDate: "2026-01-01",
        endDate: "2026-03-31",
        templateId: "00000000-0000-0000-0000-000000000000",
      }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // A cycle with a valid templateId links to the template.
  test("creates a cycle linked to a template", async () => {
    const template = await testPrisma.reviewTemplate.create({
      data: { name: "Template", questions: [], sessionId: null },
    });

    await createReviewCycle(
      formData({
        name: "Linked Cycle",
        startDate: "2026-01-01",
        endDate: "2026-03-31",
        templateId: template.id,
      }),
    );

    const cycles = await testPrisma.reviewCycle.findMany();
    expect(cycles).toHaveLength(1);
    expect(cycles[0].templateId).toBe(template.id);
  });
});

describe("deleteReviewCycle", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // Soft-delete sets deletedAt; the cycle record remains for audit history.
  test("soft-deletes a cycle", async () => {
    const cycle = await testPrisma.reviewCycle.create({
      data: {
        name: "Cycle To Delete",
        startDate: new Date(),
        endDate: new Date(),
        status: "DRAFT",
        sessionId: null,
      },
    });

    await deleteReviewCycle(formData({ cycleId: cycle.id }));

    const found = await testPrisma.reviewCycle.findUnique({ where: { id: cycle.id } });
    expect(found!.deletedAt).not.toBeNull();
  });

  // Missing cycleId field must be rejected with an error.
  test("returns error when cycleId is missing", async () => {
    const result = await deleteReviewCycle(formData({}));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Non-existent cycleId must return reviewCycleNotFound error.
  test("returns error when cycle not found", async () => {
    const result = await deleteReviewCycle(
      formData({ cycleId: "00000000-0000-0000-0000-000000000000" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

describe("openReviewCycle / closeReviewCycle", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // Transitioning from DRAFT to OPEN makes the cycle available for submissions.
  test("opens a DRAFT cycle", async () => {
    const cycle = await testPrisma.reviewCycle.create({
      data: {
        name: "Cycle",
        startDate: new Date(),
        endDate: new Date(),
        status: "DRAFT",
        sessionId: null,
      },
    });

    await openReviewCycle(formData({ cycleId: cycle.id }));

    const updated = await testPrisma.reviewCycle.findUnique({ where: { id: cycle.id } });
    expect(updated!.status).toBe("OPEN");
  });

  // Once a cycle is OPEN, trying to open it again must be rejected.
  test("returns error when cycle is not in DRAFT", async () => {
    const cycle = await testPrisma.reviewCycle.create({
      data: {
        name: "Cycle",
        startDate: new Date(),
        endDate: new Date(),
        status: "DRAFT",
        sessionId: null,
      },
    });

    await openReviewCycle(formData({ cycleId: cycle.id }));
    const result = await openReviewCycle(formData({ cycleId: cycle.id }));

    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Closing an OPEN cycle marks it as complete; no new submissions are accepted.
  test("closes an OPEN cycle", async () => {
    const cycle = await testPrisma.reviewCycle.create({
      data: {
        name: "Cycle",
        startDate: new Date(),
        endDate: new Date(),
        status: "DRAFT",
        sessionId: null,
      },
    });

    await openReviewCycle(formData({ cycleId: cycle.id }));
    await closeReviewCycle(formData({ cycleId: cycle.id }));

    const updated = await testPrisma.reviewCycle.findUnique({ where: { id: cycle.id } });
    expect(updated!.status).toBe("CLOSED");
  });

  // A DRAFT cycle is not yet OPEN, so closing it directly must be rejected.
  test("returns error when cycle is not OPEN", async () => {
    const cycle = await testPrisma.reviewCycle.create({
      data: {
        name: "Cycle",
        startDate: new Date(),
        endDate: new Date(),
        status: "DRAFT",
        sessionId: null,
      },
    });

    const result = await closeReviewCycle(formData({ cycleId: cycle.id }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // A CLOSED cycle must not be closed again — reviewCycleAlreadyClosed error.
  test("returns error when cycle is already CLOSED", async () => {
    const cycle = await testPrisma.reviewCycle.create({
      data: {
        name: "Cycle",
        startDate: new Date(),
        endDate: new Date(),
        status: "CLOSED",
        sessionId: null,
      },
    });

    const result = await closeReviewCycle(formData({ cycleId: cycle.id }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Missing cycleId in openReviewCycle must be rejected.
  test("openReviewCycle returns error when cycleId is missing", async () => {
    const result = await openReviewCycle(formData({}));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Missing cycleId in closeReviewCycle must be rejected.
  test("closeReviewCycle returns error when cycleId is missing", async () => {
    const result = await closeReviewCycle(formData({}));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Non-existent cycle in openReviewCycle must return reviewCycleNotFound.
  test("openReviewCycle returns error when cycle not found", async () => {
    const result = await openReviewCycle(
      formData({ cycleId: "00000000-0000-0000-0000-000000000000" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Non-existent cycle in closeReviewCycle must return reviewCycleNotFound.
  test("closeReviewCycle returns error when cycle not found", async () => {
    const result = await closeReviewCycle(
      formData({ cycleId: "00000000-0000-0000-0000-000000000000" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

describe("addReviewRequest", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // The happy path: two persons, an existing cycle, and a request linking them.
  // After the action the DB should contain exactly one ReviewRequest.
  test("adds a review request", async () => {
    const subject = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const reviewer = await testPrisma.person.create({
      data: { name: "Bob", email: "bob@test.com" },
    });
    const cycle = await testPrisma.reviewCycle.create({
      data: {
        name: "Cycle",
        startDate: new Date(),
        endDate: new Date(),
        status: "DRAFT",
        sessionId: null,
      },
    });

    await addReviewRequest(
      formData({
        cycleId: cycle.id,
        subjectId: subject.id,
        reviewerId: reviewer.id,
        type: "PEER",
      }),
    );

    const requests = await testPrisma.reviewRequest.findMany();
    expect(requests).toHaveLength(1);
    expect(requests[0].subjectId).toBe(subject.id);
    expect(requests[0].reviewerId).toBe(reviewer.id);
  });

  // The combination (cycleId, subjectId, reviewerId, type) is unique;
  // submitting it twice must produce an error on the second attempt.
  test("returns error on duplicate request", async () => {
    const subject = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const reviewer = await testPrisma.person.create({
      data: { name: "Bob", email: "bob@test.com" },
    });
    const cycle = await testPrisma.reviewCycle.create({
      data: {
        name: "Cycle",
        startDate: new Date(),
        endDate: new Date(),
        status: "DRAFT",
        sessionId: null,
      },
    });

    const fd = formData({
      cycleId: cycle.id,
      subjectId: subject.id,
      reviewerId: reviewer.id,
      type: "PEER",
    });
    await addReviewRequest(fd);

    const fd2 = formData({
      cycleId: cycle.id,
      subjectId: subject.id,
      reviewerId: reviewer.id,
      type: "PEER",
    });
    const result = await addReviewRequest(fd2);
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Referencing a cycle that doesn't exist must return a clear error.
  test("returns error when cycle not found", async () => {
    const subject = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const reviewer = await testPrisma.person.create({
      data: { name: "Bob", email: "bob@test.com" },
    });

    const result = await addReviewRequest(
      formData({
        cycleId: "00000000-0000-0000-0000-000000000000",
        subjectId: subject.id,
        reviewerId: reviewer.id,
        type: "PEER",
      }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Missing cycleId must be rejected with an error.
  test("returns error when cycleId is missing", async () => {
    const result = await addReviewRequest(
      formData({ subjectId: "some-id", reviewerId: "some-id", type: "PEER" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Missing subjectId must be rejected.
  test("returns error when subjectId is missing", async () => {
    const result = await addReviewRequest(
      formData({ cycleId: "some-id", reviewerId: "some-id", type: "PEER" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Missing reviewerId must be rejected.
  test("returns error when reviewerId is missing", async () => {
    const result = await addReviewRequest(
      formData({ cycleId: "some-id", subjectId: "some-id", type: "PEER" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Invalid type must be rejected.
  test("returns error when type is invalid", async () => {
    const result = await addReviewRequest(
      formData({
        cycleId: "some-id",
        subjectId: "some-id",
        reviewerId: "some-id",
        type: "INVALID",
      }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

describe("removeReviewRequest", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // Create a request and then delete it; confirm the row is gone from the DB.
  test("removes a review request", async () => {
    const subject = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const reviewer = await testPrisma.person.create({
      data: { name: "Bob", email: "bob@test.com" },
    });
    const cycle = await testPrisma.reviewCycle.create({
      data: {
        name: "Cycle",
        startDate: new Date(),
        endDate: new Date(),
        status: "DRAFT",
        sessionId: null,
      },
    });
    const request = await testPrisma.reviewRequest.create({
      data: {
        cycleId: cycle.id,
        subjectId: subject.id,
        reviewerId: reviewer.id,
        type: "PEER",
        status: "PENDING",
        sessionId: null,
      },
    });

    await removeReviewRequest(formData({ requestId: request.id, cycleId: cycle.id }));

    const requests = await testPrisma.reviewRequest.findMany();
    expect(requests).toHaveLength(0);
  });

  // Supplying an ID that doesn't correspond to any request must return an error.
  test("returns error when request not found", async () => {
    const result = await removeReviewRequest(
      formData({ requestId: "00000000-0000-0000-0000-000000000000" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Missing requestId field must be rejected with an error.
  test("returns error when requestId is missing", async () => {
    const result = await removeReviewRequest(formData({}));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // removeReviewRequest without cycleId still succeeds — cycleId is optional for revalidatePath.
  test("removes request successfully when cycleId is not provided", async () => {
    const subject = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const cycle = await testPrisma.reviewCycle.create({
      data: {
        name: "Cycle",
        startDate: new Date(),
        endDate: new Date(),
        status: "DRAFT",
        sessionId: null,
      },
    });
    const request = await testPrisma.reviewRequest.create({
      data: {
        cycleId: cycle.id,
        subjectId: subject.id,
        type: "SELF",
        status: "PENDING",
        sessionId: null,
      },
    });

    // No cycleId in formData — should still remove the request.
    const result = await removeReviewRequest(formData({ requestId: request.id }));
    expect(result).toBeUndefined();
    const remaining = await testPrisma.reviewRequest.findMany();
    expect(remaining).toHaveLength(0);
  });
});

describe("submitReview", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // Full happy-path: person has an OPEN cycle with a PENDING request.
  // After submission the request status must be SUBMITTED and a ReviewSubmission must exist.
  test("submits a review and marks request as SUBMITTED", async () => {
    const subject = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const reviewer = await testPrisma.person.create({
      data: { name: "Bob", email: "bob@test.com" },
    });
    const cycle = await testPrisma.reviewCycle.create({
      data: {
        name: "Cycle",
        startDate: new Date(),
        endDate: new Date(),
        status: "OPEN",
        sessionId: null,
      },
    });
    const request = await testPrisma.reviewRequest.create({
      data: {
        cycleId: cycle.id,
        subjectId: subject.id,
        reviewerId: reviewer.id,
        type: "PEER",
        status: "PENDING",
        sessionId: null,
      },
    });

    const answers = JSON.stringify([
      { questionId: crypto.randomUUID(), ratingValue: 4, textValue: null },
    ]);

    await submitReview(formData({ requestId: request.id, answers }));

    const updated = await testPrisma.reviewRequest.findUnique({ where: { id: request.id } });
    expect(updated!.status).toBe("SUBMITTED");

    const submissions = await testPrisma.reviewSubmission.findMany();
    expect(submissions).toHaveLength(1);
  });

  // Out-of-range ratings must be rejected before hitting the JSON column.
  test("rejects answers with an out-of-range rating", async () => {
    const cycle = await testPrisma.reviewCycle.create({
      data: { name: "C", startDate: new Date(), endDate: new Date(), status: "OPEN" },
    });
    const request = await testPrisma.reviewRequest.create({
      data: { cycleId: cycle.id, type: "SELF", status: "PENDING" },
    });
    const answers = JSON.stringify([
      { questionId: crypto.randomUUID(), ratingValue: 99, textValue: null },
    ]);

    const result = await submitReview(formData({ requestId: request.id, answers }));

    expect(result).toHaveProperty("code", "ratingOutOfRange");
    const updated = await testPrisma.reviewRequest.findUnique({ where: { id: request.id } });
    expect(updated!.status).toBe("PENDING");
  });

  // A required template question that is left unanswered must be rejected.
  test("rejects submission missing a required question", async () => {
    const qId = crypto.randomUUID();
    const template = await testPrisma.reviewTemplate.create({
      data: {
        name: "T",
        questions: [
          {
            id: qId,
            text: "Q",
            type: "TEXT",
            scaleMin: null,
            scaleMax: null,
            order: 0,
            required: true,
          },
        ],
      },
    });
    const cycle = await testPrisma.reviewCycle.create({
      data: {
        name: "C",
        templateId: template.id,
        startDate: new Date(),
        endDate: new Date(),
        status: "OPEN",
      },
    });
    const request = await testPrisma.reviewRequest.create({
      data: { cycleId: cycle.id, type: "SELF", status: "PENDING" },
    });

    const result = await submitReview(formData({ requestId: request.id, answers: "[]" }));

    expect(result).toHaveProperty("code", "answerRequired");
  });

  // A review that has already been submitted must not be submitted again.
  test("returns error when already submitted", async () => {
    const subject = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const reviewer = await testPrisma.person.create({
      data: { name: "Bob", email: "bob@test.com" },
    });
    const cycle = await testPrisma.reviewCycle.create({
      data: {
        name: "Cycle",
        startDate: new Date(),
        endDate: new Date(),
        status: "OPEN",
        sessionId: null,
      },
    });
    const request = await testPrisma.reviewRequest.create({
      data: {
        cycleId: cycle.id,
        subjectId: subject.id,
        reviewerId: reviewer.id,
        type: "PEER",
        status: "PENDING",
        sessionId: null,
      },
    });

    const answers = JSON.stringify([]);
    await submitReview(formData({ requestId: request.id, answers }));

    const result = await submitReview(formData({ requestId: request.id, answers }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Submissions are only accepted while the cycle is OPEN; a DRAFT cycle must reject them.
  test("returns error when cycle is not OPEN", async () => {
    const subject = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const reviewer = await testPrisma.person.create({
      data: { name: "Bob", email: "bob@test.com" },
    });
    const cycle = await testPrisma.reviewCycle.create({
      data: {
        name: "Cycle",
        startDate: new Date(),
        endDate: new Date(),
        status: "DRAFT",
        sessionId: null,
      },
    });
    const request = await testPrisma.reviewRequest.create({
      data: {
        cycleId: cycle.id,
        subjectId: subject.id,
        reviewerId: reviewer.id,
        type: "PEER",
        status: "PENDING",
        sessionId: null,
      },
    });

    const result = await submitReview(
      formData({ requestId: request.id, answers: JSON.stringify([]) }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Missing requestId must be rejected with an error.
  test("returns error when requestId is missing", async () => {
    const result = await submitReview(formData({ answers: JSON.stringify([]) }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Invalid JSON in answers field must be rejected with an error.
  test("returns error when answers JSON is invalid", async () => {
    const cycle = await testPrisma.reviewCycle.create({
      data: {
        name: "Cycle",
        startDate: new Date(),
        endDate: new Date(),
        status: "OPEN",
        sessionId: null,
      },
    });
    const subject = await testPrisma.person.create({ data: { name: "Subject" } });
    const request = await testPrisma.reviewRequest.create({
      data: {
        cycleId: cycle.id,
        subjectId: subject.id,
        type: "SELF",
        status: "PENDING",
        sessionId: null,
      },
    });

    const result = await submitReview(formData({ requestId: request.id, answers: "not-json{" }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Non-existent requestId must return reviewRequestNotFound error.
  test("returns error when request not found", async () => {
    const result = await submitReview(
      formData({
        requestId: "00000000-0000-0000-0000-000000000000",
        answers: JSON.stringify([]),
      }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

afterAll(() => testPrisma.$disconnect());
