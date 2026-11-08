const MAX_PAGE_SIZE = 100;

function parsePositiveInteger(value) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isSafeInteger(parsedValue) ? parsedValue : null;
}

function parsePagination(query) {
  const page =
    query.page === undefined ? 1 : parsePositiveInteger(query.page);
  const limit =
    query.limit === undefined ? 10 : parsePositiveInteger(query.limit);

  if (
    page === null ||
    limit === null ||
    limit > MAX_PAGE_SIZE ||
    !Number.isSafeInteger((page - 1) * limit)
  ) {
    return null;
  }

  return { page, limit };
}

module.exports = { MAX_PAGE_SIZE, parsePagination };