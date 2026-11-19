import assert from "node:assert/strict";
import { test } from "node:test";
import { businessFromSlug, domainForBusiness, slugForBusiness } from "../lib/business";

test("a hyphenated slug becomes a readable name", () => {
  assert.equal(businessFromSlug("smith-septic"), "Smith Septic");
  assert.equal(businessFromSlug("a1_plumbing+drain"), "A1 Plumbing Drain");
});

test("a name typed with capitals is kept as typed", () => {
  assert.equal(businessFromSlug("McKenzie%20%26%20Sons"), "McKenzie & Sons");
});

test("markup, symbols and overlong names are cut down", () => {
  assert.equal(businessFromSlug("%3Cscript%3Ealert(1)%3C%2Fscript%3E"), "Scriptalert1script");
  assert.equal(businessFromSlug("---"), null);
  assert.equal(businessFromSlug("%E0%A4%A"), "E0A4A");
  assert.ok((businessFromSlug("a".repeat(200)) ?? "").length <= 40);
});

test("a name turns back into a link", () => {
  assert.equal(slugForBusiness("Smith Septic & Drain"), "smith-septic-drain");
});

test("a name gives the drawings a web address", () => {
  assert.equal(domainForBusiness("Smith Septic & Drain"), "smithsepticdrain.com");
  assert.equal(domainForBusiness("!!!"), null);
});
