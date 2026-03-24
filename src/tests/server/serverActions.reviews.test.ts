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
} from "@/serverActions";

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
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

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
});

describe("deleteReviewTemplate", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

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
});

describe("addReviewQuestion", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

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
});

describe("removeReviewQuestion", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

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
});

describe("createReviewCycle", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

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
});

describe("deleteReviewCycle", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

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
});

describe("openReviewCycle / closeReviewCycle", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

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
});

describe("addReviewRequest", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

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
});

describe("removeReviewRequest", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

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
});

describe("submitReview", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

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

    const answers = JSON.stringify([{ questionId: "q1", ratingValue: 4, textValue: null }]);

    await submitReview(formData({ requestId: request.id, answers }));

    const updated = await testPrisma.reviewRequest.findUnique({ where: { id: request.id } });
    expect(updated!.status).toBe("SUBMITTED");

    const submissions = await testPrisma.reviewSubmission.findMany();
    expect(submissions).toHaveLength(1);
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
});

afterAll(() => testPrisma.$disconnect());
