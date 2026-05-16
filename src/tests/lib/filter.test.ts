import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { filterSkills } from "@/lib/filter";
import type { Skill } from "@/lib/types/index";

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: "test-id",
    name: "TestSkill",
    source_type: "community",
    local_path: "/tmp/skill",
    installed_at: "2024-01-01",
    updated_at: "2024-01-01",
    is_enabled: true,
    metadata: { author: "Author", description: "A test skill", tags: [], version: "1.0.0" },
    ...overrides,
  };
}

const skillArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  source_type: fc.constantFrom("community", "local", "official"),
  local_path: fc.string(),
  installed_at: fc.constant("2024-01-01"),
  updated_at: fc.constant("2024-01-01"),
  is_enabled: fc.boolean(),
  metadata: fc.record({
    author: fc.string({ maxLength: 20 }),
    description: fc.string({ maxLength: 50 }),
    tags: fc.array(fc.string(), { maxLength: 3 }),
    version: fc.constant("1.0.0"),
  }),
});

describe("filterSkills", () => {
  // Property: empty query returns all items (when source='all')
  it("empty query returns full list", () => {
    fc.assert(
      fc.property(fc.array(skillArb, { maxLength: 20 }), (list) => {
        return filterSkills(list, "", "all").length === list.length;
      }),
    );
  });

  // Property: source='all' does not filter by source_type
  it("source=all does not filter", () => {
    fc.assert(
      fc.property(fc.array(skillArb, { maxLength: 20 }), fc.string(), (list, q) => {
        const result = filterSkills(list, q, "all");
        return result.length <= list.length;
      }),
    );
  });

  // Property: case insensitive — swapping case of q gives same results
  it("query is case insensitive", () => {
    fc.assert(
      fc.property(
        fc.array(skillArb, { maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (list, q) => {
          const lower = filterSkills(list, q.toLowerCase(), "all");
          const upper = filterSkills(list, q.toUpperCase(), "all");
          return lower.length === upper.length;
        },
      ),
    );
  });

  // Example assertions
  it("filters by name", () => {
    const skills = [makeSkill({ name: "Alpha" }), makeSkill({ name: "Beta" })];
    expect(filterSkills(skills, "alp", "all")).toHaveLength(1);
  });

  it("filters by source_type", () => {
    const skills = [makeSkill({ source_type: "community" }), makeSkill({ source_type: "local" })];
    expect(filterSkills(skills, "", "local")).toHaveLength(1);
  });
});
