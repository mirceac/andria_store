import { strict as assert } from "node:assert";
import { test } from "node:test";
import { hasPhysicalVariant } from "./product-variants";

test("physical variants require an enabled option and a positive price", () => {
  assert.equal(hasPhysicalVariant({ has_physical_variant: true, physical_price: "25.00" }), true);
  assert.equal(hasPhysicalVariant({ has_physical_variant: false, physical_price: "25.00" }), false);
  assert.equal(hasPhysicalVariant({ has_physical_variant: true, physical_price: "0.00" }), false);
  assert.equal(hasPhysicalVariant({ has_physical_variant: true, physical_price: null }), false);
});
