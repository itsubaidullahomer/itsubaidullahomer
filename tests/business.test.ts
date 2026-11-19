import assert from "node:assert/strict";
import { test } from "node:test";
import { businessFromSlug, slugForBusiness, tradeForBusiness } from "../lib/business";

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

test("the trade is guessed from the name, with a default", () => {
  assert.equal(tradeForBusiness("Smith Septic"), "septic");
  assert.equal(tradeForBusiness("Bright Roofing Co"), "roofing");
  assert.equal(tradeForBusiness("Auto Repair Plus"), "auto");
  assert.equal(tradeForBusiness("Northside Mechanical"), "hvac");
  assert.equal(tradeForBusiness("Joe's Diner"), "septic");
  assert.equal(tradeForBusiness(null), "septic");
});

test("a name turns back into a link", () => {
  assert.equal(slugForBusiness("Smith Septic & Drain"), "smith-septic-drain");
});
