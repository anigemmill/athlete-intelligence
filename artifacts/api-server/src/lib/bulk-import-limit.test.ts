import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_BULK_ATHLETES, exceedsBulkImportLimit } from "./bulk-import-limit.js";

test("MAX_BULK_ATHLETES is 10 for the private pilot", () => {
  assert.equal(MAX_BULK_ATHLETES, 10);
});

test("0 athletes does not exceed the limit", () => {
  assert.equal(exceedsBulkImportLimit(0), false);
});

test("1 athlete does not exceed the limit", () => {
  assert.equal(exceedsBulkImportLimit(1), false);
});

test("exactly 10 athletes does not exceed the limit (at the boundary, inclusive)", () => {
  assert.equal(exceedsBulkImportLimit(10), false);
});

test("11 athletes exceeds the limit", () => {
  assert.equal(exceedsBulkImportLimit(11), true);
});

test("well over the limit (e.g. a large CSV) exceeds the limit", () => {
  assert.equal(exceedsBulkImportLimit(15), true);
  assert.equal(exceedsBulkImportLimit(500), true);
});
