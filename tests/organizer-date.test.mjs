import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDateValue,
  parseDateValue,
  parseTimeValue,
} from "../src/features/organizador/date.ts";

test("keeps activity dates calendar-local when parsing and formatting", () => {
  const parsed = parseDateValue("2026-12-10", new Date(2000, 0, 1));
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 11);
  assert.equal(parsed.getDate(), 10);
  assert.equal(formatDateValue(parsed), "2026-12-10");
});

test("keeps event hours local and falls back on invalid values", () => {
  const fallback = new Date(2000, 0, 1, 8, 30);
  const parsed = parseTimeValue("09:45", fallback);
  assert.equal(parsed.getHours(), 9);
  assert.equal(parsed.getMinutes(), 45);
  assert.equal(parseTimeValue("28:99", fallback), fallback);
});
