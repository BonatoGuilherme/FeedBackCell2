const assert = require("node:assert/strict");
const test = require("node:test");
const { parsePagination } = require("../utils/pagination");

test("uses default pagination when query parameters are omitted", () => {
  assert.deepEqual(parsePagination({}), { page: 1, limit: 10 });
});

test("accepts positive integer pagination within the maximum page size", () => {
  assert.deepEqual(parsePagination({ page: "3", limit: "100" }), {
    page: 3,
    limit: 100,
  });
});

test("rejects malformed, unsafe, or oversized pagination values", () => {
  const invalidQueries = [
    { page: "" },
    { page: "0" },
    { page: "-1" },
    { page: "1.5" },
    { page: "1e2" },
    { page: "2abc" },
    { page: "9007199254740992" },
    { page: ["1", "2"] },
    { limit: "" },
    { limit: "0" },
    { limit: "-1" },
    { limit: "10.5" },
    { limit: "101" },
    { page: "9007199254740991", limit: "100" },
  ];

  for (const query of invalidQueries) {
    assert.equal(parsePagination(query), null, JSON.stringify(query));
  }
});
